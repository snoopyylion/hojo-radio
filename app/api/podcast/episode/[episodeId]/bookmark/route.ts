// app/api/podcast/episode/[episodeId]/bookmark/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  try {
    const { userId } = await auth();
    const { episodeId } = await params;

    const [{ count }, { data: bookmarked }] = await Promise.all([
      supabase
        .from("podcast_episode_bookmarks")
        .select("*", { count: "exact", head: true })
        .eq("episode_id", episodeId),
      userId
        ? supabase
            .from("podcast_episode_bookmarks")
            .select("id")
            .eq("episode_id", episodeId)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return NextResponse.json({ bookmarkCount: count || 0, hasBookmarked: !!bookmarked });
  } catch (error) {
    console.error("[Bookmark GET]", error);
    return NextResponse.json({ error: "Failed to get bookmark status" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { episodeId } = await params;

    const { data: existing } = await supabase
      .from("podcast_episode_bookmarks")
      .select("id")
      .eq("episode_id", episodeId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase.from("podcast_episode_bookmarks").delete().eq("id", existing.id);
    } else {
      await supabase
        .from("podcast_episode_bookmarks")
        .insert({ episode_id: episodeId, user_id: userId });
    }

    const { count } = await supabase
      .from("podcast_episode_bookmarks")
      .select("*", { count: "exact", head: true })
      .eq("episode_id", episodeId);

    return NextResponse.json({ bookmarked: !existing, bookmarkCount: count || 0 });
  } catch (error) {
    console.error("[Bookmark POST]", error);
    return NextResponse.json({ error: "Failed to toggle bookmark" }, { status: 500 });
  }
}