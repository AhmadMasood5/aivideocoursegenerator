import axios from "axios";
import { BlobServiceClient } from '@azure/storage-blob'
import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY || ''
});

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

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      console.log(`\n--- Processing slide ${i + 1}/${slides.length} ---`);
      console.log('Slide data:', JSON.stringify(slide, null, 2));
      
      const narration = slide.narration?.fullText || slide.narration || "";

      if (!narration || narration.trim() === "") {
        console.log(`⚠️ Skipping slide ${i} - no narration`);
        audioResults.push({
          slideId: slide.slideId,
          audioFileName: slide.audioFileName,
          success: false,
          error: "No narration text"
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
        // Upload to Azure Blob Storage
        const audioUrl = await saveAudioToStorage(audioBuffer, slide.audioFileName);
        console.log(`✓ Uploaded to: ${audioUrl}`);

        console.log(`🎵 Step 3: Generating captions...`);
        // Generate captions for this audio file
        const captions = await GenerateCaptions(audioUrl);
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

      } catch (audioError: any) {
        console.error(`❌ Failed to process slide ${i}:`);
        console.error('Error details:', audioError);
        console.error('Error message:', audioError.message);
        console.error('Error response:', audioError.response?.data);
        
        audioResults.push({
          slideId: slide.slideId,
          audioFileName: slide.audioFileName,
          success: false,
          error: audioError instanceof Error ? audioError.message : "Unknown error",
          errorDetails: audioError.response?.data || null
        });
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

    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'audio-files';
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

const GenerateCaptions = async (audioUrl: string) => {
  try {
    console.log(`  📝 Calling Replicate API...`);
    const input = {
      audio: audioUrl,
      batch_size: 64
    };

    const output = await replicate.run(
      "vaibhavs10/incredibly-fast-whisper:3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c",
      { input }
    );

    console.log(`  ✓ Captions received`);
    return output;
  } catch (error) {
    console.error('  ❌ Replicate error:', error);
    throw error;
  }
}