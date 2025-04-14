// /app/api/news-verification/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { headline, content, source_url = "" } = body;

    if (!headline || !content) {
      return NextResponse.json({
        error: "Both headline and content are required",
      }, { status: 400 });
    }

    const backendUrl = process.env.NEWS_VERIFICATION_API_URL;
    if (!backendUrl) {
      return NextResponse.json({
        error: "Backend URL not configured",
      }, { status: 500 });
    }

    // 🧠 1. Call external verification API
    const response = await fetch(`${backendUrl}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headline, content, source_url }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend responded with status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    
    // Extract source_confidence from the verification_data object
    const sourceConfidence = result.verification_data?.source_confidence || 0;

    // ✅ 2. Save only required fields to Supabase
    const { error } = await supabaseAdmin.from("verifications").insert([
      {
        user_id: userId,
        headline,
        content,
        source_url,
        verdict: result.verdict,
        credibility_score: sourceConfidence, // Using the extracted source_confidence value
      },
    ]);

    if (error) {
      console.error("❌ Error saving to Supabase:", error);
      return NextResponse.json({ error: "Database insert failed" }, { status: 500 });
    }

    // 🎉 3. Return the full result for frontend display
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ Error processing news verification:", error);
    return NextResponse.json(
      { error: "Failed to verify news", details: error.message },
      { status: 500 }
    );
  }
}