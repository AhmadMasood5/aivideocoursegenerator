import { db } from "@/config/db";
import { chapterContentSlides, coursesTable } from "@/config/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  console.log('🔍 /api/course GET called');
  
  try {
    const courseId = request.nextUrl.searchParams.get("courseId");
    console.log('Requested courseId:', courseId);

    if (!courseId) {
      console.error('❌ Missing courseId parameter');
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
    }

    console.log('📥 Fetching course from database...');
    const courses = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.courseId, courseId));

    if (courses.length === 0) {
      console.error('❌ Course not found:', courseId);
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    console.log('✓ Course found:', courses[0].courseName);

    console.log('📥 Fetching chapter content slides...');
    const slides = await db
      .select()
      .from(chapterContentSlides)
      .where(eq(chapterContentSlides.courseId, courseId));

    console.log(`✓ Found ${slides.length} slides`);

    const response = {
      ...courses[0],
      chapterContentSlides: slides
    };

    console.log('✅ Returning course data with slides');
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Error in /api/course:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    );
  }
}