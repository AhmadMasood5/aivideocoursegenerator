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
  const slides = course?.chapterContentSlides ?? [];

  const getChapterDurationInFrame = (chapterId: string) => {
    if (!durationBySlideId || !course) return 30;
    return course?.chapterContentSlides
      .filter((slide) => slide.chapterId === chapterId)
      .reduce((sum, slide) => sum + (durationBySlideId[slide.slideId] ?? 30), 0);
  };

  return (
    <div className="max-w-6xl -mt-5 p-6 sm:p-10 border rounded-3xl w-full bg-background/80 backdrop-blur">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="font-bold text-xl sm:text-2xl">Course Preview</h2>
        <h2 className="text-xs sm:text-sm text-muted-foreground">
          Chapter and Short Preview
        </h2>
      </div>

      {/* Chapters */}
      <div className="mt-5 space-y-5">
        {course?.courseLayout.chapters.map((chapter, index) => (
          <Card key={chapter.chapterId ?? index}>
            <CardHeader>
              <div className="flex gap-3 items-center">
                <h2 className="p-2 bg-primary/40 inline-flex h-8 w-8 sm:h-10 sm:w-10 text-center rounded-full justify-center text-sm sm:text-base">
                  {index + 1}
                </h2>
                <CardTitle className="text-base sm:text-lg md:text-xl">
                  {chapter.chapterTitle}
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Subcontent list */}
                <div className="space-y-2">
                  {(chapter.subContent ?? []).map((content, subIndex) => (
                    <div key={subIndex} className="flex items-center gap-2 text-sm sm:text-base">
                      <Dot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      <h2>{content}</h2>
                    </div>
                  ))}
                </div>

                {/* Video preview */}
                <div className="flex justify-center md:justify-start">
                  <Player
                    component={CourseComposition}
                    inputProps={{
                      //@ts-expect-error - Remotion types mismatch
                      slides: slides.filter(
                        (slide) => slide.chapterId === chapter.chapterId
                      ),
                      durationsBySlideId: durationBySlideId ?? {},
                    }}
                    durationInFrames={getChapterDurationInFrame(chapter.chapterId)}
                    compositionWidth={1280}
                    compositionHeight={720}
                    fps={30}
                    controls
                    style={{
                      width: "100%",
                      maxWidth: "400px",
                      aspectRatio: "16/9",
                      borderRadius: "0.5rem",
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default CourseChapters;
