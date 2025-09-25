// app/api/podcast/sound-effects/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

// Check if environment variables are properly set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  console.log("GET /api/podcast/sound-effects - Starting request");
  
  try {
    // Get current user for potential filtering
    console.log("Getting current user...");
    const user = await currentUser();
    const userId = user?.id;
    console.log("User ID:", userId);

    // ✅ Simple table check instead of broken count query
    console.log("Testing Supabase connection with simple table check...");
    const { error: testError } = await supabase
      .from("sound_effects")
      .select("id", { count: "exact", head: true });

    if (testError) {
      console.error("Supabase connection test failed:", testError);
      return NextResponse.json(
        { error: "Database connection failed", details: testError.message },
        { status: 500 }
      );
    }

    console.log("Supabase connection successful, fetching sound effects...");

    // ✅ Fetch all sound effects
    const { data: soundEffects, error } = await supabase
      .from("sound_effects")
      .select(`
        id,
        author_id,
        title,
        file_url,
        duration,
        file_size,
        category,
        tags,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching sound effects:", error);
      return NextResponse.json(
        { error: "Failed to fetch sound effects", details: error.message },
        { status: 500 }
      );
    }

    console.log(`Found ${soundEffects?.length || 0} sound effects`);

    // Transform the data to match your frontend interface
    const transformedEffects = (soundEffects || []).map((effect) => ({
      id: effect.id,
      title: effect.title,
      url: effect.file_url,
      category: effect.category || "general",
      duration: effect.duration ? effect.duration * 1000 : undefined, // Convert to ms
      author_id: effect.author_id,
      tags: effect.tags || [],
      file_size: effect.file_size,
      created_at: effect.created_at,
      updated_at: effect.updated_at,
      isOwned: userId ? effect.author_id === userId : false, // Flag for user's own effects
    }));

    console.log("Successfully transformed effects, returning response");

    return NextResponse.json({
      success: true,
      data: transformedEffects,
    });
  } catch (err) {
    console.error("Sound effects fetch error:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}