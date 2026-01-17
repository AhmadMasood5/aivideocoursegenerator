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
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import { QUICK_VIDEO_SUGGESTIONS } from "@/data/constant";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
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
        courseId: courseId,
      });

      // ✅ Handle free plan limit
      if (result?.data?.error === 'Free plan limit reached') {
        toast.error("Free Plan Limit Reached", {
          id: toastId,
          description: "You've created 2 courses. Upgrade to create unlimited courses!",
          action: {
            label: "Upgrade Now",
            onClick: () => router.push('/pricing')
          },
          duration: 6000
        });
        return;
      }

      // ✅ Handle other errors
      if (result?.data?.error) {
        toast.error(result.data.error, {
          id: toastId,
          description: result.data.message || "Please try again"
        });
        return;
      }

      // ✅ Success
      toast.success("Course layout generated!", { 
        id: toastId,
        description: "Redirecting to your course..."
      });
      
      console.log("✅ Course created:", result.data);
      
      // Small delay for better UX
      setTimeout(() => {
        router.push('/course/' + courseId);
      }, 500);
      
    } catch (error: any) {
      console.error("❌ Course generation error:", error);
      
      // ✅ Better error handling
      if (error.response?.status === 403) {
        toast.error("Free Plan Limit Reached", {
          id: toastId,
          description: "You've reached your course limit. Upgrade for unlimited courses!",
          action: {
            label: "View Plans",
            onClick: () => router.push('/pricing')
          },
          duration: 6000
        });
      } else if (error.response?.status === 401) {
        toast.error("Authentication Required", {
          id: toastId,
          description: "Please sign in to continue"
        });
      } else {
        toast.error("Failed to generate course", { 
          id: toastId,
          description: error.response?.data?.message || "Please try again later"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center flex-col mt-20">
      <div>
        <h2 className="text-3xl font-bold">
          Learn Smarter With{" "}
          <span className="text-primary">AI Video Courses</span>
        </h2>
        <p className="text-center text-gray-500 mt-3 text-xl">
          Turn Any Topic into a Complete Course
        </p>
      </div>
      
      <div className="grid w-full max-w-xl mt-5 gap-6 bg-white z-10">
        <InputGroup>
          <InputGroupTextarea
            data-slot="input-group-control"
            className="flex field-sizing-content min-h-24 w-full resize-none rounded-xl bg-white px-3 py-2.5 text-base transition-[color,box-shadow] outline-none md:text-sm"
            placeholder="e.g., Introduction to React, Python for Beginners, Web Design Basics..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={loading}
          />
          <InputGroupAddon align="block-end">
            <Select value={type} onValueChange={setType} disabled={loading}>
              <SelectTrigger className="w-45">
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
                className="ml-auto"
                size="icon-sm"
                variant="default"
                onClick={generateCourseLayout}
                disabled={loading || !userInput.trim()}
              >
                {loading ? <Loader2 className="animate-spin" /> : <Send />}
              </InputGroupButton>
            ) : (
              <SignInButton mode="modal">
                <InputGroupButton
                  className="ml-auto"
                  size="icon-sm"
                  variant="default"
                >
                  <Send />
                </InputGroupButton>
              </SignInButton>
            )}
          </InputGroupAddon>
        </InputGroup>
      </div>

      {/* Quick suggestions */}
      <div className="flex gap-5 mt-5 max-w-3xl flex-wrap justify-center relative">
        {QUICK_VIDEO_SUGGESTIONS.map((suggestion, index) => (
          <h2
            key={index}
            onClick={() => !loading && setUserInput(suggestion?.prompt)}
            className={`border cursor-pointer rounded-2xl px-2 p-1 text-sm bg-white/70 hover:bg-white transition-colors relative z-20 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {suggestion.title}
          </h2>
        ))}
      </div>

      {/* Free plan notice */}
      {isSignedIn && (
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Free users can create up to 2 courses.{" "}
            <Link href="/pricing" className="text-primary hover:underline font-semibold">
              Upgrade for unlimited courses →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
};

export default Hero;