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
    return slides.reduce((sum, slide) => {
      return sum + (durationBySlideId[slide.slideId] ?? fps * 6);
    }, 0);
  }, [durationBySlideId, slides, fps]);

  if (!durationBySlideId) {
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
      <div className="p-6 sm:p-10 lg:p-20 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-br from-slate-950 via-slate-800 to-emerald-950">
        {/* Left side: course info */}
        <div>
          <h2 className="flex gap-2 p-1 px-2 border rounded-2xl inline-flex text-white border-gray-200/70 text-sm sm:text-base">
            <Sparkles className="h-4 w-4" /> Course Preview
          </h2>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mt-4 text-white">
            {course?.courseName || "Course Title"}
          </h2>
          <p className="text-sm sm:text-lg text-gray-300 mt-3">
            {course?.courseLayout?.courseDescription ||
              "Course description will appear here"}
          </p>
          <div className="mt-5 flex flex-wrap gap-3 sm:gap-5 text-white">
            <h2 className="px-3 py-2 border rounded-full flex gap-2 items-center text-xs sm:text-sm">
              <ChartNoAxesColumnIncreasing className="text-sky-400 h-4 w-4" />
              {course?.courseLayout?.level || "Beginner"}
            </h2>
            <h2 className="px-3 py-2 border rounded-full flex gap-2 items-center text-xs sm:text-sm">
              <BookOpen className="text-green-400 h-4 w-4" />
              {course?.courseLayout?.totalChapters || 0} Chapters
            </h2>
          </div>
        </div>

        {/* Right side: video preview */}
        <div className="border-2 border-white/10 rounded-lg overflow-hidden">
          {slides.length > 0 ? (
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
                //@ts-ignore
                slides: slides,
                durationsBySlideId: durationBySlideId ?? {},
              }}
            />
          ) : (
            <div className="w-full aspect-video bg-slate-900 flex items-center justify-center">
              <p className="text-white text-sm sm:text-base">
                No video content available yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CourseInfoCard;
