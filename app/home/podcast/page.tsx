// app/home/podcast/page.tsx (Main podcast hub page)
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import LivePodcastHub from "./LivePodcastHub";

export default async function PodcastPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/authentication/sign-in");
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get user info
  const { data: userData, error: userError } = await supabase
  .from("users")
  .select("role, first_name, last_name")
  .eq("id", userId)
  .single();

  if (userError) {
    console.error("User fetch failed:", userError);
    redirect("/error");
  }

  // Get active live sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("is_active", true)
    .order("started_at", { ascending: false });

  if (sessionsError) {
    console.error("Sessions fetch failed:", sessionsError);
  }

  // Transform database sessions to match TypeScript interface
  const liveSessions = (sessions || []).map(session => ({
    id: session.id,
    authorId: session.author_id,
    authorName: session.author_name,
    title: session.title,
    description: session.description,
    roomName: session.room_name,
    startedAt: session.started_at,
    listenerCount: session.listener_count,
    isActive: session.is_active,
  }));
  

  return (
    <LivePodcastHub 
  user={{
    id: userId,
    name: `${userData.first_name} ${userData.last_name}`,
    role: userData.role
  }}
  liveSessions={liveSessions}
/>
  );
}
