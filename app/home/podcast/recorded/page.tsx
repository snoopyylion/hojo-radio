// app/home/podcast/recorded/page.tsx
// Browse all recorded podcasts - server component

import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PodcastBrowse from "./PodcastBrowse";

export default async function RecordedPodcastsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/authentication/sign-in");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all public podcasts with season counts
  const { data: podcasts } = await supabase
    .from("podcasts")
    .select(`
      *,
      podcast_seasons(count),
      author:users!author_id(first_name, last_name, avatar_url)
    `)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  // Fetch published episodes that are ready - WITH PROPER JOINS!
  const { data: recentEpisodes, error } = await supabase
    .from("podcast_episodes")
    .select(`
      *,
      podcast:podcasts!podcast_id(
        id, 
        name, 
        slug, 
        cover_image_url, 
        author_id
      ),
      season:podcast_seasons!season_id(
        id, 
        title, 
        season_number
      ),
      author:users!author_id(
        first_name, 
        last_name
      )
    `)
    .eq("is_published", true)
    .eq("recording_status", "ready")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(50);

  if (error) {
    console.error("Error fetching episodes:", error);
  }

  console.log("Fetched episodes:", recentEpisodes);

  return (
    <PodcastBrowse
      podcasts={podcasts || []}
      recentEpisodes={recentEpisodes || []}
      currentUserId={userId}
    />
  );
}