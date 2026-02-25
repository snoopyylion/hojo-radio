// app/home/podcast/author/components/SoundEffectsPanel.tsx
import React, { useState } from 'react';
import { Play, Square, RefreshCw, User, Globe, Upload, Volume2, Headphones } from 'lucide-react';
import { SoundEffect } from '../hooks/useSoundEffects';

interface SoundEffectsPanelProps {
  className?: string;
  effects: SoundEffect[];
  userEffects: SoundEffect[];
  loading: boolean;
  error: string | null;
  playSound: (effectId: string) => Promise<void>;
  stopSound: (effectId: string) => void;
  isPlaying: (effectId: string) => boolean;
  volume: number;
  setVolume: (volume: number) => void;
  refetch: () => Promise<void>;
}

export function SoundEffectsPanel({
  className = '',
  effects,
  userEffects,
  loading,
  error,
  playSound,
  stopSound,
  isPlaying,
  volume,
  setVolume,
  refetch,
}: SoundEffectsPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  const currentEffects = activeTab === 'all' ? effects : userEffects;

  const groupedEffects = currentEffects.reduce((groups, effect) => {
    const category = effect.category || 'uncategorized';
    if (!groups[category]) groups[category] = [];
    groups[category].push(effect);
    return groups;
  }, {} as Record<string, typeof currentEffects>);

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`border border-black/10 dark:border-white/10 rounded-2xl bg-white dark:bg-black overflow-hidden ${className}`}>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-black/5 dark:border-white/5">
          <div className="w-8 h-8 bg-[#EF3866]/10 rounded-xl flex items-center justify-center">
            <Headphones className="w-4 h-4 text-[#EF3866]" />
          </div>
          <h3 className="font-sora font-semibold text-sm text-black dark:text-white">Sound Effects Library</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#EF3866] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="font-sora text-xs text-black/40 dark:text-white/40">Loading sound effects…</p>
        </div>
      </div>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────
  return (
    <div className={`border border-black/10 dark:border-white/10 rounded-2xl bg-white dark:bg-black overflow-hidden ${className}`}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#EF3866]/10 rounded-xl flex items-center justify-center">
            <Headphones className="w-4 h-4 text-[#EF3866]" />
          </div>
          <h3 className="font-sora font-semibold text-sm text-black dark:text-white">Sound Effects Library</h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Volume control */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-black/30 dark:text-white/30" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #EF3866 ${volume}%, rgba(0,0,0,0.1) ${volume}%)`,
              }}
            />
            <span className="font-sora text-[10px] font-medium text-black/40 dark:text-white/40 w-7 text-right">
              {volume}%
            </span>
          </div>

          {/* Refresh */}
          <button
            onClick={refetch}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-black/40 dark:text-white/40 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 px-5 pt-4 pb-0">
        {([
          { key: 'all', label: 'All Effects', count: effects.length,     icon: Globe },
          { key: 'my',  label: 'My Effects',  count: userEffects.length, icon: User  },
        ] as const).map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-sora text-xs font-semibold transition-all duration-200 ${
              activeTab === key
                ? 'bg-[#EF3866] text-white shadow-md shadow-[#EF3866]/20'
                : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Icon size={13} />
            {label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${
              activeTab === key ? 'bg-white/20 text-white' : 'bg-black/8 dark:bg-white/8 text-black/50 dark:text-white/50'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-5 mt-4 px-3 py-2.5 bg-red-500/8 border border-red-500/20 rounded-xl">
          <p className="font-sora text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* ── Effects list ── */}
      <div className="p-5 space-y-6">
        {currentEffects.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-10 text-center">
            {activeTab === 'all' ? (
              <>
                <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-3">
                  <Globe className="w-5 h-5 text-black/20 dark:text-white/20" />
                </div>
                <p className="font-sora text-sm font-medium text-black/40 dark:text-white/40">No effects available</p>
                <p className="font-sora text-xs text-black/25 dark:text-white/25 mt-1">
                  Effects will appear here once uploaded to the platform
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5 text-black/20 dark:text-white/20" />
                </div>
                <p className="font-sora text-sm font-medium text-black/40 dark:text-white/40">No personal effects yet</p>
                <p className="font-sora text-xs text-black/25 dark:text-white/25 mt-1">
                  Upload your first effect to build your personal library
                </p>
              </>
            )}
          </div>
        ) : (
          Object.entries(groupedEffects).map(([category, categoryEffects]) => (
            <div key={category}>
              {/* Category header */}
              <div className="flex items-center gap-2 mb-3">
                <p className="font-sora text-[10px] font-semibold uppercase tracking-widest text-black/35 dark:text-white/35 capitalize">
                  {category}
                </p>
                <span className="font-sora text-[10px] text-black/25 dark:text-white/25">
                  ({categoryEffects.length})
                </span>
                <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
              </div>

              {/* Effect cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {categoryEffects.map((effect) => {
                  const playing = isPlaying(effect.id);
                  return (
                    <div
                      key={effect.id}
                      className={`group flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                        playing
                          ? 'border-[#EF3866]/40 bg-[#EF3866]/5'
                          : 'border-black/8 dark:border-white/8 bg-black/2 dark:bg-white/2 hover:border-black/15 dark:hover:border-white/15'
                      }`}
                    >
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {/* Playing indicator */}
                          {playing && (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF3866] opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EF3866]" />
                            </span>
                          )}
                          <p className={`font-sora text-xs font-semibold truncate ${
                            playing ? 'text-[#EF3866]' : 'text-black dark:text-white'
                          }`}>
                            {effect.title}
                          </p>
                          {effect.isOwned && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-sora font-semibold bg-blue-500/10 text-blue-500">
                              <User size={8} />
                              Mine
                            </span>
                          )}
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-1.5 font-sora text-[10px] text-black/35 dark:text-white/35">
                          {effect.duration && <span>{Math.round(effect.duration / 1000)}s</span>}
                          {effect.file_size && <><span>·</span><span>{(effect.file_size / 1024).toFixed(1)}KB</span></>}
                          {Array.isArray(effect.tags) && effect.tags.length > 0 && <><span>·</span><span className="truncate">{effect.tags.slice(0, 2).join(', ')}</span></>}
                        </div>
                      </div>

                      {/* Play / Stop */}
                      <div className="ml-3 shrink-0">
                        {playing ? (
                          <button
                            onClick={() => stopSound(effect.id)}
                            className="w-8 h-8 bg-[#EF3866] text-white rounded-lg flex items-center justify-center hover:bg-[#d12b56] transition-colors"
                            title="Stop"
                          >
                            <Square size={12} className="fill-white" />
                          </button>
                        ) : (
                          <button
                            onClick={() => void playSound(effect.id)}
                            className="w-8 h-8 bg-black/5 dark:bg-white/5 text-black dark:text-white rounded-lg flex items-center justify-center hover:bg-[#EF3866] hover:text-white transition-all duration-200 group-hover:bg-[#EF3866]/10 group-hover:text-[#EF3866]"
                            title="Play"
                          >
                            <Play size={12} className="ml-0.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}