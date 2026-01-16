import { client } from "@/config/openai";
import { Generate_Video_Prompt } from "@/data/promt";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Retry AI generation
async function generateWithRetry(messages: any[], maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 AI attempt ${attempt}/${maxRetries}...`);

      const response = await client.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
        messages: messages,
        response_format: { type: "json_object" },
        max_completion_tokens: 4000,
      });

      console.log("🤖 Raw AI response:", JSON.stringify(response, null, 2));

      const aiResult = response.choices[0].message?.content;

      if (!aiResult || aiResult.length < 100) {
        console.warn(`⚠️ Attempt ${attempt}: Response too short`);
        if (attempt < maxRetries) continue;
        return null; // Fallback to default slides
      }

      return aiResult;

    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) return null; // Fallback
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  console.log('🎬 Video content generation API called');

  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      console.error('❌ User not authenticated');
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }
    console.log('✓ Authenticated user:', userId);

    // Parse request body
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

    // Prepare AI messages
    const messages = [
      { role: "system", content: Generate_Video_Prompt },
      {
        role: "user",
        content: `Create ${subContent.length} educational slides for:

Course: ${courseName}
Chapter: ${chapterTitle}
Topics: ${subContent.join(', ')}

Generate a JSON object with keys "0", "1", "2", etc. Each slide MUST include:
{
  "slideId": "${chapterSlug}-01",
  "slideIndex": 1,
  "audioFileName": "${chapterSlug}-01.mp3",
  "narration": { "fullText": "A detailed 3-4 sentence explanation of the topic..." },
  "html": "<complete HTML slide with inline styles>",
  "revealData": ["r1", "r2", "r3"]
}

Make sure ALL fields are populated with real content. DO NOT return null values.`
      }
    ];

    // Call AI
    let aiResult = await generateWithRetry(messages);

    // Fallback if AI fails
    if (!aiResult) {
      console.warn("⚠️ AI returned insufficient content. Using fallback slides.");

      const fallbackSlides: Record<string, any> = {};
      subContent.forEach((topic, i) => {
        const index = i + 1;
        fallbackSlides[i] = {
          slideId: `${chapterSlug}-${String(index).padStart(2, "0")}`,
          slideIndex: index,
          audioFileName: `${chapterSlug}-${String(index).padStart(2, "0")}.mp3`,
          narration: { fullText: `This slide covers ${topic}.` },
          revealData: [],
          html: `<div style="padding:20px;font-family:Arial;background:#f5f5f5;height:720px;display:flex;align-items:center;justify-content:center">
                  <div style="max-width:800px">
                    <h2 style="font-size:32px;margin-bottom:20px">${chapterTitle}</h2>
                    <h3 style="font-size:24px;color:#666;margin-bottom:15px">Slide ${index}</h3>
                    <p style="font-size:18px;line-height:1.6">${topic}</p>
                  </div>
                </div>`
        };
      });

      return NextResponse.json(fallbackSlides);
    }

    // Clean AI content and parse JSON
    const cleanedContent = aiResult.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    let VideoContent: Record<string, any>;
    try {
      VideoContent = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.warn("⚠️ Using fallback slides due to parse error.");

      const fallbackSlides: Record<string, any> = {};
      subContent.forEach((topic, i) => {
        const index = i + 1;
        fallbackSlides[i] = {
          slideId: `${chapterSlug}-${String(index).padStart(2, "0")}`,
          slideIndex: index,
          audioFileName: `${chapterSlug}-${String(index).padStart(2, "0")}.mp3`,
          narration: { fullText: `This slide covers ${topic}.` },
          revealData: [],
          html: `<div style="padding:20px;font-family:Arial;background:#f5f5f5;height:720px;display:flex;align-items:center;justify-content:center">
                  <div style="max-width:800px">
                    <h2 style="font-size:32px;margin-bottom:20px">${chapterTitle}</h2>
                    <h3 style="font-size:24px;color:#666;margin-bottom:15px">Slide ${index}</h3>
                    <p style="font-size:18px;line-height:1.6">${topic}</p>
                  </div>
                </div>`
        };
      });

      return NextResponse.json(fallbackSlides);
    }

    // Process AI-generated slides
    const metadataOnly: Record<string, any> = {};
    subContent.forEach((topic, i) => {
      const slide = VideoContent[i] || {};
      const index = i + 1;

      metadataOnly[i] = {
        slideId: slide.slideId || `${chapterSlug}-${String(index).padStart(2, "0")}`,
        slideIndex: index,
        audioFileName: slide.audioFileName || `${chapterSlug}-${String(index).padStart(2, "0")}.mp3`,
        narration: { fullText: slide.narration?.fullText || `This slide covers ${topic}.` },
        revealData: slide.revealData || slide.revelData || [],
        html: slide.html || `<div style="padding:20px;font-family:Arial;background:#f5f5f5;height:720px;display:flex;align-items:center;justify-content:center">
                              <div style="max-width:800px">
                                <h2 style="font-size:32px;margin-bottom:20px">${chapterTitle}</h2>
                                <h3 style="font-size:24px;color:#666;margin-bottom:15px">Slide ${index}</h3>
                                <p style="font-size:18px;line-height:1.6">${topic}</p>
                              </div>
                            </div>`
      };
    });

    return NextResponse.json(metadataOnly);

  } catch (error: any) {
    console.error("❌ CRITICAL ERROR:", error);
    return NextResponse.json(
      { error: "Failed to generate video content", details: error.message },
      { status: 500 }
    );
  }
}
