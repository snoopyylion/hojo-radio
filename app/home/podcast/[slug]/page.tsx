// app/home/podcast/[slug]/page.tsx
// Podcast detail - shows all seasons and their episodes

import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import PodcastDetailView from "./PodcastDetailView";

interface Props {
  params: Promise<{ slug: string }> // Change to Promise
}

export default async function PodcastDetailPage({ params }: Props) {
  const { slug } = await params; // AWAIT params!
  
  const { userId } = await auth();
  if (!userId) redirect("/authentication/sign-in");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch the podcast with author info
  const { data: podcast } = await supabase
    .from("podcasts")
    .select(`
      *,
      author:users!author_id(first_name, last_name, avatar_url)
    `)
    .eq("slug", slug)
    .single();

  if (!podcast) notFound();

  // Fetch all seasons for this podcast with episode counts
  const { data: seasons } = await supabase
    .from("podcast_seasons")
    .select(`
      *,
      episodes:podcast_episodes(count)
    `)
    .eq("podcast_id", podcast.id)
    .eq("is_active", true)
    .order("season_number", { ascending: true });

  // Fetch all published episodes with their season info
  const { data: episodes } = await supabase
    .from("podcast_episodes")
    .select(`
      *,
      season:podcast_seasons!season_id(id, title, season_number)
    `)
    .eq("podcast_id", podcast.id)
    .eq("is_published", true)
    .eq("recording_status", "ready")
    .order("season_id", { ascending: true })
    .order("episode_number", { ascending: true });

  // Calculate total episodes
  const totalEpisodes = episodes?.length || 0;

  return (
    <PodcastDetailView
      podcast={{ ...podcast, total_episodes: totalEpisodes }}
      seasons={seasons || []}
      episodes={episodes || []}
      currentUserId={userId}
      isOwner={podcast.author_id === userId}
    />
  );
}