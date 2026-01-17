"use client";
import React, { useEffect, useState } from "react";
import CourseInfoCard from "./_components/courseinfocard";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { Course } from "@/type/courseType";
import CourseChapters from "./_components/CourseChapters";
import { toast } from "sonner";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";

function CoursePreview() {
  // ✅ ALL HOOKS AT THE TOP
  const { courseid } = useParams();
  const { user, isLoaded } = useUser();
  const { has } = useAuth();
  const router = useRouter();
  const [courseDetails, setCourseDetails] = useState<Course | null>(null);
 const [durationBySlideId, setDurationBySlideId] = useState<Record<string, number> | null>(null);
  const [isLoadingDurations, setIsLoadingDurations] = useState(true);

  // ✅ CONSTANTS AFTER HOOKS
  const fps = 30;
  const slides = courseDetails?.chapterContentSlides ?? [];
  
  // ✅ Check if user has a paid plan
  const hasPaidPlan = has?.({ plan: 'monthly' }) || false;

  // ✅ FIRST useEffect - Fetch course details
  useEffect(() => {
    const getCourseDetails = async () => {
      const loadingToast = toast.loading("Fetching Course Details...");
      try {
        const result = await axios.get(`/api/course?courseId=${courseid}`);
        setCourseDetails(result.data);
        toast.success("Course Details Fetched Successfully!", {
          id: loadingToast,
        });

        if (result.data?.chapterContentSlides?.length === 0) {
          toast.dismiss(loadingToast);

          if (!isLoaded) {
            console.log("⏳ Waiting for Clerk to load...");
            toast.loading("Loading user information...");
            return;
          }

          generateVideoContent(result?.data);
        }
      } catch (error) {
        toast.error("Failed to fetch course details", { id: loadingToast });
        console.error("Error fetching course details:", error);
      }
    };

    if (courseid && isLoaded) {
      getCourseDetails();
    }
  }, [courseid, isLoaded]);

  // ✅ SECOND useEffect - Calculate audio durations
  useEffect(() => {
    let cancel = false;
    
    const run = async () => {
      if (!slides || slides.length === 0) {
        setIsLoadingDurations(false);
        return;
      }

      try {
        const entries = slides.map((slide) => {
          // ✅ PRIORITY 1: Use caption duration if available
          if (slide.caption?.chunks && slide.caption.chunks.length > 0) {
            const lastChunk = slide.caption.chunks[slide.caption.chunks.length - 1];
            if (typeof lastChunk === 'object' && 'timestamp' in lastChunk) {
              const timestamp = (lastChunk as any).timestamp;
              if (Array.isArray(timestamp) && timestamp[1]) {
                const captionDuration = timestamp[1];
                const frame = Math.max(1, Math.ceil(captionDuration * fps));
                console.log(`✓ Slide ${slide.slideId}: Using caption duration ${captionDuration}s (${frame} frames)`);
                return [slide.slideId, frame] as const;
              }
            }
          }

          // ✅ PRIORITY 2: Estimate from narration text length
          if (slide.narration?.fullText) {
            const text = slide.narration.fullText;
            const wordCount = text.split(/\s+/).filter(Boolean).length;
            const estimatedSeconds = Math.ceil(wordCount / 2.5);
            const frame = Math.max(fps * 3, Math.ceil(estimatedSeconds * fps));
            console.log(`✓ Slide ${slide.slideId}: Estimated ${estimatedSeconds}s from ${wordCount} words (${frame} frames)`);
            return [slide.slideId, frame] as const;
          }

          // ✅ FALLBACK: Default 6 seconds
          console.log(`⚠️ Slide ${slide.slideId}: Using default 6s`);
          return [slide.slideId, fps * 6] as const;
        });

        if (!cancel) {
          setDurationBySlideId(Object.fromEntries(entries));
          setIsLoadingDurations(false);
        }
      } catch (error) {
        console.error('❌ Error calculating durations:', error);
        if (!cancel) {
          const defaultDurations = Object.fromEntries(
            slides.map(slide => [slide.slideId, fps * 6])
          );
          setDurationBySlideId(defaultDurations);
          setIsLoadingDurations(false);
        }
      }
    };

    run();

    return () => {
      cancel = true;
    };
  }, [slides, fps]);

  // ✅ FUNCTION - Generate video content
  const generateVideoContent = async (course: Course) => {
    const generatingToast = toast.loading("Generating Video Content...");

    try {
      const allSlidesMetadata = [];

      for (let i = 0; i < course?.courseLayout?.chapters?.length; i++) {
        const chapter = course.courseLayout.chapters[i];

        const hasExistingSlides = course.chapterContentSlides?.some(
          (slide) => slide.chapterId === chapter.chapterId,
        );

        if (hasExistingSlides) {
          console.log(
            `✓ Skipping chapter ${i + 1}: ${chapter.chapterTitle} - content already exists`,
          );
          continue;
        }

        toast.loading(
          `Generating content for chapter ${i + 1} of ${course?.courseLayout?.chapters?.length}`,
          { id: generatingToast },
        );

        try {
          console.log(`\n--- Chapter ${i + 1}: ${chapter.chapterTitle} ---`);

          const result = await axios.post(
            "/api/generate-video-content",
            {
              courseName: course.courseName,
              chapterTitle: chapter.chapterTitle,
              chapterSlug: chapter.chapterId,
              subContent: chapter.subContent,
            },
            {
              timeout: 300000,
            },
          );

          console.log("✓ Video content generated:", result.data);

          const slidesMetadata = result.data;

          if (!slidesMetadata || typeof slidesMetadata !== "object") {
            throw new Error("Invalid response from video content API");
          }

          const slidesArray = [];
          for (const key in slidesMetadata) {
            const slide = slidesMetadata[key];

            if (!slide || typeof slide !== "object") {
              console.warn(`⚠️ Invalid slide at key ${key}`);
              continue;
            }

            if (!slide.slideId) {
              console.error(`❌ Slide ${key} missing slideId`);
              continue;
            }

            const slideData = {
              courseId: course.courseId,
              chapterId: chapter.chapterId,
              slideId: slide.slideId,
              slideIndex: slide.slideIndex,
              audioFileName: slide.audioFileName,
              narration: slide.narration,
              revealData: slide.revealData,
              html: slide.html || null,
            };

            slidesArray.push(slideData);
            allSlidesMetadata.push(slideData);
          }

          if (slidesArray.length === 0) {
            throw new Error("No valid slides generated");
          }

          console.log(`✓ Chapter ${i + 1}: ${slidesArray.length} slides ready`);

          toast.loading(`Generating audio for chapter ${i + 1}...`, {
            id: generatingToast,
          });

          try {
            const audioResult = await axios.post(
              "/api/generate-audio",
              {
                slides: slidesArray,
              },
              {
                timeout: 300000,
              },
            );

            console.log(
              `✓ Audio generated for chapter ${i + 1}:`,
              audioResult.data,
            );

            const slidesWithAudio = slidesArray.map((slide, idx) => {
              const audioData = audioResult.data.results?.[idx];
              return {
                ...slide,
                audioFileUrl: audioData?.audioUrl || null,
                caption: audioData?.captions || null,
              };
            });

            console.log("✓ Slides with audio:", slidesWithAudio.length);

            toast.loading(`Saving chapter ${i + 1} to database...`, {
              id: generatingToast,
            });

            try {
              const saveResult = await axios.post("/api/save-slides", {
                courseId: course.courseId,
                chapterId: chapter.chapterId,
                slides: slidesWithAudio,
              });

              console.log(`✓ Chapter ${i + 1} saved:`, saveResult.data);
              toast.success(`Chapter ${i + 1} completed!`, {
                id: generatingToast,
              });
            } catch (saveError: any) {
              console.error(`❌ Failed to save chapter ${i + 1}:`, saveError);
              toast.error(`Failed to save chapter ${i + 1}`, {
                id: generatingToast,
              });
            }
          } catch (audioError: any) {
            console.error(
              `⚠ Audio generation failed for chapter ${i + 1}:`,
              audioError,
            );
            toast.error(`Audio failed for chapter ${i + 1}`, {
              id: generatingToast,
            });
          }
        } catch (chapterError: any) {
          console.error(`✗ Failed chapter ${i + 1}:`, chapterError);
          const errorMsg =
            chapterError.response?.data?.details ||
            chapterError.response?.data?.error ||
            chapterError.message;
          toast.error(`Chapter ${i + 1} failed: ${errorMsg}`, {
            id: generatingToast,
          });
          continue;
        }
      }

      console.log("\n========== ALL CHAPTERS COMPLETED ==========");
      console.log(`Total slides: ${allSlidesMetadata.length}`);
      console.log("============================================\n");

      if (allSlidesMetadata.length > 0) {
        toast.success(
          `Generated ${allSlidesMetadata.length} slides successfully!`,
          { id: generatingToast },
        );

        const updatedCourse = await axios.get(
          `/api/course?courseId=${courseid}`,
        );
        setCourseDetails(updatedCourse.data);
      } else {
        toast.info("No new content generated", { id: generatingToast });
      }
    } catch (error: any) {
      console.error("❌ Critical error:", error);
      toast.error("Failed to generate video content", { id: generatingToast });
    }
  };

  // ✅ CONDITIONAL RETURN AFTER ALL HOOKS
  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  // ✅ MAIN RETURN
  return ( <div className="flex flex-col items-center px-4 sm:px-6 lg:px-8"> {/* Subscription Status Banner */} {!hasPaidPlan && ( <div className="w-full max-w-4xl mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"> <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"> <div> <p className="text-blue-800 font-medium"> 🎓 Free Plan - Limited to 2 courses </p> <p className="text-blue-600 text-sm mt-1"> Upgrade for unlimited course creation </p> </div> <Link href="/pricing" className="w-full sm:w-auto"> <button className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"> Upgrade Now </button> </Link> </div> </div> )} {hasPaidPlan && ( <div className="w-full max-w-4xl mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center"> <p className="text-green-800 text-sm"> ✨ <strong>Premium Member</strong> - Unlimited course creation </p> </div> )} {/* Course Info */} <CourseInfoCard course={courseDetails} durationBySlideId={durationBySlideId} /> {/* Chapters */} <CourseChapters course={courseDetails} durationBySlideId={durationBySlideId} /> </div> );
}

export default CoursePreview;