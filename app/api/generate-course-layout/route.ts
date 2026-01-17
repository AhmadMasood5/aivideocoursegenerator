import { db } from "@/config/db";
import { client } from "@/config/openai";
import { coursesTable } from "@/config/schema";
import { Course_config_prompt } from "@/data/promt";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        console.log("🚀 API called - Starting course generation");
        
        // Check authentication and subscription
        const { has } = await auth();
        const user = await currentUser();
        
        if (!user?.primaryEmailAddress?.emailAddress) {
            console.error("❌ User not authenticated");
            return NextResponse.json(
                { error: "User not authenticated" },
                { status: 401 }
            );
        }

        console.log("✅ User authenticated:", user.primaryEmailAddress.emailAddress);

        // ✅ Check if user has the monthly paid plan
        const hasPaidPlan = has({ plan: 'monthly' });
        
        console.log("💳 Paid plan status:", hasPaidPlan);

        // ✅ If user is NOT on paid plan, enforce 2-course limit
        if (!hasPaidPlan) {
            console.log("⚠️ Free user - checking course limit...");
            
            const userCourses = await db
                .select()
                .from(coursesTable)
                .where(eq(coursesTable.userId, user.primaryEmailAddress.emailAddress));
            
            console.log(`📊 User has ${userCourses.length} courses`);

            if (userCourses.length >= 2) {
                console.log("❌ Free user limit reached");
                return NextResponse.json(
                    { 
                        error: "Free plan limit reached",
                        message: "You've reached the maximum of 2 courses for free users. Please upgrade to the Monthly plan to create unlimited courses.",
                        coursesCreated: userCourses.length,
                        maxAllowed: 2,
                        upgradeUrl: "/pricing"
                    },
                    { status: 403 }
                );
            }

            console.log(`✅ Free user within limit: ${userCourses.length}/2 courses`);
        } else {
            console.log("✅ Paid user (Monthly plan) - no course limit");
        }
        
        const { userInput, courseId, type } = await request.json();
        console.log("📝 Request data:", { userInput, courseId, type });
        
        if (!userInput || !courseId || !type) {
            console.error("❌ Missing required fields");
            return NextResponse.json(
                { error: "Missing required fields: userInput, courseId, and type are required" },
                { status: 400 }
            );
        }

        console.log("🤖 Calling Azure OpenAI...");
        console.log("Deployment:", process.env.AZURE_OPENAI_DEPLOYMENT_NAME);
        
        const response = await client.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
            messages: [
                {
                    role: 'system',
                    content: Course_config_prompt,
                },
                {
                    role: 'user',
                    content: `Generate a comprehensive course for: "${userInput}"

Analyze this topic and:
1. Determine the appropriate difficulty level (Beginner/Intermediate/Advanced)
2. If "beginner" or "basics" is mentioned, start from absolute fundamentals
3. Create a logical learning progression from simple to complex
4. Ensure Chapter 1 introduces core concepts before diving into details

For a BEGINNER course, Chapter 1 MUST answer:
- What is [topic]?
- Why should I learn this?
- What problems does it solve?

Then progressively build skills across the remaining chapters.

Generate the course configuration now.`
                }
            ],
            response_format: { type: "json_object" },
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
                courseName: JsonResult.courseName,
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

        // Use courseName (from updated prompt) or fallback to courseTitle
        const finalCourseTitle = JsonResult.courseName || JsonResult.courseTitle;

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
        
        // Return success with subscription info
        return NextResponse.json({
            ...courseResult[0],
            subscription: {
                isPaidUser: hasPaidPlan,
                plan: hasPaidPlan ? 'monthly' : 'free',
                coursesRemaining: hasPaidPlan ? 'unlimited' : 'limited'
            }
        });

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