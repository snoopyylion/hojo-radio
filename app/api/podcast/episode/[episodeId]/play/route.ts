// app/api/podcast/episode/[episodeId]/play/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  try {
    const { userId } = await auth();
    const { episodeId } = await params;

    // Log the play event
    await supabase.from("podcast_episode_plays").insert({
      episode_id: episodeId,
      user_id: userId || null,
      played_at: new Date().toISOString(),
    });

    // Increment play count
    const { data: episode } = await supabase
      .from("podcast_episodes")
      .select("play_count")
      .eq("id", episodeId)
      .single();

    if (episode) {
      await supabase
        .from("podcast_episodes")
        .update({ play_count: (episode.play_count || 0) + 1 })
        .eq("id", episodeId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Play POST]", error);
    return NextResponse.json({ error: "Failed to track play" }, { status: 500 });
  }
}