import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Course } from "@/type/courseType";
import { Player } from "@remotion/player";
import { Dot } from "lucide-react";
import { CourseComposition } from "./ChapterVideo";

type Props = {
  course: Course | null;
  durationBySlideId: Record<string, number> | null;
};

function CourseChapters({ course, durationBySlideId }: Props) {
  const fps = 30;
  const slides = course?.chapterContentSlides ?? [];

  const getChapterDurationInFrame = (chapterId: string) => {
    if (!durationBySlideId || !course) return fps * 6; // ✅ Default 6 seconds (180 frames)
    
    const chapterSlides = course.chapterContentSlides.filter(
      (slide) => slide.chapterId === chapterId
    );

    if (chapterSlides.length === 0) return fps * 6; // ✅ Default if no slides

    const totalDuration = chapterSlides.reduce(
      (sum, slide) => sum + (durationBySlideId[slide.slideId] ?? fps * 6),
      0
    );

    // ✅ Ensure minimum of 1 frame
    return Math.max(1, totalDuration);
  };

  // ✅ Early return if no course
  if (!course?.courseLayout?.chapters) {
    return (
      <div className="max-w-6xl -mt-5 p-10 border rounded-3xl w-full bg-background/80 backdrop-blur">
        <p className="text-center text-muted-foreground">No chapters available</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl -mt-5 p-10 border rounded-3xl w-full bg-background/80 backdrop-blur">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-2xl">Course Preview</h2>
        <h2 className="text-sm text-muted-foreground">
          Chapter and Short Preview
        </h2>
      </div>

      <div className="mt-5">
        {course.courseLayout.chapters.map((chapter, index) => {
          const chapterSlides = slides.filter(
            (slide) => slide.chapterId === chapter.chapterId
          );
          const chapterDuration = getChapterDurationInFrame(chapter.chapterId);

          return (
            <Card key={chapter.chapterId ?? index} className="mb-5">
              <CardHeader>
                <div className="flex gap-3 items-center">
                  <h2 className="p-2 bg-primary/40 inline-flex h-10 w-10 text-center rounded-4xl justify-center">
                    {index + 1}
                  </h2>
                  <CardTitle className="md:text-xl text-base">
                    {chapter.chapterTitle}
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 gap-5">
                  {/* Left: Sub-content list */}
                  <div>
                    {(chapter.subContent ?? []).map((content, subIndex) => (
                      <div key={subIndex} className="flex items-center gap-2">
                        <Dot className="h-5 w-5 text-primary" />
                        <h2>{content}</h2>
                      </div>
                    ))}
                  </div>

                  {/* Right: Video player */}
                  <div>
                    {chapterSlides.length > 0 && durationBySlideId ? (
                      <Player
                        component={CourseComposition}
                        inputProps={{
                          //@ts-expect-error - Remotion types mismatch
                          slides: chapterSlides,
                          durationsBySlideId: durationBySlideId,
                        }}
                        durationInFrames={chapterDuration}
                        compositionWidth={1280}
                        compositionHeight={720}
                        fps={fps}
                        controls
                        style={{
                          height: "180px",
                          width: "80%",
                          aspectRatio: "16/9",
                        }}
                      />
                    ) : chapterSlides.length === 0 ? (
                      <div className="h-[180px] w-[80%] bg-slate-900 rounded flex items-center justify-center">
                        <p className="text-sm text-gray-400">
                          No content generated yet
                        </p>
                      </div>
                    ) : (
                      <div className="h-[180px] w-[80%] bg-slate-900 rounded flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                          <p className="text-xs text-gray-400">Loading...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default CourseChapters;