
// app/api/podcast/update-listener-count/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, increment } = body;

    // Get current count
    const { data: session } = await supabase
      .from("live_sessions")
      .select("listener_count")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const newCount = Math.max(0, session.listener_count + increment);

    const { error } = await supabase
      .from("live_sessions")
      .update({ listener_count: newCount })
      .eq("id", sessionId);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to update listener count" }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, count: newCount });
  } catch (error) {
    console.error("Update listener count error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}