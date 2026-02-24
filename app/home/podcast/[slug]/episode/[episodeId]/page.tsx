// app/home/podcast/[slug]/episode/[episodeId]/page.tsx

import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import EpisodePlayerView from "./EpisodePlayerView";

interface Props {
  params: Promise<{ slug: string; episodeId: string }>; // Change to Promise
}

export default async function EpisodePlayerPage({ params }: Props) {
  const { slug, episodeId } = await params; // AWAIT params!
  
  const { userId } = await auth();
  if (!userId) redirect("/authentication/sign-in");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch the episode with podcast + season + host info
  const { data: episode } = await supabase
    .from("podcast_episodes")
    .select(`
      *,
      podcast:podcasts!podcast_id(
        id, 
        name, 
        slug, 
        cover_image_url, 
        description, 
        author_id,
        host:users!author_id(first_name, last_name, avatar_url)
      ),
      season:podcast_seasons!season_id(
        id, 
        title, 
        season_number, 
        description
      ),
      author:users!author_id(
        first_name, 
        last_name,
        avatar_url,
        bio
      )
    `)
    .eq("id", episodeId)
    .eq("is_published", true)
    .eq("recording_status", "ready")
    .single();

  if (!episode) notFound();

  // Check if podcast slug matches
  if (episode.podcast?.slug !== slug) {
    redirect(`/home/podcast/${episode.podcast?.slug}/episode/${episodeId}`);
  }

  // Fetch adjacent episodes (prev/next in same season)
  const { data: siblingEpisodes } = await supabase
    .from("podcast_episodes")
    .select("id, episode_number, title, duration_seconds")
    .eq("season_id", episode.season_id)
    .eq("is_published", true)
    .eq("recording_status", "ready")
    .order("episode_number", { ascending: true });

  const currentIndex = siblingEpisodes?.findIndex((e) => e.id === episode.id) ?? -1;
  const prevEpisode = currentIndex > 0 ? siblingEpisodes![currentIndex - 1] : null;
  const nextEpisode =
    currentIndex < (siblingEpisodes?.length ?? 0) - 1
      ? siblingEpisodes![currentIndex + 1]
      : null;

  // Log the play
  await supabase.from("podcast_episode_plays").insert({
    episode_id: episode.id,
    user_id: userId,
    played_at: new Date().toISOString(),
  });

  // Increment play count (fire and forget)
  try {
    await supabase.rpc("increment_episode_play_count", { ep_id: episode.id });
  } catch {
    // Optional: console.warn("Play count increment failed"); 
    // but usually safe to ignore – don't want to block page render
  }

  return (
    <EpisodePlayerView
      episode={episode}
      prevEpisode={prevEpisode}
      nextEpisode={nextEpisode}
      currentUserId={userId}
      isOwner={episode.podcast?.author_id === userId}
    />
  );
}