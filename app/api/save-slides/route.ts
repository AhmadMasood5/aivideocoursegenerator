import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import { chapterContentSlides } from "@/config/schema";
import type { chapterContentSlide, Caption } from "@/type/courseType";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, chapterId, slides } = body as {
      courseId: string;
      chapterId: string;
      slides: chapterContentSlide[];
    };

    if (!courseId || !chapterId || !Array.isArray(slides)) {
      return NextResponse.json(
        { error: "courseId, chapterId, and slides array are required" },
        { status: 400 }
      );
    }

    console.log(`💾 Saving ${slides.length} slides to database...`);

    const savedSlides: chapterContentSlide[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];

      try {
        // ✅ Ensure revealData is never null (database constraint)
        const revealData = slide.revealData && Array.isArray(slide.revealData) && slide.revealData.length > 0
          ? slide.revealData
          : ["r1", "r2", "r3"]; // Default value

        const result = await db
          .insert(chapterContentSlides)
          .values({
            courseId,
            chapterId,
            slideId: slide.slideId,
            slideIndex: slide.slideIndex,
            audioFileName: slide.audioFileName || null,
            narration: slide.narration || null,
            revealData: revealData,
            html: slide.html || null,
            audioFileUrl: slide.audioFileUrl || null,
            caption: slide.caption || null,
          })
          .returning();

        const row = result[0];

        // ✅ Cast JSON fields to match your updated types
        savedSlides.push({
          ...row,
          narration: row.narration as { fullText: string } | null,
          caption: row.caption as Caption | null, // ✅ Changed from { chunks: string[] }
          revealData: row.revealData as string[] | null,
        });

        console.log(`✓ Saved slide ${i + 1}: ${slide.slideId}`);
      } catch (slideError) {
        console.error(`❌ Failed to save slide ${i}:`, slideError);
        if (slideError instanceof Error) {
          console.error(`   Error message: ${slideError.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      savedCount: savedSlides.length,
      slides: savedSlides,
    });
  } catch (error) {
    console.error("❌ Error saving slides:", error);
    return NextResponse.json(
      {
        error: "Failed to save slides",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}