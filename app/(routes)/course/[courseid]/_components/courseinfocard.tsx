import { Course } from "@/type/courseType";
import { BookOpen, ChartNoAxesColumnIncreasing, Sparkles } from "lucide-react";
import React, { useMemo } from "react";
import { Player } from "@remotion/player";
import { CourseComposition } from "./ChapterVideo";

type Props = {
  course: Course | null;
  durationBySlideId: Record<string, number> | null;
};

function CourseInfoCard({ course, durationBySlideId }: Props) {
  const fps = 30;
  const slides = course?.chapterContentSlides ?? [];

  const durationInFrames = useMemo(() => {
    if (!durationBySlideId || slides.length === 0) {
      return fps * 30; // Default 30 seconds
    }
    
    const totalDuration = slides.reduce((sum, slide) => {
      return sum + (durationBySlideId[slide.slideId] ?? fps * 6);
    }, 0);

    // ✅ Ensure minimum of 1 frame
    return Math.max(1, totalDuration);
  }, [durationBySlideId, slides, fps]);

  // ✅ Loading state - while durations are calculating
  if (!course) {
    return (
      <div className="p-20 rounded-xl bg-gradient-to-br from-slate-950 via-slate-800 to-emerald-950 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading course...</p>
        </div>
      </div>
    );
  }

  // ✅ Still calculating durations
  if (!durationBySlideId && slides.length > 0) {
    return (
      <div className="p-20 rounded-xl bg-gradient-to-br from-slate-950 via-slate-800 to-emerald-950 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading course preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-20 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-5 bg-gradient-to-br from-slate-950 via-slate-800 to-emerald-950">
        {/* Course Info */}
        <div>
          <h2 className="flex gap-2 p-1 px-2 border rounded-2xl inline-flex text-white border-gray-200/70">
            <Sparkles /> Course Preview
          </h2>
          <h2 className="text-4xl font-bold mt-4 text-white">
            {course.courseName}
          </h2>
          <p className="text-lg text-gray-300 mt-3">
            {course.courseLayout?.courseDescription || "No description available"}
          </p>
          <div className="mt-5 flex gap-5 text-white">
            <h2 className="px-3 p-2 border rounded-full flex gap-2 items-center inline-flex">
              <ChartNoAxesColumnIncreasing className="text-sky-400" />
              {course.courseLayout?.level || "Beginner"}
            </h2>
            <h2 className="px-3 p-2 border rounded-full flex gap-2 items-center inline-flex">
              <BookOpen className="text-green-400" />
              {course.courseLayout?.chapters?.length || 0} Chapters
            </h2>
          </div>
        </div>
        
        {/* Video Player */}
        <div className="border-2 border-white/10 rounded-lg overflow-hidden">
          {slides.length > 0 && durationBySlideId ? (
            <Player
              component={CourseComposition}
              durationInFrames={durationInFrames}
              compositionWidth={1280}
              compositionHeight={720}
              fps={fps}
              controls
              style={{
                width: "100%",
                aspectRatio: "16/9",
              }}
              inputProps={{
                //@ts-expect-error - Remotion types mismatch
                slides: slides,
                durationsBySlideId: durationBySlideId,
              }}
            />
          ) : slides.length === 0 ? (
            <div className="w-full aspect-video bg-slate-900 flex items-center justify-center">
              <div className="text-center">
                <p className="text-white mb-2">No video content available yet</p>
                <p className="text-gray-400 text-sm">Content will appear here once generated</p>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-video bg-slate-900 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-white text-sm">Preparing video...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CourseInfoCard;