"use client";
import React, { useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import { QUICK_VIDEO_SUGGESTIONS } from "@/data/constant";
import axios from "axios";
import { toast } from "sonner";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

const Hero = () => {
  const [userInput, setUserInput] = useState("");
  const [type, setType] = useState("full-course");
  const [loading, setLoading] = useState(false);
  const { isSignedIn } = useUser();
  const router = useRouter();

  const generateCourseLayout = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to generate a course");
      return;
    }
    if (!userInput.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    const toastId = toast.loading("Generating your course layout...");
    const courseId = crypto.randomUUID();
    setLoading(true);

    try {
      const result = await axios.post("/api/generate-course-layout", {
        userInput,
        type,
        courseId,
      });

      if (result?.data?.error === "Free plan limit reached") {
        toast.error("Free Plan Limit Reached", {
          id: toastId,
          description:
            "You've created 2 courses. Upgrade to create unlimited courses!",
          action: {
            label: "Upgrade Now",
            onClick: () => router.push("/pricing"),
          },
          duration: 6000,
        });
        return;
      }

      if (result?.data?.error) {
        toast.error(result.data.error, {
          id: toastId,
          description: result.data.message || "Please try again",
        });
        return;
      }

      toast.success("Course layout generated!", {
        id: toastId,
        description: "Redirecting to your course...",
      });

      setTimeout(() => {
        router.push("/course/" + courseId);
      }, 500);
    } catch (error: any) {
      console.error("❌ Course generation error:", error);
      toast.error("Failed to generate course", {
        id: toastId,
        description: error.response?.data?.message || "Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center mt-16 px-4">
      {/* Heading */}
      <div className="text-center max-w-2xl">
        <h2 className="text-2xl sm:text-3xl font-bold">
          Learn Smarter With{" "}
          <span className="text-primary">AI Video Courses</span>
        </h2>
        <p className="text-gray-500 mt-3 text-base sm:text-lg">
          Turn Any Topic into a Complete Course
        </p>
      </div>

      {/* Input + Select + Button */}
      <div className="w-full max-w-xl mt-6 bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <InputGroup className="flex-1">
            <InputGroupTextarea
              className="min-h-24 w-full resize-none rounded-xl px-3 py-2.5 text-base md:text-sm"
              placeholder="e.g., Introduction to React, Python for Beginners..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={loading}
            />
          </InputGroup>

          <div className="flex gap-2 sm:flex-col sm:gap-4">
            <Select
              value={type}
              onValueChange={setType}
              disabled={loading}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Full Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="full-course">Full Course</SelectItem>
                  <SelectItem value="quick-explain">Quick Explain</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            {isSignedIn ? (
              <InputGroupButton
                size="icon-sm"
                variant="default"
                onClick={generateCourseLayout}
                disabled={loading || !userInput.trim()}
                className="w-full sm:w-auto"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Send />}
              </InputGroupButton>
            ) : (
              <SignInButton mode="modal">
                <InputGroupButton
                  size="icon-sm"
                  variant="default"
                  className="w-full sm:w-auto"
                >
                  <Send />
                </InputGroupButton>
              </SignInButton>
            )}
          </div>
        </div>
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-3 mt-6 max-w-3xl justify-center">
        {QUICK_VIDEO_SUGGESTIONS.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => !loading && setUserInput(suggestion?.prompt)}
            className={`border rounded-2xl px-3 py-1 text-sm bg-white/70 hover:bg-white transition-colors ${
              loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            {suggestion.title}
          </button>
        ))}
      </div>

      {/* Free plan notice */}
      {isSignedIn && (
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Free users can create up to 2 courses.{" "}
            <Link
              href="/pricing"
              className="text-primary hover:underline font-semibold"
            >
              Upgrade for unlimited courses →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
};

export default Hero;
