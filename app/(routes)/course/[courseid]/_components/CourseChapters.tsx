import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Course } from "@/type/courseType";
import { SubContent } from "@radix-ui/react-context-menu";
import { Player } from "@remotion/player";
import { Dot } from "lucide-react";
import React from "react";
import { CourseComposition } from "./ChapterVideo";
type Props = {
  course: Course | null;
  durationBySlideId: Record<string, number> | null;
};
function CourseChapters({ course, durationBySlideId }: Props) {
  const slides = course?.chapterContentSlides??[];
  const getChapterDurationInFrame = (chapterId: string) => {
    if (!durationBySlideId || !course) return 30;
    return course?.chapterContentSlides
      .filter((slide) => slide.chapterId === chapterId)
      .reduce(
        (sum, slide) => sum + (durationBySlideId[slide.slideId] ?? 30),
        0,
      );
  };
  return (
    <div className="max-w-6xl -mt-5 p-10 border rounded-3xl w-full bg-background/80 backdrop-blur">
      <div className="flex justify-between items-center ">
        <h2 className="font-bold text-2xl">Course Preview</h2>
        <h2 className="text-sm text-muted-foreground">
          Chapter and Short Preview
        </h2>
      </div>

      <div className="mt-5">
        {course?.courseLayout.chapters.map((chapter, index) => (
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
                <div>
                  {(chapter.subContent ?? []).map((content, subIndex) => (
                    <div key={subIndex} className="flex items-center gap-2">
                      <Dot className=" h-5 w-5 text-primary" />
                      <h2>{content}</h2>
                    </div>
                  ))}
                </div>
                <div>
                  <Player
                    component={CourseComposition}
                    inputProps={{
                //@ts-ignore
                slides: slides.filter((slide)=> slide.chapterId === chapter.chapterId),
                durationsBySlideId: durationBySlideId??{},
              }}
                    durationInFrames={getChapterDurationInFrame(chapter.chapterId)}
                    compositionWidth={1280}
                    compositionHeight={720}
                    fps={30}
                    controls
                    style={{
                      height: "180px",
                      width: "80%",
                      aspectRatio: "16/9",
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
