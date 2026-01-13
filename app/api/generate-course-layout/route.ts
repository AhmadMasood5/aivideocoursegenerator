import { db } from "@/config/db";
import { client } from "@/config/openai";
import { coursesTable } from "@/config/schema";
import { Course_config_prompt } from "@/data/promt";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        console.log("🚀 API called - Starting course generation");
        
        const { userInput, courseId, type } = await request.json();
        console.log("📝 Request data:", { userInput, courseId, type });
        
        if (!userInput || !courseId || !type) {
            console.error("❌ Missing required fields");
            return NextResponse.json(
                { error: "Missing required fields: userInput, courseId, and type are required" },
                { status: 400 }
            );
        }

        console.log("👤 Fetching user...");
        const user = await currentUser();
        
        if (!user?.primaryEmailAddress?.emailAddress) {
            console.error("❌ User not authenticated");
            return NextResponse.json(
                { error: "User not authenticated" },
                { status: 401 }
            );
        }
        console.log("✅ User authenticated:", user.primaryEmailAddress.emailAddress);

        console.log("🤖 Calling Azure OpenAI...");
        console.log("Deployment:", process.env.AZURE_OPENAI_DEPLOYMENT_NAME);
        console.log("Endpoint:", process.env.AZURE_OPENAI_ENDPOINT);
        
        const response = await client.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
            messages: [
                {
                    role: 'system',
                    content: Course_config_prompt,
                },
                {
                    role: 'user',
                    content: `Course Topic: ${userInput}`
                }
            ],
            response_format: { type: "json_object" },
            // ❌ REMOVED: temperature: 0.7, - Not supported by this deployment
        });
        
        console.log("✅ Azure OpenAI response received");

        const rawOutput = response.choices[0].message?.content || '';
        console.log("📄 Raw AI output preview:", rawOutput.substring(0, 300) + "...");
        
        if (!rawOutput) {
            console.error("❌ No response from AI");
            return NextResponse.json(
                { error: "No response from AI" },
                { status: 500 }
            );
        }

        let JsonResult;
        try {
            JsonResult = JSON.parse(rawOutput);
            console.log("✅ JSON parsed successfully");
            console.log("Course structure:", {
                courseTitle: JsonResult.courseTitle,
                totalChapters: JsonResult.totalChapters,
                chaptersCount: JsonResult.chapters?.length
            });
        } catch (parseError) {
            console.error("❌ JSON Parse Error:", parseError);
            console.error("Raw output:", rawOutput);
            return NextResponse.json(
                { 
                    error: "Invalid AI response format", 
                    details: rawOutput.substring(0, 500) 
                },
                { status: 500 }
            );
        }

        // Validate required fields
        if (!JsonResult.courseTitle && !JsonResult.courseName) {
            console.error("❌ Missing courseTitle/courseName in AI response");
            console.error("AI Response structure:", Object.keys(JsonResult));
            return NextResponse.json(
                { 
                    error: "AI response missing courseTitle",
                    receivedKeys: Object.keys(JsonResult)
                },
                { status: 500 }
            );
        }

        // Use courseTitle if available, fallback to courseName
        const finalCourseTitle = JsonResult.courseTitle || JsonResult.courseName;

        console.log("💾 Inserting into database...");
        const courseResult = await db.insert(coursesTable).values({
            courseId: courseId,
            courseName: finalCourseTitle,
            userInput: userInput,
            type: type,
            courseLayout: JsonResult,
            userId: user.primaryEmailAddress.emailAddress
        }).returning();

        console.log("✅ Course created successfully:", courseResult[0].courseId);
        return NextResponse.json(courseResult[0]);

    } catch (error) {
        console.error("💥 API Error:", error);
        
        if (error instanceof Error) {
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
        
        return NextResponse.json(
            { 
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error",
                type: error instanceof Error ? error.name : typeof error
            },
            { status: 500 }
        );
    }
}