// api/generate-audio/route.ts

import axios from "axios";
import { BlobServiceClient } from '@azure/storage-blob'
import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

let replicateClient: Replicate | undefined;

function getReplicateClient() {
  if (!replicateClient) {
    replicateClient = new Replicate({
      auth: process.env.REPLICATE_API_KEY || ''
    });
  }

  return replicateClient;
}

// ✅ IMPROVED RATE LIMITING
const RATE_LIMIT_DELAY = 15000; // 15 seconds between requests (increased from 12s)
const MAX_RETRIES = 5; // Increased from 3
const RETRY_DELAY_BASE = 10000; // 10 seconds base delay (increased from 5s)
const REPLICATE_DELAY = 3000; // ✅ NEW: Extra delay before Replicate calls

export async function POST(request: NextRequest) {
  console.log('🎬 Audio generation API called');
  
  try {
    const body = await request.json();
    console.log('📥 Request body received');
    
    const { slides } = body;

    if (!slides || !Array.isArray(slides)) {
      console.error('❌ Invalid slides data:', { slides });
      return NextResponse.json(
        { error: "Slides array is required" },
        { status: 400 }
      );
    }

    console.log(`📥 Received ${slides.length} slides for audio generation`);
    
    // Validate environment variables
    if (!process.env.FONADALAB_API_KEY) {
      console.error('❌ FONADALAB_API_KEY is not set');
      return NextResponse.json(
        { error: "FONADALAB_API_KEY not configured" },
        { status: 500 }
      );
    }

    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      console.error('❌ AZURE_STORAGE_CONNECTION_STRING is not set');
      return NextResponse.json(
        { error: "Azure Storage not configured" },
        { status: 500 }
      );
    }

    if (!process.env.REPLICATE_API_KEY) {
      console.error('❌ REPLICATE_API_KEY is not set');
      return NextResponse.json(
        { error: "Replicate API not configured" },
        { status: 500 }
      );
    }

    const audioResults = [];

    // Process slides sequentially with rate limiting
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      console.log(`\n--- Processing slide ${i + 1}/${slides.length} ---`);
      console.log('Slide data:', JSON.stringify(slide, null, 2));
      
      const narration = slide.narration?.fullText || slide.narration || "";

      if (!narration || narration.trim() === "") {
        console.log(`⚠️ Skipping slide ${i + 1} - no narration`);
        audioResults.push({
          slideId: slide.slideId,
          audioFileName: slide.audioFileName,
          success: false,
          error: "No narration text",
          audioUrl: null,
          captions: null
        });
        continue;
      }

      try {
        console.log(`🎵 Step 1: Generating audio...`);
        console.log(`Narration length: ${narration.length} characters`);

        // Generate audio with Fonada
        const fonadaResult = await axios.post(
          'https://api.fonada.ai/tts/generate-audio-large',
          {
            input: narration,
            voice: 'Vaanee',
            Language: 'English',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.FONADALAB_API_KEY}`
            },
            responseType: 'arraybuffer',
            timeout: 120000
          }
        );

        const audioBuffer = Buffer.from(fonadaResult.data);
        console.log(`✓ Audio generated: ${audioBuffer.length} bytes`);

        console.log(`🎵 Step 2: Uploading to Azure...`);
        const audioUrl = await saveAudioToStorage(audioBuffer, slide.audioFileName);
        console.log(`✓ Uploaded to: ${audioUrl}`);

        // ✅ NEW: Add delay before Replicate call to avoid bursts
        console.log(`⏳ Waiting ${REPLICATE_DELAY / 1000}s before caption generation...`);
        await sleep(REPLICATE_DELAY);

        console.log(`🎵 Step 3: Generating captions with retry logic...`);
        // Generate captions with retry logic
        const captions = await GenerateCaptionsWithRetry(audioUrl);
        console.log(`✓ Captions generated`);

        const result = {
          slideId: slide.slideId,
          audioFileName: slide.audioFileName,
          success: true,
          audioSize: audioBuffer.length,
          audioUrl: audioUrl,
          captions: captions
        };

        audioResults.push(result);
        console.log(`✅ Slide ${i + 1} completed successfully`);

        // Add delay before next slide (except for last slide)
        if (i < slides.length - 1) {
          console.log(`⏳ Waiting ${RATE_LIMIT_DELAY / 1000}s before next slide...`);
          await sleep(RATE_LIMIT_DELAY);
        }

      } catch (audioError: any) {
        console.error(`❌ Failed to process slide ${i + 1}:`);
        console.error('Error details:', audioError);
        console.error('Error message:', audioError.message);
        console.error('Error response:', audioError.response?.data);
        
        audioResults.push({
          slideId: slide.slideId,
          audioFileName: slide.audioFileName,
          success: false,
          error: audioError instanceof Error ? audioError.message : "Unknown error",
          errorDetails: audioError.response?.data || null,
          audioUrl: null,
          captions: null
        });

        // Still add delay even on error to respect rate limits
        if (i < slides.length - 1) {
          console.log(`⏳ Waiting ${RATE_LIMIT_DELAY / 1000}s before next slide...`);
          await sleep(RATE_LIMIT_DELAY);
        }
      }
    }

    const summary = {
      success: true,
      results: audioResults,
      totalSlides: slides.length,
      successCount: audioResults.filter(r => r.success).length,
      failedCount: audioResults.filter(r => !r.success).length
    };

    console.log('\n========== FINAL SUMMARY ==========');
    console.log(JSON.stringify(summary, null, 2));
    console.log('===================================\n');

    return NextResponse.json(summary);

  } catch (error: any) {
    console.error("❌ CRITICAL ERROR in audio generation:");
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      {
        error: "Failed to generate audio",
        details: error instanceof Error ? error.message : "Unknown error",
        errorType: error.constructor?.name || 'Unknown'
      },
      { status: 500 }
    );
  }
}

const saveAudioToStorage = async (audioBuffer: Buffer, filename: string): Promise<string> => {
  try {
    console.log(`  📦 Connecting to Azure Storage...`);
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
    }

    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'audio';
    console.log(`  📦 Container: ${containerName}`);

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    await containerClient.createIfNotExists({
      access: 'blob'
    });

    const blobName = filename.endsWith('.mp3') ? filename : `${filename}.mp3`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    console.log(`  📦 Uploading ${blobName}...`);
    await blockBlobClient.uploadData(audioBuffer, {
      blobHTTPHeaders: {
        blobContentType: 'audio/mpeg',
        blobCacheControl: 'public, max-age=31536000, immutable',
      }
    });

    console.log(`  ✓ Blob uploaded: ${blobName}`);
    return blockBlobClient.url;

  } catch (error) {
    console.error('  ❌ Azure Storage error:', error);
    throw error;
  }
}

// ✅ IMPROVED: Better retry logic with longer delays
const GenerateCaptionsWithRetry = async (audioUrl: string, attempt = 1): Promise<any> => {
  try {
    console.log(`  📝 Calling Replicate API (attempt ${attempt}/${MAX_RETRIES})...`);
    const input = {
      audio: audioUrl,
      batch_size: 64
    };

    const output = await getReplicateClient().run(
      "vaibhavs10/incredibly-fast-whisper:3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c",
      { input }
    );

    console.log(`  ✓ Captions received on attempt ${attempt}`);
    return output;

  } catch (error: any) {
    console.error(`  ❌ Replicate error on attempt ${attempt}:`, error.message);

    // Check if it's a rate limit error (429)
    const isRateLimit = 
      error.response?.status === 429 || 
      error.message?.includes('429') || 
      error.message?.includes('throttled') ||
      error.message?.includes('rate limit') ||
      error.message?.toLowerCase().includes('too many requests');

    if (isRateLimit) {
      if (attempt < MAX_RETRIES) {
        // ✅ IMPROVED: Use longer delays for rate limits
        const retryAfter = parseInt(error.response?.headers?.get?.('retry-after') || '30');
        const delayTime = Math.max(retryAfter * 1000, RETRY_DELAY_BASE * Math.pow(2, attempt - 1));
        
        console.log(`  ⏳ Rate limited. Waiting ${delayTime / 1000}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
        await sleep(delayTime);
        return GenerateCaptionsWithRetry(audioUrl, attempt + 1);
      } else {
        console.error(`  ❌ Max retries (${MAX_RETRIES}) reached for caption generation`);
        throw new Error(`Rate limit exceeded after ${MAX_RETRIES} attempts. Please wait and try again later.`);
      }
    }

    // For non-rate-limit errors, retry with exponential backoff
    if (attempt < MAX_RETRIES) {
      const delayTime = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
      console.log(`  ⏳ Retrying after ${delayTime / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
      await sleep(delayTime);
      return GenerateCaptionsWithRetry(audioUrl, attempt + 1);
    }

    // If all retries failed, throw the error
    throw error;
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));