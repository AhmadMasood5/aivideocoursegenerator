import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import { usersTable } from "@/config/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Deduct 1 credit
    await db
      .update(usersTable)
      .set({
        credit: sql`${usersTable.credit} - 1`
      })
      .where(eq(usersTable.email, email));

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error deducting credit:", error);
    return NextResponse.json(
      { error: "Failed to deduct credit" },
      { status: 500 }
    );
  }
}