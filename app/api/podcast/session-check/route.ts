// app/api/podcast/session-check/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", exists: false },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required", exists: false },
        { status: 400 }
      );
    }

    console.log('🔍 Checking session:', sessionId);

    const { data, error } = await supabase
      .from("live_sessions")
      .select("id, is_active, title, author_id")
      .eq("id", sessionId)
      .single();

    if (error || !data) {
      console.log('❌ Session not found:', sessionId, error?.message);
      return NextResponse.json({
        exists: false,
        sessionId,
        error: error?.message
      }, { status: 200 }); // Return 200 even if not found, with exists: false
    }

    console.log('✅ Session found:', data.id, 'Active:', data.is_active);

    return NextResponse.json({
      exists: true,
      sessionId: data.id,
      isActive: data.is_active,
      title: data.title,
      authorId: data.author_id
    });
  } catch (error) {
    console.error("❌ Session check error:", error);
    return NextResponse.json(
      { 
        exists: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}