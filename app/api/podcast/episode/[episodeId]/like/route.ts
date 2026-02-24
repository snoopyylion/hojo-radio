// app/api/podcast/episode/[episodeId]/like/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Check if user liked the episode
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> } // Change to Promise
) {
  try {
    const { userId } = await auth();
    const { episodeId } = await params; // AWAIT params!

    const [{ count }, { data: liked }] = await Promise.all([
      supabase
        .from("podcast_episode_likes")
        .select("*", { count: "exact", head: true })
        .eq("episode_id", episodeId),
      userId
        ? supabase
            .from("podcast_episode_likes")
            .select("id")
            .eq("episode_id", episodeId)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return NextResponse.json({ likeCount: count || 0, hasLiked: !!liked });
  } catch (error) {
    console.error("[Like GET]", error);
    return NextResponse.json({ error: "Failed to get like status" }, { status: 500 });
  }
}

// POST - Toggle like
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> } // Change to Promise
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { episodeId } = await params; // AWAIT params!

    const { data: existing } = await supabase
      .from("podcast_episode_likes")
      .select("id")
      .eq("episode_id", episodeId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase.from("podcast_episode_likes").delete().eq("id", existing.id);
    } else {
      await supabase.from("podcast_episode_likes").insert({ 
        episode_id: episodeId, 
        user_id: userId 
      });
    }

    const { count } = await supabase
      .from("podcast_episode_likes")
      .select("*", { count: "exact", head: true })
      .eq("episode_id", episodeId);

    return NextResponse.json({ liked: !existing, likeCount: count || 0 });
  } catch (error) {
    console.error("[Like POST]", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}