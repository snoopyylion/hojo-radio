"use client";

// app/home/podcast/recorded/PodcastBrowse.tsx

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Headphones,
  Play,
  Radio,
  ChevronRight,
  Mic,
  TrendingUp,
  Flame,
} from "lucide-react";
import PodcastTile from "../components/PodcastTile";

// ─── Types ────────────────────────────────────────────────────
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
  podcast_seasons: { count: number }[];
  host: Host[];
}

interface Episode {
  id: string;
  user_id: string;
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
  recording_status: string;
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

interface Props {
  podcasts: Podcast[];
  recentEpisodes: Episode[];
  currentUserId: string;
}

// ─── Helpers ─────────────────────────────────────────────────
// function formatTimeAgo(dateString: string): string {
//   const now = new Date();
//   const date = new Date(dateString);
//   const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
//   if (diff < 60) return `${diff}s ago`;
//   if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
//   if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
//   if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
//   return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
// }

// function formatCount(n: number): string {
//   if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
//   if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
//   return n.toLocaleString();
// }

// ─── Featured Hero Podcast Card ───────────────────────────────
function HeroPodcastCard({ podcast }: { podcast: Podcast }) {
  const hostName = `${podcast.host?.[0]?.first_name ?? ""} ${podcast.host?.[0]?.last_name ?? ""}`.trim();
  const seasonCount = podcast.podcast_seasons?.[0]?.count ?? 0;

  return (
    <Link
      href={`/home/podcast/${podcast.slug}`}
      className="group relative block rounded-3xl overflow-hidden bg-gray-100 dark:bg-gray-900 col-span-2 row-span-2 aspect-square"
    >
      <Image
        src={podcast.cover_image_url || "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&h=800&fit=crop"}
        alt={podcast.name}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Top badges */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <span className="bg-[#EF3866] text-white text-[10px] font-bold px-2.5 py-1 rounded-full font-sora tracking-wider uppercase">
          Featured
        </span>
        <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full font-sora capitalize">
          {podcast.category}
        </span>
      </div>

      {/* Play button */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
        <div className="w-16 h-16 bg-[#EF3866] rounded-full flex items-center justify-center shadow-2xl shadow-[#EF3866]/40">
          <Play className="w-7 h-7 text-white ml-0.5" />
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h2 className="font-sora font-semibold text-xl text-white leading-tight mb-1">
          {podcast.name}
        </h2>
        <p className="text-white/60 text-xs font-sora mb-3">by {hostName}</p>
        {podcast.description && (
          <p className="text-white/70 text-xs font-sora line-clamp-2 leading-relaxed mb-3">
            {podcast.description}
          </p>
        )}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-white/80 text-xs font-sora">
            <Mic className="w-3 h-3 text-[#EF3866]" />
            {podcast.total_episodes} eps
          </span>
          <span className="w-1 h-1 bg-white/30 rounded-full" />
          <span className="flex items-center gap-1 text-white/80 text-xs font-sora">
            <Radio className="w-3 h-3 text-[#EF3866]" />
            {seasonCount} season{seasonCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Standard Podcast Card ─────────────────────────────────────
function PodcastCard({ podcast, variant = "default" }: { podcast: Podcast; variant?: "default" | "wide" | "tall" }) {
  const hostName = `${podcast.host?.[0]?.first_name ?? ""} ${podcast.host?.[0]?.last_name ?? ""}`.trim();

  const aspectClass = variant === "wide"
    ? "aspect-[2/1]"
    : variant === "tall"
    ? "aspect-[3/4]"
    : "aspect-square";

  return (
    <Link
      href={`/home/podcast/${podcast.slug}`}
      className={`group relative block rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 ${
        variant === "wide" ? "col-span-2" : ""
      } ${variant === "tall" ? "row-span-2" : ""}`}
    >
      <div className={`relative w-full ${aspectClass}`}>
        <Image
          src={podcast.cover_image_url || "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&h=400&fit=crop"}
          alt={podcast.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        {/* Category */}
        <div className="absolute top-3 left-3">
          <span className="text-[9px] font-sora font-medium bg-white/15 backdrop-blur-sm text-white px-2 py-0.5 rounded-full capitalize">
            {podcast.category}
          </span>
        </div>

        {/* Hover play */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-11 h-11 bg-[#EF3866] rounded-full flex items-center justify-center shadow-xl shadow-[#EF3866]/30">
            <Play className="w-4 h-4 text-white ml-0.5" />
          </div>
        </div>

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="font-sora font-semibold text-xs text-white leading-tight truncate">
            {podcast.name}
          </p>
          <p className="text-white/50 text-[10px] font-sora mt-0.5 truncate">{hostName}</p>
          <p className="text-white/40 text-[10px] font-sora mt-1">
            {podcast.total_episodes} episodes
          </p>
        </div>
      </div>
    </Link>
  );
}

// ─── Podcast List Row ──────────────────────────────────────────
function PodcastListRow({ podcast, rank }: { podcast: Podcast; rank: number }) {
  const hostName = `${podcast.host?.[0]?.first_name ?? ""} ${podcast.host?.[0]?.last_name ?? ""}`.trim();

  return (
    <Link
      href={`/home/podcast/${podcast.slug}`}
      className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/60 transition-colors"
    >
      <span className="w-5 text-center font-sora font-semibold text-xs text-[#EF3866] flex-shrink-0">
        {rank}
      </span>
      <div className="relative w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden">
        <Image
          src={podcast.cover_image_url || "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=80&h=80&fit=crop"}
          alt={podcast.name}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-sora font-semibold text-xs text-gray-900 dark:text-white truncate group-hover:text-[#EF3866] transition-colors">
          {podcast.name}
        </p>
        <p className="text-[10px] font-sora text-gray-400 truncate">{hostName}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] font-sora text-gray-400">{podcast.total_episodes} eps</span>
        <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 group-hover:text-[#EF3866] transition-colors" />
      </div>
    </Link>
  );
}

// ─── Category Pill ─────────────────────────────────────────────
function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-sora font-medium transition-all duration-200 capitalize ${
        active
          ? "bg-[#EF3866] text-white shadow-md shadow-[#EF3866]/25"
          : "bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Section Header ────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, count }: {
  icon: React.ComponentType<{ className: string }>;
  title: string;
  subtitle?: string;
  count?: number;
}) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-[#EF3866]/10 dark:bg-[#EF3866]/15 rounded-xl flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#EF3866]" />
        </div>
        <div>
          <h2 className="font-sora font-semibold text-lg text-gray-900 dark:text-white leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs font-sora text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
      {count !== undefined && (
        <span className="text-xs font-sora text-gray-400 dark:text-gray-500">
          {count} total
        </span>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export default function PodcastBrowse({ podcasts, recentEpisodes }: Props) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const categories = [
    "all",
    ...Array.from(new Set(podcasts.map((p) => p.category).filter(Boolean))),
  ];

  const filteredPodcasts =
    selectedCategory === "all"
      ? podcasts
      : podcasts.filter((p) => p.category === selectedCategory);

  // Map episodes for PodcastTile
  const mappedEpisodes = recentEpisodes.map((ep) => ({
    ...ep,
    author: ep.author || { first_name: "Unknown", last_name: "Author" },
    recording_status: ep.recording_status as "pending" | "recording" | "processing" | "ready" | "failed",
    podcast: {
      id: ep.podcast?.id || "",
      name: ep.podcast?.name || "Unknown Podcast",
      slug: ep.podcast?.slug || "",
      cover_image_url: ep.podcast?.cover_image_url === null ? undefined : ep.podcast?.cover_image_url,
      author_id: ep.podcast?.author_id || "",
    },
    season: {
      id: ep.season?.id || "",
      title: ep.season?.title || "Unknown Season",
      season_number: ep.season?.season_number || 1,
    },
  }));

  // Determine bento layout assignment
//   const getVariant = (index: number): "default" | "wide" | "tall" => {
//     if (index === 0) return "default"; // hero handled separately
//     if (index === 3) return "wide";
//     if (index === 6) return "tall";
//     return "default";
//   };

  const [featuredPodcast, ...restPodcasts] = filteredPodcasts;

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sora">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* ── Page Header ── */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-1.5 h-5 bg-[#EF3866] rounded-full" />
            <p className="text-xs font-sora font-medium text-[#EF3866] uppercase tracking-widest">
              Hojo Podcasts
            </p>
          </div>
          <h1 className="font-sora font-semibold text-3xl sm:text-4xl text-gray-900 dark:text-white mt-1">
            Discover & Listen
          </h1>
          <p className="text-sm font-sora text-gray-400 mt-2">
            {podcasts.length} shows · {recentEpisodes.length} recent episodes
          </p>
        </div>

        {/* ══════════════════════════════════════════════
            SECTION 1: LATEST EPISODES
        ══════════════════════════════════════════════ */}
        <section className="mb-16">
          <SectionHeader
            icon={Flame}
            title="Latest Episodes"
            subtitle="Fresh from your favourite creators"
            count={mappedEpisodes.length}
          />

          {mappedEpisodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-3">
                <Mic className="w-6 h-6 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="font-sora text-sm text-gray-500 dark:text-gray-400 font-medium">No episodes yet</p>
              <p className="font-sora text-xs text-gray-400 dark:text-gray-500 mt-1">Recorded episodes will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {mappedEpisodes.map((episode) => (
                <PodcastTile key={episode.id} episode={episode} />
              ))}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════
            SECTION 2: SHOWS / PODCASTS
        ══════════════════════════════════════════════ */}
        <section>
          <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#EF3866]/10 dark:bg-[#EF3866]/15 rounded-xl flex items-center justify-center">
                <Headphones className="w-4 h-4 text-[#EF3866]" />
              </div>
              <div>
                <h2 className="font-sora font-semibold text-lg text-gray-900 dark:text-white leading-tight">
                  All Shows
                </h2>
                <p className="text-xs font-sora text-gray-400">Browse our podcast library</p>
              </div>
            </div>
            <span className="text-xs font-sora text-gray-400 dark:text-gray-500">
              {filteredPodcasts.length} shows
            </span>
          </div>

          {/* Category filter strip */}
          <div
            ref={scrollRef}
            className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categories.map((cat) => (
              <CategoryPill
                key={cat}
                label={cat}
                active={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
              />
            ))}
          </div>

          {filteredPodcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-3">
                <Headphones className="w-6 h-6 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="font-sora text-sm text-gray-500 dark:text-gray-400 font-medium">No shows found</p>
              <p className="font-sora text-xs text-gray-400 dark:text-gray-500 mt-1">
                Try a different category
              </p>
            </div>
          ) : (
            <>
              {/* ── Bento Grid ── */}
              {filteredPodcasts.length === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <HeroPodcastCard podcast={filteredPodcasts[0]} />
                </div>
              )}

              {filteredPodcasts.length >= 2 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 auto-rows-auto">
                  {/* Hero - spans 2x2 */}
                  {featuredPodcast && (
                    <HeroPodcastCard podcast={featuredPodcast} />
                  )}

                  {/* Right side stacked cards (slots 1, 2) */}
                  {restPodcasts.slice(0, 2).map((p) => (
                    <PodcastCard key={p.id} podcast={p} variant="default" />
                  ))}

                  {/* Bottom row */}
                  {restPodcasts.length > 2 && (
                    <>
                      {restPodcasts.slice(2, 3).map((p) => (
                        <PodcastCard key={p.id} podcast={p} variant="wide" />
                      ))}
                      {restPodcasts.slice(3, 4).map((p) => (
                        <PodcastCard key={p.id} podcast={p} variant="default" />
                      ))}
                    </>
                  )}

                  {/* Remaining in regular grid — break out of bento and go full row */}
                  {restPodcasts.length > 4 && (
                    <div className="col-span-2 sm:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-0">
                      {restPodcasts.slice(4).map((p) => (
                        <PodcastCard key={p.id} podcast={p} variant="default" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Ranked List ── */}
              {filteredPodcasts.length > 4 && (
                <div className="mt-8 border border-gray-100 dark:border-gray-800/80 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-[#EF3866]" />
                    <span className="font-sora font-semibold text-xs text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      All Shows
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/50 p-1">
                    {filteredPodcasts.map((p, i) => (
                      <PodcastListRow key={p.id} podcast={p} rank={i + 1} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}