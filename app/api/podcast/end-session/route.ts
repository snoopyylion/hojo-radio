
// app/api/podcast/end-session/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { authorId } = body;

    const { error } = await supabase
      .from("live_sessions")
      .update({ 
        is_active: false,
        ended_at: new Date().toISOString()
      })
      .eq("author_id", authorId)
      .eq("is_active", true);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to end session" }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("End session error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}
