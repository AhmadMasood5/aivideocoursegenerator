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
    const totalDuration = slides.reduce(
      (sum, slide) => sum + (durationBySlideId[slide.slideId] ?? fps * 6),
      0
    );
    return Math.max(1, totalDuration);
  }, [durationBySlideId, slides, fps]);

  if (!course) {
    return (
      <div className="p-10 sm:p-20 rounded-xl bg-gradient-to-br from-slate-950 via-slate-800 to-emerald-950 flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-sm sm:text-base">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!durationBySlideId && slides.length > 0) {
    return (
      <div className="p-10 sm:p-20 rounded-xl bg-gradient-to-br from-slate-950 via-slate-800 to-emerald-950 flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-sm sm:text-base">Loading course preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-8 sm:p-20 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-8 bg-gradient-to-br from-slate-950 via-slate-800 to-emerald-950">
        {/* Course Info */}
        <div>
          <h2 className="flex gap-2 p-1 px-2 border rounded-2xl inline-flex text-white border-gray-200/70 text-xs sm:text-sm">
            <Sparkles className="h-4 w-4" /> Course Preview
          </h2>
          <h2 className="text-2xl sm:text-4xl font-bold mt-4 text-white">
            {course.courseName}
          </h2>
          <p className="text-base sm:text-lg text-gray-300 mt-3">
            {course.courseLayout?.courseDescription || "No description available"}
          </p>
          <div className="mt-5 flex flex-wrap gap-3 sm:gap-5 text-white">
            <h2 className="px-3 py-2 border rounded-full flex gap-2 items-center text-sm sm:text-base">
              <ChartNoAxesColumnIncreasing className="text-sky-400 h-4 w-4" />
              {course.courseLayout?.level || "Beginner"}
            </h2>
            <h2 className="px-3 py-2 border rounded-full flex gap-2 items-center text-sm sm:text-base">
              <BookOpen className="text-green-400 h-4 w-4" />
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
                <p className="text-white mb-2 text-sm sm:text-base">
                  No video content available yet
                </p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Content will appear here once generated
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-video bg-slate-900 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-white text-xs sm:text-sm">Preparing video...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CourseInfoCard;
