"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Heart,
  Play,
  Pause,
  Bookmark,
  Share2,
  Clock,
  Headphones,
  Radio,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────
interface PodcastEpisode {
  id: string;
  episode_number: number;
  title: string;
  description?: string;
  audio_url: string;
  cover_image_url?: string;
  duration_seconds: number;
  play_count: number;
  like_count: number;
  published_at: string;
  is_published: boolean;
  recording_status: "pending" | "recording" | "processing" | "ready" | "failed";
  podcast: {
    id: string;
    name: string;
    slug: string;
    cover_image_url?: string;
    author_id: string;
  };
  season: {
    id: string;
    title: string;
    season_number: number;
  };
  author: {
    first_name: string;
    last_name: string;
  };
}

interface PodcastTileProps {
  episode: PodcastEpisode;
}

// ─── Helpers ─────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Audio Player Hook ────────────────────────────────────────
function useAudioPlayer(audioUrl: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!audioUrl) return;
    setIsLoading(true);
    setError(null);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => { setDuration(audio.duration); setIsLoading(false); });
    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    });
    audio.addEventListener("ended", () => setIsPlaying(false));
    audio.addEventListener("error", () => { setError("Failed to load audio."); setIsLoading(false); });
    audio.addEventListener("canplaythrough", () => setIsLoading(false));

    return () => { audio.pause(); audio.src = ""; audio.load(); };
  }, [audioUrl]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || error) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => toast.error("Failed to play audio."));
    }
  }, [isPlaying, error]);

  const seek = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || error) return;
    audio.currentTime = (pct / 100) * audio.duration;
  }, [error]);

  return { isPlaying, progress, currentTime, duration, isLoading, error, toggle, seek };
}

// ─── Main Component ───────────────────────────────────────────
export default function PodcastTile({ episode }: PodcastTileProps) {
  const router = useRouter();

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(episode.like_count);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const elementRef = useRef<HTMLDivElement>(null);

  const { isPlaying, progress, currentTime, duration, isLoading, error, toggle, seek } =
    useAudioPlayer(episode.audio_url);

  const authorName = `${episode.author.first_name} ${episode.author.last_name}`.trim();
  const coverUrl =
    episode.cover_image_url ||
    episode.podcast.cover_image_url ||
    "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&h=600&fit=crop";

  // Intersection observer for lazy engagement fetch
  useEffect(() => {
    if (!elementRef.current || isInitialized) return;
    const el = elementRef.current;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchEngagement(); },
      { threshold: 0.1, rootMargin: "50px" }
    );
    observer.observe(el);
    return () => observer.unobserve(el);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  const fetchEngagement = useCallback(async () => {
    try {
      const [likeRes, bookmarkRes] = await Promise.all([
        fetch(`/api/podcast/episode/${episode.id}/like`).then((r) => r.json()),
        fetch(`/api/podcast/episode/${episode.id}/bookmark`).then((r) => r.json()),
      ]);
      setIsLiked(likeRes.hasLiked || false);
      setLikeCount(likeRes.likeCount ?? episode.like_count);
      setIsBookmarked(bookmarkRes.hasBookmarked || false);
      setIsInitialized(true);
    } catch { setIsInitialized(true); }
  }, [episode.id, episode.like_count]);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (isLikeLoading) return;
    const prev = { isLiked, likeCount };
    setIsLiked((v) => !v);
    setLikeCount((v) => (isLiked ? v - 1 : v + 1));
    setIsLikeLoading(true);
    try {
      const data = await fetch(`/api/podcast/episode/${episode.id}/like`, { method: "POST" }).then((r) => r.json());
      setIsLiked(data.liked ?? prev.isLiked);
      setLikeCount(data.likeCount ?? prev.likeCount);
    } catch {
      setIsLiked(prev.isLiked);
      setLikeCount(prev.likeCount);
      toast.error("Failed to like episode");
    } finally { setIsLikeLoading(false); }
  }, [episode.id, isLiked, likeCount, isLikeLoading]);

  const handleBookmark = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsBookmarked((v) => !v);
    try {
      const data = await fetch(`/api/podcast/episode/${episode.id}/bookmark`, { method: "POST" }).then((r) => r.json());
      setIsBookmarked(data.bookmarked ?? false);
      toast.success(data.bookmarked ? "Saved!" : "Removed from saved");
    } catch {
      setIsBookmarked((v) => !v);
      toast.error("Failed to save episode");
    }
  }, [episode.id]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const url = `${window.location.origin}/home/podcast/${episode.podcast.slug}/episode/${episode.id}`;
    try {
      if (navigator.share) await navigator.share({ title: episode.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied!"); }
    } catch { toast.error("Share failed"); }
  }, [episode]);

  const handleNavigate = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input")) return;
    router.push(`/home/podcast/${episode.podcast.slug}/episode/${episode.id}`);
  }, [router, episode]);

  const handlePlay = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (error) { toast.error("Cannot play: Audio file unavailable"); return; }
    toggle();
    if (!isPlaying) {
      fetch(`/api/podcast/episode/${episode.id}/play`, { method: "POST" }).catch(() => {});
    }
  }, [toggle, isPlaying, episode.id, error]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (error) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
  }, [seek, error]);

  const displayDuration = duration > 0 ? duration : episode.duration_seconds;

  return (
    <article
      ref={elementRef}
      onClick={handleNavigate}
      className="group relative bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-gray-800/60 rounded-2xl overflow-hidden cursor-pointer hover:border-[#EF3866]/40 hover:shadow-lg hover:shadow-[#EF3866]/5 transition-all duration-300"
    >
      {/* ── Cover image with overlay controls ── */}
      <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-900 overflow-hidden">
        <Image
          src={coverUrl}
          alt={episode.title}
          fill
          className="object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
        />

        {/* Dark gradient bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

        {/* Top row: episode badge + duration */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="bg-[#EF3866] text-white text-[9px] font-sora font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Ep. {episode.episode_number}
          </span>
          <span className="bg-black/50 backdrop-blur-sm text-white text-[9px] font-sora px-2 py-0.5 rounded-full flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatDuration(displayDuration)}
          </span>
        </div>

        {/* Center play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
          <button
            onClick={handlePlay}
            disabled={isLoading || !!error}
            className={`w-14 h-14 bg-[#EF3866] rounded-full flex items-center justify-center shadow-2xl shadow-[#EF3866]/40 transition-transform duration-200 active:scale-95 ${
              isLoading || error ? "opacity-50 cursor-not-allowed" : "scale-90 group-hover:scale-100"
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>
        </div>

        {/* Bottom left: podcast name + season */}
        <div className="absolute bottom-3 left-3 right-12">
          <div className="flex items-center gap-1 mb-0.5">
            <Radio className="w-2.5 h-2.5 text-[#EF3866]" />
            <span className="text-white/80 text-[10px] font-sora truncate">{episode.podcast.name}</span>
          </div>
          <p className="text-white/50 text-[9px] font-sora">
            {episode.season.title} · {formatTimeAgo(episode.published_at)} ago
          </p>
        </div>

        {/* Bookmark (pinned to bottom right of image) */}
        <button
          onClick={handleBookmark}
          className="absolute bottom-3 right-3 w-7 h-7 bg-black/40 backdrop-blur-sm hover:bg-black/60 rounded-full flex items-center justify-center transition-colors"
        >
          <Bookmark
            className={`w-3.5 h-3.5 ${isBookmarked ? "fill-white text-white" : "text-white/70"}`}
          />
        </button>
      </div>

      {/* ── Compact audio progress bar ── */}
      <div className="px-3 pt-2.5" onClick={(e) => e.stopPropagation()}>
        <div
          className={`relative h-0.5 rounded-full bg-gray-100 dark:bg-gray-800 ${!error ? "cursor-pointer" : "cursor-not-allowed"}`}
          onClick={handleSeek}
        >
          <div
            className="absolute top-0 left-0 h-full bg-[#EF3866] rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-sora text-gray-400 mt-1">
          <span>{formatDuration(Math.floor(currentTime))}</span>
          <span>{error ? "Unavailable" : formatDuration(displayDuration)}</span>
        </div>
      </div>

      {/* ── Episode info ── */}
      <div className="px-3 pt-1.5 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-sora font-semibold text-sm text-gray-900 dark:text-white leading-snug line-clamp-1">
              {episode.title}
            </p>
            <p className="text-xs font-sora text-gray-400 mt-0.5 truncate">by {authorName}</p>
          </div>

          {/* Small play button (always visible) */}
          <button
            onClick={handlePlay}
            disabled={isLoading || !!error}
            className={`flex-shrink-0 w-8 h-8 bg-[#EF3866] rounded-full flex items-center justify-center shadow-md shadow-[#EF3866]/20 transition-all active:scale-95 ${
              isLoading || error ? "opacity-40 cursor-not-allowed" : "hover:bg-[#d12b56]"
            }`}
          >
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-3.5 h-3.5 text-white" />
            ) : (
              <Play className="w-3.5 h-3.5 text-white ml-0.5" />
            )}
          </button>
        </div>

        {episode.description && (
          <p className="text-[11px] font-sora text-gray-400 dark:text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
            {episode.description}
          </p>
        )}
      </div>

      {/* ── Action row ── */}
      <div className="flex items-center justify-between px-3 pb-3 pt-0.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          {/* Like */}
          <button
            onClick={handleLike}
            disabled={isLikeLoading}
            className={`flex items-center gap-1 group/like transition-opacity ${isLikeLoading ? "opacity-50" : ""}`}
          >
            <Heart
              className={`w-4 h-4 transition-all duration-150 group-hover/like:scale-110 ${
                isLiked ? "fill-[#EF3866] text-[#EF3866]" : "text-gray-400 dark:text-gray-500"
              }`}
            />
            <span className={`text-[10px] font-sora ${isLiked ? "text-[#EF3866]" : "text-gray-400"}`}>
              {formatCount(likeCount)}
            </span>
          </button>

          {/* Plays */}
          <div className="flex items-center gap-1 text-gray-300 dark:text-gray-600">
            <Headphones className="w-3.5 h-3.5" />
            <span className="text-[10px] font-sora text-gray-400">{formatCount(episode.play_count)}</span>
          </div>
        </div>

        {/* Share */}
        <button
          onClick={handleShare}
          className="w-7 h-7 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full flex items-center justify-center transition-colors"
        >
          <Share2 className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
        </button>
      </div>
    </article>
  );
}