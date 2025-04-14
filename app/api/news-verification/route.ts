// /app/api/news-verification/save/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { headline, content, source_url, verdict, credibility_score } = await request.json();

    const { error } = await supabaseAdmin.from("verifications").insert([{
      user_id: userId,
      headline,
      content,
      source_url,
      verdict,
      credibility_score
    }]);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: "Database insert failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
