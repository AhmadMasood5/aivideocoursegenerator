import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import { chapterContentSlides } from "@/config/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, chapterId, slides } = body;

    if (!courseId || !chapterId || !Array.isArray(slides)) {
      return NextResponse.json(
        { error: "courseId, chapterId, and slides array are required" },
        { status: 400 }
      );
    }

    console.log(`💾 Saving ${slides.length} slides to database...`);

    const savedSlides = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      
      try {
        const result = await db.insert(chapterContentSlides).values({
          courseId: courseId,
          chapterId: chapterId,
          slideId: slide.slideId,
          slideIndex: slide.slideIndex,
          audioFileName: slide.audioFileName,
          narration: slide.narration,
          revealData: slide.revealData,
          html: slide.html || null,
          audioFileUrl: slide.audioUrl || null,
          caption: slide.captions || null
        }).returning();

        savedSlides.push(result[0]);
        console.log(`✓ Saved slide ${i + 1}: ${slide.slideId}`);

      } catch (slideError) {
        console.error(`❌ Failed to save slide ${i}:`, slideError);
      }
    }

    return NextResponse.json({
      success: true,
      savedCount: savedSlides.length,
      slides: savedSlides
    });

  } catch (error) {
    console.error("❌ Error saving slides:", error);
    return NextResponse.json(
      {
        error: "Failed to save slides",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}