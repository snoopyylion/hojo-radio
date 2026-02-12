"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Radio, Clock, Mic } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

interface LiveSession {
  id: string;
  title: string;
  authorName: string;
  authorId: string;
  listenerCount: number;
  startedAt: string;
  roomName: string;
  isActive: boolean;
}

interface LiveSessionsRow {
  id: string;
  title: string;
  author_id: string;
  author_name: string;
  listener_count: number | null;
  started_at: string;
  room_name: string;
  is_active: boolean;
  // add any other columns you have in the table
}

interface RecentLivePodcastsProps {
  limit?: number;
  title?: string;
  className?: string;
}

const RecentLivePodcasts = ({
  limit = 6,
  title = "Live Podcasts Now",
  className = "",
}: RecentLivePodcastsProps) => {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const supabase = supabaseClient;

    // Initial fetch
    const fetchActiveSessions = async () => {
      try {
        const { data, error } = await supabase
          .from("live_sessions")
          .select("id, title, author_name, author_id, listener_count, started_at, room_name, is_active")
          .eq("is_active", true)
          .order("started_at", { ascending: false })
          .limit(limit);

        if (error) throw error;

        setSessions(
          data?.map((s) => ({
            id: s.id,
            title: s.title,
            authorName: s.author_name,
            authorId: s.author_id,
            listenerCount: s.listener_count || 0,
            startedAt: s.started_at,
            roomName: s.room_name,
            isActive: s.is_active,
          })) || []
        );
      } catch (err) {
        console.error("Failed to fetch live sessions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveSessions();

    // Realtime subscription
    const channel = supabase
      .channel("public:live_sessions_active")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions", filter: "is_active=eq.true" },
        (payload: RealtimePostgresChangesPayload<LiveSessionsRow>) => {
          if (payload.eventType === "INSERT") {
            const newSession = payload.new;
            setSessions((prev) => {
              if (prev.some((s) => s.id === newSession.id)) return prev;
              return [{
                id: newSession.id,
                title: newSession.title,
                authorName: newSession.author_name,
                authorId: newSession.author_id,
                listenerCount: newSession.listener_count || 0,
                startedAt: newSession.started_at,
                roomName: newSession.room_name,
                isActive: newSession.is_active,
              }, ...prev].slice(0, limit);
            });
          } else if (payload.eventType === "UPDATE") {
            setSessions((prev) =>
              prev.map((s) =>
                s.id === payload.new.id
                  ? { ...s, listenerCount: payload.new.listener_count || s.listenerCount }
                  : s
              )
            );
          } else if (payload.eventType === "DELETE") {
            setSessions((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m ago`;
  };

  if (loading) {
    return (
      <div className={`w-full ${className}`}>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-5 animate-pulse border border-gray-200 dark:border-gray-800">
              <div className="flex justify-between mb-4">
                <div className="h-5 w-16 bg-gray-300 dark:bg-gray-700 rounded-full" />
                <div className="h-5 w-10 bg-gray-300 dark:bg-gray-700 rounded" />
              </div>
              <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-4/5 mb-2" />
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className={`w-full text-center py-10 ${className}`}>
        <div className="inline-block p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <Radio className="w-10 h-10 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            No live podcasts right now
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Check back soon or start your own!
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white font-sora mb-6 sm:text-3xl tracking-tight">
          {title} <span className="text-[#EF3866] text-2xl font-semibold font-sora mb-6 sm:text-3xl tracking-tight">({sessions.length})</span>
        </h2>
        <Link
          href="/home/podcast"
          className="text-[#EF3866] hover:text-[#d32f5e] font-medium flex items-center gap-1.5 transition-colors"
        >
          View all live <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {sessions.map((session) => {
          const isUsersSession = userId === session.authorId;

          return (
            <div
              key={session.id}
              onClick={() => router.push("/home/podcast")}
              className="group bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-[#EF3866]/60 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#EF3866] rounded-full animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#EF3866]">
                    LIVE
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <Users size={14} />
                  <span>{session.listenerCount}</span>
                </div>
              </div>

              {/* Content */}
              <div className="px-5 pb-5 flex-grow">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-2 group-hover:text-[#EF3866] transition-colors">
                  {session.title}
                </h3>

                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mic size={14} className={isUsersSession ? "text-[#EF3866]" : ""} />
                  <span className={isUsersSession ? "font-medium text-[#EF3866]" : ""}>
                    {isUsersSession ? "Your session" : session.authorName}
                  </span>
                </div>

                <div className="mt-3 text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>Started {formatTimeAgo(session.startedAt)}</span>
                </div>
              </div>

              {/* Action footer */}
              <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                {isUsersSession ? (
                  <button className="w-full py-2.5 bg-[#EF3866] hover:bg-[#d32f5e] text-white rounded-xl font-medium transition-colors">
                    Manage Studio
                  </button>
                ) : (
                  <button className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-[#EF3866] hover:text-white rounded-xl font-medium transition-colors">
                    Join Live
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default RecentLivePodcasts;