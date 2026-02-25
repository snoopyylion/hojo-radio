"use client";
// app/home/podcast/LivePodcastHub.tsx

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { LiveSession, User, DatabaseLiveSession } from "@/types/podcast";
import AuthorStudioView from "./author/PodcastStudio";
import ListenerView from "./ListenerView";
import SessionCreationForm from "./author/UnifiedSessionForm";
import { supabaseClient } from "@/lib/supabase/client";
import {
   WifiOff, RefreshCw, Radio, 
  Play, Headphones, Users, ChevronRight, Flame, Clock,
  ArrowUpRight, Signal,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
interface NetworkQuality {
  quality: "high" | "medium" | "low";
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  tested: boolean;
}

interface EpisodePreview {
  id: string;
  episode_number: number;
  title: string;
  description?: string;
  cover_image_url?: string;
  duration_seconds: number;
  play_count: number;
  like_count: number;
  published_at: string;
  recording_status: string;
  podcast: { id: string; name: string; slug: string; cover_image_url?: string; author_id: string };
  season: { id: string; title: string; season_number: number };
  author: { first_name: string; last_name: string };
}

interface PodcastPreview {
  id: string;
  name: string;
  slug: string;
  description?: string;
  cover_image_url?: string;
  category: string;
  total_episodes: number;
  podcast_seasons: { count: number }[];
  host: { first_name: string; last_name: string; image_url?: string }[];
}

interface Props {
  user: User;
  liveSessions: LiveSession[];
  recentEpisodes: EpisodePreview[];
  featuredPodcasts: PodcastPreview[];
}

// ─── Helpers ──────────────────────────────────────────────────
function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Network Speed Test ───────────────────────────────────────
// Accurate measurement strategy:
//
//  LATENCY:  5 sequential HEAD pings (no body). Sequential avoids TCP
//            contention. We drop the max, take median of remaining 4.
//            This gives true RTT, not a download-polluted number.
//
//  DOWNLOAD: Fetch 4MB incompressible binary. Use ReadableStream to
//            record when the FIRST chunk arrives (TTFB). Subtract TTFB
//            from total elapsed so we measure only transfer time.
//            throughput = bytes / (elapsed − TTFB) in Mbps.
//
//  UPLOAD:   XMLHttpRequest with xhr.upload.onload event. This fires
//            when the full request BODY has been sent to the server —
//            BEFORE the server reads or responds. fetch() has no
//            equivalent hook, so XHR is the only accurate upload method.
//            Body is 2MB XOR-patterned (incompressible).

async function measureNetworkSpeed(): Promise<NetworkQuality> {

  // ── 1. Latency ───────────────────────────────────────────────
  const pingOnce = async (): Promise<number> => {
    try {
      const t0 = performance.now();
      await fetch("/api/podcast/network-test", { method: "HEAD", cache: "no-store" });
      return performance.now() - t0;
    } catch { return 9999; }
  };

  const pings: number[] = [];
  for (let i = 0; i < 5; i++) pings.push(await pingOnce());
  pings.sort((a, b) => a - b);
  const validPings = pings.slice(0, 4); // drop the max
  const latencyMs = Math.round(validPings[Math.floor(validPings.length / 2)]);

  // ── 2. Download (TTFB-corrected) ────────────────────────────
  const measureDownload = async (): Promise<number> => {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10_000);
    try {
      const t0 = performance.now();
      const res = await fetch("/api/podcast/network-test?size=large", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok || !res.body) return 0;

      const reader = res.body.getReader();
      let received = 0;
      let ttfbMs = -1;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (ttfbMs < 0) ttfbMs = performance.now() - t0; // first byte
        received += value.byteLength;
      }

      const totalSec = (performance.now() - t0) / 1000;
      // Subtract TTFB — only count pure transfer time
      const transferSec = Math.max(0.01, totalSec - (ttfbMs > 0 ? ttfbMs / 1000 : 0));
      return (received * 8) / transferSec / 1_000_000;
    } catch { return 0; }
    finally { clearTimeout(tid); }
  };

  // ── 3. Upload (XHR — fires on request body sent, not response) ─
  const measureUpload = (): Promise<number> =>
    new Promise((resolve) => {
      const BYTES = 2 * 1024 * 1024;
      const buf = new Uint8Array(BYTES);
      for (let i = 0; i < BYTES; i++) buf[i] = ((i * 0x9E3779B9) ^ (i >> 5)) & 0xFF;
      const blob = new Blob([buf], { type: "application/octet-stream" });

      const xhr = new XMLHttpRequest();
      let t0 = 0;
      let settled = false;
      const done = (mbps: number) => { if (!settled) { settled = true; resolve(mbps); } };
      const tid = setTimeout(() => done(0), 15_000);

      xhr.upload.addEventListener("loadstart", () => { t0 = performance.now(); });
      // "load" fires the instant the full body leaves the browser — before server ack
      xhr.upload.addEventListener("load", () => {
        clearTimeout(tid);
        const secs = Math.max(0.01, (performance.now() - t0) / 1000);
        done((BYTES * 8) / secs / 1_000_000);
      });
      xhr.upload.addEventListener("error", () => { clearTimeout(tid); done(0); });
      xhr.upload.addEventListener("abort", () => { clearTimeout(tid); done(0); });
      // Fallback in case upload.load never fires
      xhr.addEventListener("load", () => {
        clearTimeout(tid);
        if (!settled && t0 > 0) {
          const secs = Math.max(0.01, (performance.now() - t0) / 1000);
          done((BYTES * 8) / secs / 1_000_000);
        } else done(0);
      });

      xhr.open("POST", "/api/podcast/network-test");
      xhr.setRequestHeader("Cache-Control", "no-store");
      xhr.send(blob);
    });

  // Sequential (not parallel) — avoids bandwidth contention between tests
  const downloadMbps = await measureDownload();
  const uploadMbps   = await measureUpload();

  // ── 4. Quality ───────────────────────────────────────────────
  let quality: NetworkQuality["quality"] = "low";
  if (downloadMbps >= 15 && latencyMs < 100) quality = "high";
  else if (downloadMbps >= 3 || (downloadMbps >= 1 && latencyMs < 300)) quality = "medium";

  return {
    quality,
    downloadMbps: parseFloat(Math.max(0, downloadMbps).toFixed(1)),
    uploadMbps:   parseFloat(Math.max(0, uploadMbps).toFixed(1)),
    latencyMs,
    tested: true,
  };
}
// ─── Mini Episode Card ────────────────────────────────────────
function MiniEpisodeCard({ ep }: { ep: EpisodePreview }) {
  const cover = ep.cover_image_url || ep.podcast.cover_image_url ||
    "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&h=400&fit=crop";

  return (
    <Link
      href={`/home/podcast/${ep.podcast.slug}/episode/${ep.id}`}
      className="group flex-shrink-0 w-48 sm:w-52 block"
    >
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 mb-2.5">
        <Image src={cover} alt={ep.title} fill className="object-cover group-hover:scale-105 transition-transform duration-400" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-11 h-11 bg-[#EF3866] rounded-full flex items-center justify-center shadow-xl shadow-[#EF3866]/30">
            <Play className="w-4 h-4 text-white ml-0.5" />
          </div>
        </div>
        {/* Episode badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className="bg-[#EF3866] text-white text-[9px] font-sora font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Ep. {ep.episode_number}
          </span>
        </div>
        {/* Duration */}
        <div className="absolute bottom-2.5 right-2.5 bg-black/60 text-white text-[9px] font-sora px-1.5 py-0.5 rounded flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {formatDuration(ep.duration_seconds)}
        </div>
      </div>
      <p className="font-sora font-semibold text-xs text-gray-900 dark:text-white line-clamp-1 group-hover:text-[#EF3866] transition-colors mb-0.5">
        {ep.title}
      </p>
      <p className="font-sora text-[10px] text-gray-400 truncate">{ep.podcast.name}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="font-sora text-[10px] text-gray-400 flex items-center gap-0.5">
          <Headphones className="w-2.5 h-2.5" />{formatCount(ep.play_count)}
        </span>
        <span className="font-sora text-[10px] text-gray-400">{timeAgo(ep.published_at)}</span>
      </div>
    </Link>
  );
}

// ─── Mini Podcast Card ────────────────────────────────────────
function MiniPodcastCard({ p }: { p: PodcastPreview }) {
  const cover = p.cover_image_url ||
    "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&h=400&fit=crop";
  const hostName = p.host?.[0]
    ? `${p.host[0].first_name} ${p.host[0].last_name}`.trim()
    : "";

  return (
    <Link
      href={`/home/podcast/${p.slug}`}
      className="group flex-shrink-0 w-36 sm:w-40 block"
    >
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 mb-2.5">
        <Image src={cover} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-400" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-center justify-center">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
            <Play className="w-4 h-4 text-[#EF3866] ml-0.5" />
          </div>
        </div>
        <div className="absolute top-2 left-2">
          <span className="text-[9px] font-sora bg-black/50 text-white px-1.5 py-0.5 rounded-full capitalize">
            {p.category}
          </span>
        </div>
      </div>
      <p className="font-sora font-semibold text-xs text-gray-900 dark:text-white line-clamp-1 group-hover:text-[#EF3866] transition-colors mb-0.5">
        {p.name}
      </p>
      {hostName && (
        <p className="font-sora text-[10px] text-gray-400 truncate">{hostName}</p>
      )}
      <p className="font-sora text-[10px] text-gray-400 mt-0.5">
        {p.total_episodes} ep{p.total_episodes !== 1 ? "s" : ""}
      </p>
    </Link>
  );
}

// ─── Network Status Badge ─────────────────────────────────────
function NetworkBadge({
  net,
  isTesting,
  onTest,
}: {
  net: NetworkQuality;
  isTesting: boolean;
  onTest: () => void;
}) {
  const colorClass = {
    high: "text-emerald-500",
    medium: "text-amber-500",
    low: "text-red-500",
  }[net.quality];

  const bgClass = {
    high: "bg-emerald-500/10 border-emerald-500/20",
    medium: "bg-amber-500/10 border-amber-500/20",
    low: "bg-red-500/10 border-red-500/20",
  }[net.quality];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-sora ${bgClass}`}>
      {net.quality === "low"
        ? <WifiOff className={`w-3.5 h-3.5 ${colorClass}`} />
        : <Signal className={`w-3.5 h-3.5 ${colorClass}`} />
      }
      {net.tested ? (
        <span className={colorClass}>
          ↓{net.downloadMbps.toFixed(1)} ↑{net.uploadMbps.toFixed(1)} Mbps · {net.latencyMs}ms
        </span>
      ) : (
        <span className="text-gray-400">Testing…</span>
      )}
      <button
        onClick={onTest}
        disabled={isTesting}
        title="Re-test network"
        className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
      >
        <RefreshCw className={`w-3 h-3 ${isTesting ? "animate-spin" : ""} ${colorClass}`} />
      </button>
    </div>
  );
}

// ─── Live Session Card ────────────────────────────────────────
function LiveSessionCard({
  session,
  isOwn,
  onJoin,
}: {
  session: LiveSession;
  isOwn: boolean;
  onJoin: () => void;
}) {
  return (
    <div
      onClick={onJoin}
      className="group relative bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-gray-800/70 rounded-2xl p-5 cursor-pointer hover:border-[#EF3866]/50 hover:shadow-xl hover:shadow-[#EF3866]/5 transition-all duration-300 flex flex-col gap-4"
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF3866] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#EF3866]" />
          </span>
          <span className="text-[10px] font-sora font-bold text-[#EF3866] uppercase tracking-widest">Live</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-sora text-gray-400">
          <Users className="w-3 h-3" />
          <span>{session.listenerCount}</span>
        </div>
      </div>

      {/* Title */}
      <div>
        <h3 className="font-sora font-semibold text-base text-gray-900 dark:text-white line-clamp-2 group-hover:text-[#EF3866] transition-colors leading-snug">
          {session.title}
        </h3>
        <p className="text-xs font-sora text-gray-400 mt-1">by {session.authorName}</p>
        {session.description && (
          <p className="text-xs font-sora text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
            {session.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800/60 mt-auto">
        <span className="text-[10px] font-sora text-gray-400">
          {new Date(session.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span
          className={`px-3.5 py-1.5 rounded-full text-[10px] font-sora font-bold uppercase tracking-wider transition-all duration-200 ${
            isOwn
              ? "bg-[#EF3866] text-white"
              : "bg-gray-900 dark:bg-white text-white dark:text-black group-hover:bg-[#EF3866] group-hover:text-white"
          }`}
        >
          {isOwn ? "Manage" : "Listen"}
        </span>
      </div>
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  href,
  linkLabel = "See all",
}: {
  icon: React.ComponentType<{ className: string }>;
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-[#EF3866]/10 rounded-xl flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#EF3866]" />
        </div>
        <div>
          <h2 className="font-sora font-semibold text-lg text-gray-900 dark:text-white leading-tight">{title}</h2>
          {subtitle && <p className="text-xs font-sora text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-xs font-sora font-medium text-[#EF3866] hover:underline"
        >
          {linkLabel}
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

// ─── Scrollable Row ────────────────────────────────────────────
function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex gap-4 overflow-x-auto pb-3"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════
export default function LivePodcastHub({
  user,
  liveSessions: initialSessions,
  recentEpisodes,
  featuredPodcasts,
}: Props) {
  const router = useRouter();
  const supabase = supabaseClient;

  const [liveSessions, setLiveSessions] = useState<LiveSession[]>(initialSessions);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [mode, setMode] = useState<"browse" | "create" | "listen" | "manage">("browse");
  const [userSession, setUserSession] = useState<LiveSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>({
    quality: "medium",
    downloadMbps: 0,
    uploadMbps: 0,
    latencyMs: 0,
    tested: false,
  });
  const [isTesting, setIsTesting] = useState(false);

  // ── Real network speed test ──────────────────────────────────
  const runNetworkTest = useCallback(async () => {
    if (isTesting) return;
    setIsTesting(true);
    try {
      const result = await measureNetworkSpeed();
      setNetworkQuality(result);
    } catch {
      setNetworkQuality((prev) => ({ ...prev, quality: "low", tested: true }));
    } finally {
      setIsTesting(false);
    }
  }, [isTesting]);

  useEffect(() => {
    runNetworkTest();
    const id = setInterval(runNetworkTest, 45_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Realtime ─────────────────────────────────────────────────
  useEffect(() => {
    const channelName = `live-sessions-hub-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions", filter: "is_active=eq.true" },
        (payload: RealtimePostgresChangesPayload<DatabaseLiveSession>) => {
          const tx = (db: DatabaseLiveSession): LiveSession => ({
            id: db.id, authorId: db.author_id, authorName: db.author_name,
            title: db.title, description: db.description || "",
            roomName: db.room_name, startedAt: db.started_at,
            listenerCount: db.listener_count || 0, isActive: db.is_active,
          });
          if (payload.eventType === "INSERT") {
            setLiveSessions((p) => {
              if (p.some((s) => s.id === payload.new.id)) return p;
              return [tx(payload.new), ...p];
            });
          } else if (payload.eventType === "UPDATE") {
            setLiveSessions((p) => p.map((s) => s.id === payload.new.id ? tx(payload.new) : s));
          } else if (payload.eventType === "DELETE") {
            setLiveSessions((p) => p.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => setIsConnected(status === "SUBSCRIBED"));

    // Refresh on connect
    supabase
      .from("live_sessions")
      .select("*")
      .eq("is_active", true)
      .order("started_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        setLiveSessions(data.map((db: DatabaseLiveSession) => ({
          id: db.id, authorId: db.author_id, authorName: db.author_name,
          title: db.title, description: db.description || "",
          roomName: db.room_name, startedAt: db.started_at,
          listenerCount: db.listener_count || 0, isActive: db.is_active,
        })));
      });

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  useEffect(() => {
    setUserSession(liveSessions.find((s) => s.authorId === user.id && s.isActive) || null);
  }, [liveSessions, user.id]);

  // ── Actions ──────────────────────────────────────────────────
  const joinSession = async (session: LiveSession) => {
    if (networkQuality.quality === "low") {
      const go = window.confirm(
        `Your connection is weak (↓${networkQuality.downloadMbps} Mbps, ${networkQuality.latencyMs}ms). Audio quality may be reduced. Continue?`
      );
      if (!go) return;
    }
    setSelectedSession(session);
    setMode(session.authorId === user.id ? "manage" : "listen");
  };

  const backToBrowse = () => { setMode("browse"); setSelectedSession(null); };
  const handleSessionEnd = () => { setUserSession(null); setMode("browse"); setSelectedSession(null); };
  const handleSessionCreated = (session: LiveSession) => {
    setUserSession(session); setSelectedSession(session); setMode("manage");
  };

  // ── Sub-view renders ─────────────────────────────────────────
  const backBtn = (label: string) => (
    <button
      onClick={backToBrowse}
      className="mb-8 inline-flex items-center gap-2 text-xs font-sora font-medium text-gray-400 hover:text-[#EF3866] transition-colors group"
    >
      <ChevronRight className="w-4 h-4 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
      {label}
    </button>
  );

  if (mode === "create") {
    return (
      <div className="min-h-screen bg-white dark:bg-black font-sora">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {backBtn("Back to Live")}
          <SessionCreationForm
            user={user}
            onCancel={backToBrowse}
            onSessionCreated={handleSessionCreated}
            onEpisodeCreated={(episodeId) => router.push(`/home/podcast/episode/${episodeId}/upload`)}
          />
        </div>
      </div>
    );
  }

  if (mode === "manage" && selectedSession?.authorId === user.id) {
    return (
      <div className="min-h-screen bg-white dark:bg-black font-sora">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {backBtn("Back to Live")}
          <AuthorStudioView
            {...({ session: selectedSession, user, onEndSession: handleSessionEnd, networkQuality: networkQuality.quality } as React.ComponentProps<typeof AuthorStudioView>)}
          />
        </div>
      </div>
    );
  }

  if (mode === "listen" && selectedSession) {
    return (
      <div className="min-h-screen bg-white dark:bg-black font-sora">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {backBtn("Back to Live")}
          <ListenerView
            {...({ session: selectedSession, user, onEndSession: handleSessionEnd, networkQuality: networkQuality.quality } as React.ComponentProps<typeof ListenerView>)}
          />
        </div>
      </div>
    );
  }

  // ── Browse view ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white dark:bg-black font-sora">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-1.5 h-5 bg-[#EF3866] rounded-full" />
              <p className="text-xs font-sora font-medium text-[#EF3866] uppercase tracking-widest">Hojo Media</p>
            </div>
            <h1 className="font-sora font-semibold text-3xl sm:text-4xl text-gray-900 dark:text-white">
              Podcast Hub
            </h1>

            {/* Status row */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {/* Live dot */}
              <div className="flex items-center gap-1.5">
                <span className={`relative flex h-2 w-2`}>
                  {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF3866] opacity-75" />}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? "bg-[#EF3866]" : "bg-gray-400"}`} />
                </span>
                <span className="text-xs font-sora text-gray-400">
                  {isConnected ? "Realtime connected" : "Connecting…"}
                </span>
              </div>

              <span className="w-px h-3 bg-gray-200 dark:bg-gray-700" />

              {/* Network badge */}
              <NetworkBadge net={networkQuality} isTesting={isTesting} onTest={runNetworkTest} />
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Link
              href="/home/podcast/recorded"
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-sora font-medium text-gray-600 dark:text-gray-300 hover:border-[#EF3866] hover:text-[#EF3866] transition-all duration-200"
            >
              Browse Podcasts
            </Link>
            {user.role === "author" && !userSession && (
              <button
                onClick={() => setMode("create")}
                className="px-5 py-2.5 rounded-xl bg-[#EF3866] hover:bg-[#d12b56] text-white text-sm font-sora font-semibold transition-all duration-200 shadow-md shadow-[#EF3866]/20 active:scale-95"
              >
                Start Broadcasting
              </button>
            )}
          </div>
        </div>

        {/* ── Network warning ── */}
        {/* {networkQuality.quality === "low" && networkQuality.tested && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 mb-8">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-sora font-semibold text-sm text-amber-800 dark:text-amber-300">Weak connection detected</p>
              <p className="font-sora text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Download {networkQuality.downloadMbps} Mbps · {networkQuality.latencyMs}ms latency. Live audio may drop or use reduced quality.
              </p>
            </div>
          </div>
        )} */}

        {/* ── Your active session banner ── */}
        {userSession && (
          <div className="relative overflow-hidden bg-[#EF3866] text-white rounded-2xl p-6 sm:p-8 mb-10 shadow-xl shadow-[#EF3866]/20">
            {/* Decorative rings */}
            <div className="absolute -top-8 -right-8 w-40 h-40 border-2 border-white/10 rounded-full" />
            <div className="absolute -top-4 -right-4 w-24 h-24 border-2 border-white/10 rounded-full" />

            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                  </span>
                  <span className="text-[10px] font-sora font-bold uppercase tracking-widest opacity-80">Your Live Session</span>
                </div>
                <h3 className="font-sora font-semibold text-xl sm:text-2xl leading-tight">{userSession.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm opacity-80">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{userSession.listenerCount} listeners</span>
                  <span>Started {new Date(userSession.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
              <button
                onClick={() => joinSession(userSession)}
                className="flex-shrink-0 bg-white text-[#EF3866] hover:bg-gray-50 px-6 py-3 rounded-xl text-sm font-sora font-bold transition-colors shadow-lg"
              >
                Manage Studio
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            LIVE SESSIONS
        ══════════════════════════════════════ */}
        <section className="mb-14">
          <div className="flex items-end justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#EF3866]/10 rounded-xl flex items-center justify-center">
                <Radio className="w-4 h-4 text-[#EF3866]" />
              </div>
              <div>
                <h2 className="font-sora font-semibold text-lg text-gray-900 dark:text-white leading-tight">
                  Live Now
                </h2>
                <p className="text-xs font-sora text-gray-400">
                  {liveSessions.length} active session{liveSessions.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {user.role === "author" && (
              <Link
                href="/home/podcast/create"
                className="flex items-center gap-1 text-xs font-sora font-medium text-[#EF3866] hover:underline"
              >
                + New Podcast
              </Link>
            )}
          </div>

          {liveSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                <Radio className="w-6 h-6 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="font-sora text-sm text-gray-500 dark:text-gray-400 font-medium">No live podcasts right now</p>
              <p className="font-sora text-xs text-gray-400 dark:text-gray-500 mt-1">Be the first to go live and share your voice</p>
              {user.role === "author" && (
                <button
                  onClick={() => setMode("create")}
                  className="mt-5 px-5 py-2.5 bg-[#EF3866] hover:bg-[#d12b56] text-white text-xs font-sora font-semibold rounded-xl transition-colors shadow-md shadow-[#EF3866]/20"
                >
                  Start Your First Session
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveSessions.map((session) => (
                <LiveSessionCard
                  key={session.id}
                  session={session}
                  isOwn={session.authorId === user.id}
                  onJoin={() => joinSession(session)}
                />
              ))}
            </div>
          )}

          {/* Stats row */}
          {liveSessions.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6 p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800/60">
              {[
                { label: "Live Sessions", value: liveSessions.length, accent: true },
                { label: "Total Listeners", value: liveSessions.reduce((t, s) => t + s.listenerCount, 0), accent: false },
                { label: "Available to Join", value: liveSessions.filter((s) => s.authorId !== user.id).length, accent: false },
              ].map(({ label, value, accent }) => (
                <div key={label} className="text-center">
                  <p className={`font-sora font-bold text-2xl ${accent ? "text-[#EF3866]" : "text-gray-900 dark:text-white"}`}>
                    {value}
                  </p>
                  <p className="font-sora text-[10px] text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════
            LATEST EPISODES
        ══════════════════════════════════════ */}
        {recentEpisodes.length > 0 && (
          <section className="mb-14">
            <SectionHeader
              icon={Flame}
              title="Latest Episodes"
              subtitle="Fresh drops from your favourite creators"
              href="/home/podcast/recorded"
              linkLabel="See all episodes"
            />
            <ScrollRow>
              {recentEpisodes.map((ep) => (
                <MiniEpisodeCard key={ep.id} ep={ep} />
              ))}
            </ScrollRow>
          </section>
        )}

        {/* ══════════════════════════════════════
            FEATURED SHOWS
        ══════════════════════════════════════ */}
        {featuredPodcasts.length > 0 && (
          <section className="mb-14">
            <SectionHeader
              icon={Headphones}
              title="Featured Shows"
              subtitle="Explore the podcast library"
              href="/home/podcast/recorded"
              linkLabel="Browse all shows"
            />
            <ScrollRow>
              {featuredPodcasts.map((p) => (
                <MiniPodcastCard key={p.id} p={p} />
              ))}
            </ScrollRow>
          </section>
        )}

      </div>
    </div>
  );
}