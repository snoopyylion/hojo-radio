// app/home/podcast/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import LivePodcastHub from "./LivePodcastHub";

export default async function PodcastPage() {
  const { userId } = await auth();
  if (!userId) redirect("/authentication/sign-in");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ── User ────────────────────────────────────────────────────
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role, first_name, last_name")
    .eq("id", userId)
    .single();

  if (userError) {
    console.error("User fetch failed:", userError);
    redirect("/error");
  }

  // ── Live sessions ────────────────────────────────────────────
  const { data: sessions } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("is_active", true)
    .order("started_at", { ascending: false });

  const liveSessions = (sessions || []).map((s) => ({
    id: s.id,
    authorId: s.author_id,
    authorName: s.author_name,
    title: s.title,
    description: s.description,
    roomName: s.room_name,
    startedAt: s.started_at,
    listenerCount: s.listener_count,
    isActive: s.is_active,
  }));

  // ── Recent published episodes (preview strip) ────────────────
  const { data: recentEpisodes } = await supabase
    .from("podcast_episodes")
    .select(`
      id, episode_number, title, description,
      cover_image_url, duration_seconds, play_count,
      like_count, published_at, recording_status,
      podcast:podcasts!podcast_id(id, name, slug, cover_image_url, author_id),
      season:podcast_seasons!season_id(id, title, season_number),
      author:users!author_id(first_name, last_name)
    `)
    .eq("is_published", true)
    .eq("recording_status", "ready")
    .order("published_at", { ascending: false })
    .limit(8);

  // ── Featured podcasts (preview strip) ────────────────────────
  const { data: featuredPodcasts } = await supabase
    .from("podcasts")
    .select(`
      id, name, slug, description, cover_image_url,
      category, tags, total_episodes, created_at,
      podcast_seasons(count),
      host:users!author_id(first_name, last_name, image_url)
    `)
    .order("created_at", { ascending: false })
    .limit(6);

  // Normalise host: supabase returns object, we always want array
  const podcasts = (featuredPodcasts || []).map((p) => ({
    ...p,
    host: Array.isArray(p.host) ? p.host : p.host ? [p.host] : [],
  }));

  // Normalise episodes
  const episodes = (recentEpisodes || []).map((ep) => {
    const podcast = Array.isArray(ep.podcast) ? ep.podcast[0] : ep.podcast;
    const season = Array.isArray(ep.season) ? ep.season[0] : ep.season;
    const author = Array.isArray(ep.author) ? ep.author[0] : ep.author;
    return {
      ...ep,
      author: author || { first_name: "Unknown", last_name: "" },
      podcast: {
        id: podcast?.id || "",
        name: podcast?.name || "Unknown",
        slug: podcast?.slug || "",
        cover_image_url: podcast?.cover_image_url ?? undefined,
        author_id: podcast?.author_id || "",
      },
      season: {
        id: season?.id || "",
        title: season?.title || "Season 1",
        season_number: season?.season_number || 1,
      },
    };
  });

  return (
    <LivePodcastHub
      user={{
        id: userId,
        name: `${userData.first_name} ${userData.last_name}`,
        role: userData.role,
      }}
      liveSessions={liveSessions}
      recentEpisodes={episodes}
      featuredPodcasts={podcasts}
    />
  );
}