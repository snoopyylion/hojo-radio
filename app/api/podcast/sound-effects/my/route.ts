
// app/api/podcast/sound-effects/my/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get current user
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Fetch only current user's sound effects
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
      .eq("author_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user sound effects:", error);
      return NextResponse.json(
        { error: "Failed to fetch your sound effects" },
        { status: 500 }
      );
    }

    // Transform the data to match your frontend interface
    const transformedEffects = soundEffects.map((effect) => ({
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
      isOwned: true, // All effects in this route are owned by the user
    }));

    return NextResponse.json({
      success: true,
      data: transformedEffects,
    });
  } catch (err) {
    console.error("User sound effects fetch error:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}