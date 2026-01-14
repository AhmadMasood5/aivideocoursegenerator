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

    const toastId = toast.loading("Generating your course layout...");
    const courseId = await crypto.randomUUID();
    setLoading(true);

    try {
      const result = await axios.post("/api/generate-course-layout", {
        userInput,
        type,
        courseId:courseId,
      });
      toast.success("Course layout generated!", { id: toastId });
      console.log(result.data);
      router.push('/course/'+ courseId)
      
    } catch (error) {
      toast.error("Failed to generate course layout", { id: toastId });
      console.error(error);
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
            placeholder="Enter a topic you want to learn about..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <InputGroupAddon align="block-end">
            <Select value={type} onValueChange={setType}>
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
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" /> : <Send />}
              </InputGroupButton>
            ) : (
              <SignInButton mode="modal">
                <InputGroupButton
                  className="ml-auto"
                  size="icon-sm"
                  variant="default"
                  disabled={loading}
                >
                  <Send />
                </InputGroupButton>
              </SignInButton>
            )}
          </InputGroupAddon>
        </InputGroup>
      </div>
      <div className="flex gap-5 mt-5 max-w-3xl flex-wrap justify-center relative">
        {QUICK_VIDEO_SUGGESTIONS.map((suggestion, index) => (
          <h2
            key={index}
            onClick={() => setUserInput(suggestion?.prompt)}
            className="border cursor-pointer rounded-2xl px-2 p-1 text-sm bg-white/70 hover:bg-white transition-colors relative z-20"
          >
            {suggestion.title}
          </h2>
        ))}
      </div>
    </div>
  );
};

export default Hero;