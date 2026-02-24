"use client";

// app/home/podcast/[slug]/PodcastDetailView.tsx

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Headphones,
  Radio,
  Mic,
  Calendar,
  Share2,
  MoreHorizontal,
  Plus,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

interface Host {
  first_name: string;
  last_name: string;
  image_url?: string;
}

interface Podcast {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description?: string;
  cover_image_url?: string;
  category: string;
  tags: string[];
  total_episodes: number;
  created_at: string;
  host: Host;
}

interface Season {
  id: string;
  season_number: number;
  title: string;
  description?: string;
  cover_image_url?: string;
  episode_count: number;
}

interface Episode {
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
  season_id: string;
  season: { id: string; title: string; season_number: number };
}

interface Props {
  podcast: Podcast;
  seasons: Season[];
  episodes: Episode[];
  currentUserId: string;
  isOwner: boolean;
}

function formatDuration(s: number) {
  if (!s) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Episode Row ───────────────────────────────────────────────
function EpisodeRow({
  episode,
  podcastSlug,
}: {
  episode: Episode;
  podcastSlug: string;
  index: number;
}) {
  return (
    <Link
      href={`/home/podcast/${podcastSlug}/episode/${episode.id}`}
      className="group flex items-start gap-4 px-4 py-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900/60 transition-all duration-150"
    >
      {/* Number / cover */}
      <div className="relative flex-shrink-0">
        {episode.cover_image_url ? (
          <div className="relative w-12 h-12 rounded-xl overflow-hidden">
            <Image src={episode.cover_image_url} alt={episode.title} fill className="object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors rounded-xl flex items-center justify-center">
              <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-[#EF3866]/10 transition-colors flex items-center justify-center relative">
            <span className="font-sora font-bold text-sm text-gray-400 dark:text-gray-500 group-hover:opacity-0 transition-opacity">
              {episode.episode_number}
            </span>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-4 h-4 text-[#EF3866]" />
            </div>
          </div>
        )}
      </div>

      {/* Text info */}
      <div className="flex-1 min-w-0">
        <p className="font-sora font-semibold text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-[#EF3866] transition-colors">
          {episode.title}
        </p>
        {episode.description && (
          <p className="text-xs font-sora text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1 leading-relaxed">
            {episode.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-[10px] font-sora text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatDuration(episode.duration_seconds)}
          </span>
          <span className="flex items-center gap-1">
            <Headphones className="w-2.5 h-2.5" />
            {formatCount(episode.play_count)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {formatDate(episode.published_at)}
          </span>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-gray-200 dark:text-gray-700 flex-shrink-0 mt-1 group-hover:text-[#EF3866] transition-colors" />
    </Link>
  );
}

// ── Season Accordion ──────────────────────────────────────────
function SeasonAccordion({
  season,
  episodes,
  podcastSlug,
  defaultOpen,
}: {
  season: Season;
  episodes: Episode[];
  podcastSlug: string;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const totalDuration = episodes.reduce((sum, ep) => sum + (ep.duration_seconds || 0), 0);
  const totalHours = Math.floor(totalDuration / 3600);
  const totalMins = Math.floor((totalDuration % 3600) / 60);
  const durationLabel = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

  return (
    <div className="border border-gray-100 dark:border-gray-800/70 rounded-2xl overflow-hidden">
      {/* Season header */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
      >
        {/* Season number badge */}
        {season.cover_image_url ? (
          <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
            <Image src={season.cover_image_url} alt={season.title} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-[#EF3866]/8 dark:bg-[#EF3866]/10 flex flex-col items-center justify-center flex-shrink-0 border border-[#EF3866]/15">
            <span className="text-[8px] font-sora font-bold text-[#EF3866] uppercase tracking-widest leading-none">
              S
            </span>
            <span className="text-lg font-sora font-bold text-[#EF3866] leading-tight">
              {season.season_number}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sora font-bold text-[#EF3866] uppercase tracking-widest">
              Season {season.season_number}
            </span>
          </div>
          <h3 className="font-sora font-semibold text-sm text-gray-900 dark:text-white mt-0.5 truncate">
            {season.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-[10px] font-sora text-gray-400">
            <span>{episodes.length} episode{episodes.length !== 1 ? "s" : ""}</span>
            {totalDuration > 0 && (
              <>
                <span className="w-0.5 h-0.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <span>{durationLabel} total</span>
              </>
            )}
          </div>
        </div>

        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
            isOpen
              ? "bg-[#EF3866]/10 text-[#EF3866]"
              : "bg-gray-100 dark:bg-gray-800 text-gray-400"
          }`}
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Description */}
      {isOpen && season.description && (
        <div className="px-5 py-3 text-xs font-sora text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/20">
          {season.description}
        </div>
      )}

      {/* Episodes */}
      {isOpen && (
        <div className={`border-t border-gray-100 dark:border-gray-800/60 ${episodes.length === 0 ? "p-5" : "p-2"}`}>
          {episodes.length === 0 ? (
            <p className="text-xs font-sora text-gray-400 dark:text-gray-500 text-center py-6">
              No episodes in this season yet
            </p>
          ) : (
            <div className="space-y-0.5">
              {episodes.map((ep, i) => (
                <EpisodeRow
                  key={ep.id}
                  episode={ep}
                  podcastSlug={podcastSlug}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function PodcastDetailView({
  podcast,
  seasons,
  episodes,
  isOwner,
}: Props) {
  const router = useRouter();
  const hostName = `${podcast.host?.first_name ?? ""} ${podcast.host?.last_name ?? ""}`.trim();
  const coverUrl = podcast.cover_image_url ||
    "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&h=800&fit=crop";

  const handleShare = async () => {
    const url = `${window.location.origin}/home/podcast/${podcast.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: podcast.name, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied!"); }
    } catch { toast.error("Share failed"); }
  };

  const episodesBySeason = seasons.reduce<Record<string, Episode[]>>((acc, season) => {
    acc[season.id] = episodes.filter((ep) => ep.season_id === season.id);
    return acc;
  }, {});

  const latestSeason = seasons[seasons.length - 1];
  const latestEpisode = episodes[episodes.length - 1];

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sora">
      {/* Background atmosphere from cover */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <Image
          src={coverUrl}
          alt=""
          fill
          className="object-cover opacity-[0.03] dark:opacity-[0.05] blur-3xl scale-110"
          aria-hidden
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* ── Back ── */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-sora font-medium text-gray-400 hover:text-[#EF3866] transition-colors mb-8 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          All Podcasts
        </button>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr] gap-8 lg:gap-12">

          {/* ── LEFT: Podcast identity ── */}
          <div className="lg:sticky lg:top-8 lg:self-start">

            {/* Cover */}
            <div className="relative w-full max-w-xs mx-auto lg:mx-0 aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-black/15 dark:shadow-black/50 mb-6">
              <Image src={coverUrl} alt={podcast.name} fill className="object-cover" />
              {/* Category badge */}
              <div className="absolute top-4 left-4">
                <span className="bg-[#EF3866] text-white text-[10px] font-sora font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {podcast.category}
                </span>
              </div>
            </div>

            {/* Podcast info */}
            <div className="max-w-xs mx-auto lg:mx-0">
              <h1 className="font-sora font-semibold text-2xl text-gray-900 dark:text-white leading-tight mb-2">
                {podcast.name}
              </h1>

              {/* Host */}
              <div className="flex items-center gap-2 mb-4">
                {podcast.host?.image_url && (
                  <div className="relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                    <Image src={podcast.host.image_url} alt={hostName} fill className="object-cover" />
                  </div>
                )}
                <span className="text-sm font-sora text-gray-500 dark:text-gray-400">{hostName}</span>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mb-5">
                <div className="flex items-center gap-1.5 text-xs font-sora text-gray-400">
                  <Radio className="w-3.5 h-3.5 text-[#EF3866]" />
                  <span>{seasons.length} season{seasons.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="w-0.5 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="flex items-center gap-1.5 text-xs font-sora text-gray-400">
                  <Mic className="w-3.5 h-3.5 text-[#EF3866]" />
                  <span>{podcast.total_episodes} ep{podcast.total_episodes !== 1 ? "s" : ""}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mb-5">
                {latestEpisode && (
                  <Link
                    href={`/home/podcast/${podcast.slug}/episode/${latestEpisode.id}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#EF3866] hover:bg-[#d12b56] text-white px-4 py-2.5 rounded-xl text-xs font-sora font-semibold transition-colors shadow-md shadow-[#EF3866]/20"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Play Latest
                  </Link>
                )}
                <button
                  onClick={handleShare}
                  className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:border-[#EF3866] hover:text-[#EF3866] transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                {isOwner && (
                  <Link
                    href={`/home/podcast/${podcast.slug}/manage`}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:border-[#EF3866] hover:text-[#EF3866] transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {/* Description */}
              {podcast.description && (
                <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800/60">
                  <p className="text-xs font-sora text-gray-500 dark:text-gray-400 leading-relaxed">
                    {podcast.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {podcast.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {podcast.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-sora bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Seasons & Episodes ── */}
          <div className="min-w-0">
            {/* Section header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-1 h-5 bg-[#EF3866] rounded-full" />
                <h2 className="font-sora font-semibold text-lg text-gray-900 dark:text-white">
                  Seasons & Episodes
                </h2>
              </div>
              {isOwner && (
                <Link
                  href={`/home/podcast/${podcast.slug}/season/new`}
                  className="flex items-center gap-1.5 text-[11px] font-sora font-medium text-[#EF3866] bg-[#EF3866]/8 hover:bg-[#EF3866]/15 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Season
                </Link>
              )}
            </div>

            {seasons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                  <Mic className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="font-sora text-sm text-gray-500 dark:text-gray-400 font-medium">No episodes yet</p>
                {isOwner && (
                  <p className="font-sora text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Start a live session and record it to publish episodes
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {seasons.map((season) => (
                  <SeasonAccordion
                    key={season.id}
                    season={season}
                    episodes={episodesBySeason[season.id] || []}
                    podcastSlug={podcast.slug}
                    defaultOpen={season.id === latestSeason?.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}