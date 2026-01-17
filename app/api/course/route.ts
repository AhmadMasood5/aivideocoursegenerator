import { db } from "@/config/db";
import { chapterContentSlides, coursesTable } from "@/config/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import type { Caption } from "@/type/courseType";
import { currentUser } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  console.log('🔍 /api/course GET called');
  
  try {
    const courseId = request.nextUrl.searchParams.get("courseId");
    const user = await currentUser();

    // ✅ If no courseId, return all user's courses
    if (!courseId) {
      if (!user?.primaryEmailAddress?.emailAddress) {
        return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
      }

      console.log('📥 Fetching all courses for user:', user.primaryEmailAddress.emailAddress);
      
      const userCourses = await db
        .select()
        .from(coursesTable)
        .where(eq(coursesTable.userId, user.primaryEmailAddress.emailAddress))
        .orderBy(desc(coursesTable.createdAt));

      console.log(`✓ Found ${userCourses.length} courses`);
      return NextResponse.json(userCourses);
    }

    // ✅ If courseId provided, return specific course with slides
    console.log('📥 Requested courseId:', courseId);

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
    const rawSlides = await db
      .select()
      .from(chapterContentSlides)
      .where(eq(chapterContentSlides.courseId, courseId));

    console.log(`✓ Found ${rawSlides.length} slides`);

    // ✅ Cast JSON fields to proper types
    const slides = rawSlides.map(slide => ({
      ...slide,
      narration: slide.narration as { fullText: string } | null,
      caption: slide.caption as Caption | null,
      revealData: slide.revealData as string[] | null,
    }));

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