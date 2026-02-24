"use client";

// app/home/podcast/[slug]/episode/[episodeId]/EpisodePlayerView.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Heart, Bookmark, Share2, ChevronLeft, Clock, Headphones,
  RotateCcw, RotateCw, Radio, Mic, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

interface EpisodeData {
  id: string;
  title: string;
  audio_url: string;
  duration_seconds: number;
  episode_number: number;
  cover_image_url?: string;
  like_count?: number;
  play_count?: number;
  description?: string;
  podcast: {
    slug: string;
    name: string;
    cover_image_url?: string;
    host?: {
      first_name?: string;
      last_name?: string;
    };
  };
  season: {
    title: string;
  };
}

interface EpisodePlayerViewProps {
  episode: EpisodeData;
  prevEpisode: { id: string; episode_number: number; title: string; duration_seconds: number } | null;
  nextEpisode: { id: string; episode_number: number; title: string; duration_seconds: number } | null;
  currentUserId: string;
  isOwner: boolean;
}

function formatTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function EpisodePlayerView({
  episode,
  prevEpisode,
  nextEpisode,
}: EpisodePlayerViewProps) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(episode.duration_seconds || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isDragging, ] = useState(false);

  // Engagement
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(episode.like_count || 0);

  const podcast = episode.podcast;
  const season = episode.season;
  const hostName = `${podcast.host?.first_name ?? ""} ${podcast.host?.last_name ?? ""}`.trim();
  const coverUrl =
    episode.cover_image_url ||
    podcast.cover_image_url ||
    "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&h=800&fit=crop";

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── Audio setup ──────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio(episode.audio_url);
    audioRef.current = audio;
    audio.preload = "metadata";

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
      setIsLoading(false);
    });
    audio.addEventListener("timeupdate", () => {
      if (!isDragging) setCurrentTime(audio.currentTime);
    });
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      if (nextEpisode) router.push(`/home/podcast/${podcast.slug}/episode/${nextEpisode.id}`);
    });
    audio.addEventListener("waiting", () => setIsLoading(true));
    audio.addEventListener("canplay", () => setIsLoading(false));

    return () => {
      audio.pause();
      audio.src = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode.audio_url]);

  // ── Engagement fetch ─────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch(`/api/podcast/episode/${episode.id}/like`).then((r) => r.json()),
      fetch(`/api/podcast/episode/${episode.id}/bookmark`).then((r) => r.json()),
    ]).then(([likes, bookmarks]) => {
      setIsLiked(likes.hasLiked || false);
      setLikeCount(likes.likeCount ?? episode.like_count);
      setIsBookmarked(bookmarks.hasBookmarked || false);
    }).catch(() => {});
  }, [episode.id]);

  // ── Controls ─────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().then(() => setIsPlaying(true)).catch(console.error); }
  }, [isPlaying]);

  const seekTo = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const t = (pct / 100) * audio.duration;
    audio.currentTime = t;
    setCurrentTime(t);
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
  }, [seekTo]);

  const skip = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
  }, []);

  const handleVolumeChange = useCallback((val: number) => {
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val;
    if (val > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !isMuted;
    setIsMuted(next);
    audio.volume = next ? 0 : volume;
  }, [isMuted, volume]);

  const cycleSpeed = useCallback(() => {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, [playbackRate]);

  const handleLike = useCallback(async () => {
    const prev = { isLiked, likeCount };
    setIsLiked((v) => !v);
    setLikeCount((v) => (isLiked ? v - 1 : v + 1));
    try {
      const data = await fetch(`/api/podcast/episode/${episode.id}/like`, { method: "POST" }).then((r) => r.json());
      setIsLiked(data.liked ?? prev.isLiked);
      setLikeCount(data.likeCount ?? prev.likeCount);
    } catch {
      setIsLiked(prev.isLiked);
      setLikeCount(prev.likeCount);
    }
  }, [episode.id, isLiked, likeCount]);

  const handleBookmark = useCallback(async () => {
    setIsBookmarked((v) => !v);
    try {
      const data = await fetch(`/api/podcast/episode/${episode.id}/bookmark`, { method: "POST" }).then((r) => r.json());
      setIsBookmarked(data.bookmarked ?? false);
      toast.success(data.bookmarked ? "Saved!" : "Removed from saved");
    } catch { setIsBookmarked((v) => !v); }
  }, [episode.id]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: episode.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied!"); }
    } catch {}
  }, [episode.title]);

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sora">
      {/* ── Full-bleed background blur from cover ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <Image
          src={coverUrl}
          alt=""
          fill
          className="object-cover opacity-[0.04] dark:opacity-[0.06] blur-3xl scale-110"
          aria-hidden
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* ── Back nav ── */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-sora font-medium text-gray-400 hover:text-[#EF3866] transition-colors mb-8 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>{podcast.name}</span>
        </button>

        {/* ── Main two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_460px] gap-8 lg:gap-12 items-start">

          {/* ── LEFT: Player ── */}
          <div className="flex flex-col items-center lg:items-start">

            {/* Cover Art */}
            <div className="relative w-full max-w-sm mx-auto lg:mx-0 aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-black/20 dark:shadow-black/60 mb-8">
              <Image src={coverUrl} alt={episode.title} fill className="object-cover" />

              {/* Playing shimmer ring */}
              {isPlaying && (
                <div className="absolute inset-0 rounded-3xl ring-2 ring-[#EF3866]/30 animate-pulse" />
              )}

              {isLoading && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded-3xl">
                  <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}

              {/* Episode badge */}
              <div className="absolute top-4 left-4">
                <span className="bg-[#EF3866] text-white text-[10px] font-sora font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Ep. {episode.episode_number}
                </span>
              </div>
            </div>

            {/* Episode meta */}
            <div className="w-full max-w-sm mx-auto lg:mx-0 mb-6">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-[10px] font-sora text-gray-400 mb-3 flex-wrap">
                <Link href={`/home/podcast/${podcast.slug}`} className="hover:text-[#EF3866] transition-colors truncate max-w-[100px]">
                  {podcast.name}
                </Link>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[100px]">{season.title}</span>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                <span>Episode {episode.episode_number}</span>
              </div>

              <h1 className="font-sora font-semibold text-2xl sm:text-3xl text-gray-900 dark:text-white leading-tight mb-2">
                {episode.title}
              </h1>

              {hostName && (
                <p className="text-sm font-sora text-gray-400 mb-3">{hostName}</p>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-4 text-xs font-sora text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-[#EF3866]" />
                  {formatCount(episode.play_count || 0)} plays
                </span>
                <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#EF3866]" />
                  {formatTime(episode.duration_seconds)}
                </span>
              </div>
            </div>

            {/* ── Progress Bar ── */}
            <div className="w-full max-w-sm mx-auto lg:mx-0 mb-6">
              <div
                ref={progressRef}
                className="relative h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full cursor-pointer group"
                onClick={handleProgressClick}
              >
                {/* Buffered bg */}
                <div className="absolute inset-0 rounded-full bg-gray-100 dark:bg-gray-800" />
                {/* Progress */}
                <div
                  className="absolute top-0 left-0 h-full bg-[#EF3866] rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
                {/* Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-[#EF3866] rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-[#EF3866]/30"
                  style={{ left: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-sora text-gray-400 mt-1.5">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* ── Playback Controls ── */}
            <div className="w-full max-w-sm mx-auto lg:mx-0 mb-6">
              {/* Speed + volume row */}
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={cycleSpeed}
                  className="flex-shrink-0 w-10 text-center text-[11px] font-sora font-bold text-gray-500 dark:text-gray-400 hover:text-[#EF3866] transition-colors bg-gray-100 dark:bg-gray-800 rounded-lg px-2 py-1"
                >
                  {playbackRate}×
                </button>

                <div className="flex-1 flex items-center gap-2">
                  <button onClick={toggleMute} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors flex-shrink-0">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="flex-1 h-1 accent-[#EF3866] cursor-pointer"
                  />
                </div>
              </div>

              {/* Main controls row */}
              <div className="flex items-center justify-between">
                {/* Prev episode */}
                <button
                  onClick={() => prevEpisode && router.push(`/home/podcast/${podcast.slug}/episode/${prevEpisode.id}`)}
                  disabled={!prevEpisode}
                  className="p-2 text-gray-400 disabled:opacity-20 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title="Previous episode"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                {/* Rewind 15s */}
                <button
                  onClick={() => skip(-15)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors relative"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span className="absolute bottom-0.5 right-0.5 text-[7px] font-sora font-bold text-gray-400">15</span>
                </button>

                {/* Play / Pause */}
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 bg-[#EF3866] hover:bg-[#d12b56] text-white rounded-full flex items-center justify-center shadow-xl shadow-[#EF3866]/25 transition-all duration-150 active:scale-95"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-0.5" />
                  )}
                </button>

                {/* Forward 30s */}
                <button
                  onClick={() => skip(30)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors relative"
                >
                  <RotateCw className="w-5 h-5" />
                  <span className="absolute bottom-0.5 right-0.5 text-[7px] font-sora font-bold text-gray-400">30</span>
                </button>

                {/* Next episode */}
                <button
                  onClick={() => nextEpisode && router.push(`/home/podcast/${podcast.slug}/episode/${nextEpisode.id}`)}
                  disabled={!nextEpisode}
                  className="p-2 text-gray-400 disabled:opacity-20 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title="Next episode"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ── Engagement ── */}
            <div className="w-full max-w-sm mx-auto lg:mx-0 flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800/60">
              <button onClick={handleLike} className="flex items-center gap-2 group">
                <Heart
                  className={`w-5 h-5 transition-all duration-150 group-hover:scale-110 ${
                    isLiked ? "fill-[#EF3866] text-[#EF3866]" : "text-gray-400 group-hover:text-[#EF3866]"
                  }`}
                />
                <span className={`text-sm font-sora ${isLiked ? "text-[#EF3866]" : "text-gray-400"}`}>
                  {formatCount(likeCount)}
                </span>
              </button>

              <button onClick={handleBookmark} className="group p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Bookmark
                  className={`w-5 h-5 transition-colors ${
                    isBookmarked ? "fill-gray-900 dark:fill-white text-gray-900 dark:text-white" : "text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200"
                  }`}
                />
              </button>

              <button onClick={handleShare} className="group p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Share2 className="w-5 h-5 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
              </button>
            </div>
          </div>

          {/* ── RIGHT: Info panel ── */}
          <div className="w-full lg:sticky lg:top-8 space-y-5">

            {/* About this episode */}
            {episode.description && (
              <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/60 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-4 bg-[#EF3866] rounded-full" />
                  <h3 className="text-xs font-sora font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                    About this episode
                  </h3>
                </div>
                <p className="text-sm font-sora text-gray-600 dark:text-gray-400 leading-relaxed">
                  {episode.description}
                </p>
              </div>
            )}

            {/* Podcast info card */}
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/60 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-4 bg-[#EF3866] rounded-full" />
                <h3 className="text-xs font-sora font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                  The Show
                </h3>
              </div>
              <Link href={`/home/podcast/${podcast.slug}`} className="flex items-center gap-3 group">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    src={podcast.cover_image_url || coverUrl}
                    alt={podcast.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sora font-semibold text-sm text-gray-900 dark:text-white group-hover:text-[#EF3866] transition-colors truncate">
                    {podcast.name}
                  </p>
                  {hostName && (
                    <p className="text-xs font-sora text-gray-400 mt-0.5 flex items-center gap-1">
                      <Mic className="w-3 h-3" />
                      {hostName}
                    </p>
                  )}
                  <p className="text-xs font-sora text-gray-300 dark:text-gray-600 mt-0.5 flex items-center gap-1">
                    <Radio className="w-3 h-3" />
                    {season.title}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-[#EF3866] transition-colors flex-shrink-0" />
              </Link>
            </div>

            {/* Navigation: Prev / Next */}
            {(prevEpisode || nextEpisode) && (
              <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/60 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1 h-4 bg-[#EF3866] rounded-full" />
                  <h3 className="text-xs font-sora font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                    More Episodes
                  </h3>
                </div>

                {prevEpisode && (
                  <Link
                    href={`/home/podcast/${podcast.slug}/episode/${prevEpisode.id}`}
                    className="flex items-center gap-3 group p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center group-hover:bg-[#EF3866]/10 transition-colors">
                      <SkipBack className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#EF3866] transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-sora text-gray-400 mb-0.5">Previous</p>
                      <p className="text-xs font-sora font-medium text-gray-700 dark:text-gray-300 group-hover:text-[#EF3866] transition-colors truncate">
                        {prevEpisode.title}
                      </p>
                    </div>
                    <span className="text-[10px] font-sora text-gray-400 flex-shrink-0">
                      {formatTime(prevEpisode.duration_seconds)}
                    </span>
                  </Link>
                )}

                {nextEpisode && (
                  <Link
                    href={`/home/podcast/${podcast.slug}/episode/${nextEpisode.id}`}
                    className="flex items-center gap-3 group p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#EF3866]/10 flex items-center justify-center">
                      <SkipForward className="w-3.5 h-3.5 text-[#EF3866]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-sora text-[#EF3866] mb-0.5">Up Next</p>
                      <p className="text-xs font-sora font-medium text-gray-700 dark:text-gray-300 group-hover:text-[#EF3866] transition-colors truncate">
                        {nextEpisode.title}
                      </p>
                    </div>
                    <span className="text-[10px] font-sora text-gray-400 flex-shrink-0">
                      {formatTime(nextEpisode.duration_seconds)}
                    </span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}