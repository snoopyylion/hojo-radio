// app/home/podcast/[slug]/episode/[episodeId]/upload/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import EpisodeUploadForm from "./EpisodeUploadForm";

interface Props {
  params: Promise<{ slug: string; episodeId: string }>; // Note: Promise
}

export default async function EpisodeUploadPage({ params }: Props) {
  const { episodeId } = await params;
  
  const { userId } = await auth();
  if (!userId) redirect("/authentication/sign-in");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: episode } = await supabase
    .from("podcast_episodes")
    .select(`
      *,
      podcast:podcasts(name, slug),
      season:podcast_seasons(title, season_number)
    `)
    .eq("id", episodeId)
    .eq("author_id", userId)
    .single();

  if (!episode) redirect("/home/podcast");

  return <EpisodeUploadForm episode={episode} />;
}