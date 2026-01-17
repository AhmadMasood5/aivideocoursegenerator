import { client } from "@/config/openai";
import { Generate_Video_Prompt } from "@/data/promt";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

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

CRITICAL REQUIREMENTS:
- Generate exactly ${subContent.length} slides
- Each narration MUST be 60-75 words (approximately 400-450 characters MAX)
- IMPORTANT: Fonada TTS API has a 450 character limit - exceeding this causes failures
- Include complete HTML for each slide (1280x720, dark gradient theme)
- Include reveal data for progressive animations
- Return as JSON object with keys "0", "1", "2", etc.

Example structure:
{
  "0": {
    "slideId": "${chapterSlug}-01",
    "slideIndex": 1,
    "title": "Main Topic Title",
    "subtitle": "Brief subtitle",
    "audioFileName": "${chapterSlug}-01.mp3",
    "narration": {
      "fullText": "A concise 60-75 word explanation with clear concepts and 1-2 examples. Keep it under 450 characters total."
    },
    "html": "<!DOCTYPE html>...(complete 1280x720 HTML slide)...",
    "revelData": ["r1", "r2", "r3", "r4"]
  }
}

Now generate all ${subContent.length} slides with CONCISE narration (60-75 words, max 450 characters).`
      }
    ];

    let aiResult = await generateWithRetry(messages);

    // ✅ Improved fallback with proper character limits
    if (!aiResult) {
      console.warn("⚠️ AI returned insufficient content. Using fallback slides.");

      const fallbackSlides: Record<string, any> = {};
      subContent.forEach((topic, i) => {
        const index = i + 1;
        const fallbackNarration = `This section explores ${topic}. We'll cover fundamental concepts and practical applications essential for ${courseName}. You'll learn key principles through examples and discover best practices for real projects.`;
        
        fallbackSlides[i] = {
          slideId: `${chapterSlug}-${String(index).padStart(2, "0")}`,
          slideIndex: index,
          title: topic,
          subtitle: `Part ${index} of ${subContent.length}`,
          audioFileName: `${chapterSlug}-${String(index).padStart(2, "0")}.mp3`,
          narration: { 
            fullText: truncateNarration(fallbackNarration, 450)
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
        const fallbackNarration = `This section explores ${topic}. We'll cover fundamental concepts and practical applications essential for ${courseName}. You'll learn key principles through examples and discover best practices for real projects.`;
        
        fallbackSlides[i] = {
          slideId: `${chapterSlug}-${String(index).padStart(2, "0")}`,
          slideIndex: index,
          title: topic,
          subtitle: `Part ${index} of ${subContent.length}`,
          audioFileName: `${chapterSlug}-${String(index).padStart(2, "0")}.mp3`,
          narration: { 
            fullText: truncateNarration(fallbackNarration, 450)
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

    // ✅ Process and truncate narrations
    const metadataOnly: Record<string, any> = {};
    subContent.forEach((topic, i) => {
      const slide = VideoContent[i] || {};
      const index = i + 1;

      const originalNarration = slide.narration?.fullText || `This section covers ${topic}. We'll explore key concepts and practical applications for ${courseName}.`;
      const truncatedNarration = truncateNarration(originalNarration, 450);
      
      const charCount = truncatedNarration.length;
      const wordCount = truncatedNarration.split(/\s+/).filter(Boolean).length;
      
      if (charCount > 450) {
        console.warn(`⚠️ Slide ${i}: Narration still too long (${charCount} chars). This shouldn't happen!`);
      } else if (charCount < originalNarration.length) {
        console.log(`✂️ Slide ${i}: Truncated from ${originalNarration.length} to ${charCount} chars`);
      } else {
        console.log(`✅ Slide ${i}: ${wordCount} words, ${charCount} chars (within limit)`);
      }

      metadataOnly[i] = {
        slideId: slide.slideId || `${chapterSlug}-${String(index).padStart(2, "0")}`,
        slideIndex: index,
        title: slide.title || topic,
        subtitle: slide.subtitle || `Part ${index}`,
        audioFileName: slide.audioFileName || `${chapterSlug}-${String(index).padStart(2, "0")}.mp3`,
        narration: { 
          fullText: truncatedNarration
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