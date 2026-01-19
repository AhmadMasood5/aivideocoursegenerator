import { client } from "@/config/openai";
import { Generate_Video_Prompt } from "@/data/promt";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ✅ NEW: Validate and fix incomplete narrations
function validateAndFixNarration(text: string, topic: string): string {
  // Count words
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  
  // Check if last sentence is complete
  const lastChar = text.trim().slice(-1);
  const endsWithPunctuation = ['.', '!', '?'].includes(lastChar);
  
  if (!endsWithPunctuation) {
    console.warn(`⚠️ Incomplete narration detected (no ending punctuation)! Fixing...`);
    
    // Remove incomplete last sentence
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length > 0) {
      // Keep only complete sentences
      let completeSentences = sentences.join(' ').trim();
      
      // If too short after removing incomplete sentence, add a closing
      const completeWords = completeSentences.split(/\s+/).filter(Boolean).length;
      if (completeWords < 45) {
        completeSentences += ` This concept is essential for understanding ${topic}.`;
      }
      
      return completeSentences;
    } else {
      // No complete sentences found, add ending
      return text.trim() + '.';
    }
  }
  
  // Truncate if too long (over 60 words or 450 chars)
  if (wordCount > 60 || text.length > 450) {
    console.warn(`⚠️ Narration too long (${wordCount} words, ${text.length} chars). Truncating...`);
    
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    let result = '';
    let currentWords = 0;
    
    for (const sentence of sentences) {
      const sentenceWords = sentence.trim().split(/\s+/).filter(Boolean).length;
      if (currentWords + sentenceWords <= 60 && (result + sentence).length <= 450) {
        result += sentence;
        currentWords += sentenceWords;
      } else {
        break;
      }
    }
    
    return result.trim();
  }
  
  return text;
}

// ✅ Truncate narration to respect Fonada API limits
function truncateNarration(text: string, maxChars: number = 450): string {
  if (text.length <= maxChars) return text;
  
  // Truncate at last complete sentence before limit
  const truncated = text.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclamation = truncated.lastIndexOf('!');
  
  const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);
  
  if (lastSentenceEnd > 0) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }
  
  // Fallback: truncate at last space
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '.' : truncated + '.';
}

// Retry AI generation
async function generateWithRetry(messages: any[], maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 AI attempt ${attempt}/${maxRetries}...`);

      const response = await client.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
        messages: messages,
        response_format: { type: "json_object" },
        max_completion_tokens: 16000,
      });

      console.log("🤖 Raw AI response:", JSON.stringify(response, null, 2));

      const aiResult = response.choices[0].message?.content;
      const finishReason = response.choices[0].finish_reason;

      if (finishReason === "length") {
        console.warn(`⚠️ Attempt ${attempt}: Response hit token limit!`);
        if (attempt < maxRetries) continue;
        return null;
      }

      if (!aiResult || aiResult.length < 100) {
        console.warn(`⚠️ Attempt ${attempt}: Response too short (${aiResult?.length || 0} chars)`);
        if (attempt < maxRetries) continue;
        return null;
      }

      try {
        const parsed = JSON.parse(aiResult.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim());
        const slideCount = Object.keys(parsed).length;
        console.log(`✅ AI generated ${slideCount} slides successfully`);
        return aiResult;
      } catch (parseError) {
        console.warn(`⚠️ Attempt ${attempt}: Invalid JSON structure`);
        if (attempt < maxRetries) continue;
        return null;
      }

    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) return null;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  console.log('🎬 Video content generation API called');

  try {
    const { userId } = await auth();
    if (!userId) {
      console.error('❌ User not authenticated');
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }
    console.log('✓ Authenticated user:', userId);

    const body = await request.json();
    const { courseName, chapterTitle, chapterSlug, subContent } = body;

    if (!courseName || !chapterTitle || !chapterSlug || !Array.isArray(subContent) || subContent.length === 0) {
      console.error('❌ Missing or invalid fields');
      return NextResponse.json({
        error: "Input missing required fields or subContent is empty. Expected: courseName, chapterTitle, chapterSlug, subContent"
      }, { status: 400 });
    }

    console.log('📥 Request data:', {
      courseName, chapterTitle, chapterSlug, subContentLength: subContent.length
    });

    const messages = [
      { role: "system", content: Generate_Video_Prompt },
      {
        role: "user",
        content: `Create ${subContent.length} educational video slides.

Course: ${courseName}
Chapter: ${chapterTitle}
Chapter Slug: ${chapterSlug}

Topics to cover (one slide per topic):
${subContent.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}

CRITICAL NARRATION REQUIREMENTS:
- Each narration MUST be exactly 50-60 words (NOT characters)
- Target speaking time: 20-25 seconds at normal pace (120-150 words per minute)
- COMPLETE sentences only - no cut-offs or incomplete thoughts
- Fonada TTS API limit: 450 characters MAX
- End each narration with a complete sentence - NO trailing phrases

STRUCTURE FOR EACH NARRATION:
1. Opening statement (1 sentence, 10-12 words)
2. Key explanation (2-3 sentences, 30-35 words)
3. Example (1 sentence, 10-12 words)
4. Closing thought (1 sentence, 8-10 words)

WORD COUNT VERIFICATION:
- Minimum: 50 words
- Maximum: 60 words
- Character limit: 450 max

BAD EXAMPLE (incomplete):
"For example, calculate acceleration down a 30° ramp with friction coefficient 0.2 for a 2 kg block. Break forces down step-by-step and check units."
(This is incomplete - doesn't finish the thought)

GOOD EXAMPLE (complete, 58 words):
"Newton's laws help us solve real problems with forces and motion. Use F=ma to find acceleration, break forces into components on inclines, and include friction effects. For example, a block sliding down a 30-degree ramp shows how gravity and friction combine. These principles apply to everyday situations you encounter."

Example structure:
{
  "0": {
    "slideId": "${chapterSlug}-01",
    "slideIndex": 1,
    "title": "Main Topic Title",
    "subtitle": "Brief subtitle",
    "audioFileName": "${chapterSlug}-01.mp3",
    "narration": {
      "fullText": "Complete 50-60 word narration with full sentences. Opening statement here. Key explanation with clear concepts. Example that illustrates the point. Closing thought that wraps it up."
    },
    "html": "<!DOCTYPE html>...(complete 1280x720 HTML slide)...",
    "revelData": ["r1", "r2", "r3", "r4"]
  }
}

FINAL CHECK before generating:
- Count words in each narration (must be 50-60)
- Verify last sentence is complete
- Ensure no trailing incomplete phrases
- Confirm character count under 450

Now generate all ${subContent.length} slides with COMPLETE narration (50-60 words each).`
      }
    ];

    let aiResult = await generateWithRetry(messages);

    // ✅ Improved fallback with proper character limits
    if (!aiResult) {
      console.warn("⚠️ AI returned insufficient content. Using fallback slides.");

      const fallbackSlides: Record<string, any> = {};
      subContent.forEach((topic, i) => {
        const index = i + 1;
        const fallbackNarration = `This section explores ${topic}. We'll cover fundamental concepts and practical applications essential for understanding. You'll learn key principles through clear examples. These skills apply to real situations you encounter.`;
        
        fallbackSlides[i] = {
          slideId: `${chapterSlug}-${String(index).padStart(2, "0")}`,
          slideIndex: index,
          title: topic,
          subtitle: `Part ${index} of ${subContent.length}`,
          audioFileName: `${chapterSlug}-${String(index).padStart(2, "0")}.mp3`,
          narration: { 
            fullText: validateAndFixNarration(fallbackNarration, topic)
          },
          revelData: ["r1", "r2", "r3"],
          html: `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .reveal { opacity:0; transform:translateY(12px); transition: all 0.5s ease; }
    .reveal.is-on { opacity:1; transform:translateY(0); }
  </style>
</head>
<body class="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 h-screen w-screen flex items-center justify-center">
  <div class="max-w-5xl mx-auto p-12">
    <div class="text-sm text-purple-300 mb-2">${courseName} • ${chapterTitle}</div>
    <h1 class="text-5xl font-bold text-white mb-4">${topic}</h1>
    <h2 class="text-2xl text-purple-200 mb-8">Part ${index} of ${subContent.length}</h2>
    
    <div class="space-y-4">
      <div class="reveal bg-white/10 p-6 rounded-lg" data-reveal="r1">
        <h3 class="text-xl font-semibold text-white mb-2">📚 Overview</h3>
        <p class="text-purple-100">Understanding the fundamentals of ${topic}</p>
      </div>
      
      <div class="reveal bg-white/10 p-6 rounded-lg" data-reveal="r2">
        <h3 class="text-xl font-semibold text-white mb-2">💡 Key Concepts</h3>
        <p class="text-purple-100">Essential principles you need to know</p>
      </div>
      
      <div class="reveal bg-white/10 p-6 rounded-lg" data-reveal="r3">
        <h3 class="text-xl font-semibold text-white mb-2">🚀 Practical Application</h3>
        <p class="text-purple-100">How to apply this in real projects</p>
      </div>
    </div>
  </div>
</body>
</html>`
        };
      });

      return NextResponse.json(fallbackSlides);
    }

    const cleanedContent = aiResult.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    let VideoContent: Record<string, any>;
    
    try {
      VideoContent = JSON.parse(cleanedContent);
      console.log(`✅ Successfully parsed ${Object.keys(VideoContent).length} slides`);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('Raw content:', cleanedContent.substring(0, 500));
      console.warn("⚠️ Using fallback slides due to parse error.");

      const fallbackSlides: Record<string, any> = {};
      subContent.forEach((topic, i) => {
        const index = i + 1;
        const fallbackNarration = `This section explores ${topic}. We'll cover fundamental concepts and practical applications essential for understanding. You'll learn key principles through clear examples. These skills apply to real situations you encounter.`;
        
        fallbackSlides[i] = {
          slideId: `${chapterSlug}-${String(index).padStart(2, "0")}`,
          slideIndex: index,
          title: topic,
          subtitle: `Part ${index} of ${subContent.length}`,
          audioFileName: `${chapterSlug}-${String(index).padStart(2, "0")}.mp3`,
          narration: { 
            fullText: validateAndFixNarration(fallbackNarration, topic)
          },
          revelData: ["r1", "r2", "r3"],
          html: `<div style="padding:40px;font-family:Arial;background:linear-gradient(135deg, #1e293b 0%, #7e22ce 50%, #1e293b 100%);height:720px;display:flex;align-items:center;justify-content:center;color:white">
                  <div style="max-width:900px;text-align:center">
                    <div style="font-size:14px;color:#c4b5fd;margin-bottom:10px">${courseName} • ${chapterTitle}</div>
                    <h2 style="font-size:48px;margin-bottom:20px;font-weight:bold">${topic}</h2>
                    <h3 style="font-size:24px;color:#e9d5ff;margin-bottom:30px">Part ${index} of ${subContent.length}</h3>
                    <div style="background:rgba(255,255,255,0.1);padding:30px;border-radius:10px">
                      <p style="font-size:20px;line-height:1.8;color:#f3e8ff">Essential concepts and practical applications</p>
                    </div>
                  </div>
                </div>`
        };
      });

      return NextResponse.json(fallbackSlides);
    }

    // ✅ Process, validate, and truncate narrations
    const metadataOnly: Record<string, any> = {};
    subContent.forEach((topic, i) => {
      const slide = VideoContent[i] || {};
      const index = i + 1;

      let originalNarration = slide.narration?.fullText || `This section covers ${topic}. We'll explore key concepts and practical applications. You'll learn important principles. These apply to real situations.`;
      
      // ✅ First validate and fix incomplete sentences
      const validatedNarration = validateAndFixNarration(originalNarration, topic);
      
      // ✅ Then truncate if needed
      const finalNarration = truncateNarration(validatedNarration, 450);
      
      const charCount = finalNarration.length;
      const wordCount = finalNarration.split(/\s+/).filter(Boolean).length;
      const endsComplete = /[.!?]$/.test(finalNarration.trim());
      
      if (!endsComplete) {
        console.error(`❌ Slide ${i}: Narration STILL incomplete after validation!`);
      }
      
      if (charCount > 450) {
        console.warn(`⚠️ Slide ${i}: Narration still too long (${charCount} chars).`);
      } else if (validatedNarration !== originalNarration) {
        console.log(`🔧 Slide ${i}: Fixed incomplete narration`);
      } else if (finalNarration !== validatedNarration) {
        console.log(`✂️ Slide ${i}: Truncated from ${validatedNarration.length} to ${charCount} chars`);
      }
      
      console.log(`✅ Slide ${i}: ${wordCount} words, ${charCount} chars, complete: ${endsComplete}`);

      metadataOnly[i] = {
        slideId: slide.slideId || `${chapterSlug}-${String(index).padStart(2, "0")}`,
        slideIndex: index,
        title: slide.title || topic,
        subtitle: slide.subtitle || `Part ${index}`,
        audioFileName: slide.audioFileName || `${chapterSlug}-${String(index).padStart(2, "0")}.mp3`,
        narration: { 
          fullText: finalNarration
        },
        revelData: slide.revelData || slide.revealData || ["r1", "r2", "r3"],
        html: slide.html || `<div style="padding:40px;font-family:Arial;background:#1e293b;height:720px;display:flex;align-items:center;justify-content:center;color:white">
                              <div style="max-width:900px">
                                <h2 style="font-size:40px;margin-bottom:20px">${chapterTitle}</h2>
                                <h3 style="font-size:28px;color:#94a3b8;margin-bottom:20px">${topic}</h3>
                                <p style="font-size:20px;line-height:1.6;color:#cbd5e1">Slide ${index} of ${subContent.length}</p>
                              </div>
                            </div>`
      };
    });

    console.log(`✅ Returning ${Object.keys(metadataOnly).length} processed slides`);
    return NextResponse.json(metadataOnly);

  } catch (error: any) {
    console.error("❌ CRITICAL ERROR:", error);
    return NextResponse.json(
      { error: "Failed to generate video content", details: error.message },
      { status: 500 }
    );
  }
}
