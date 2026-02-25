"use client";

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, SlidersVertical } from 'lucide-react';
import { AudioTrack } from '../types/audio';

interface AudioMixerProps {
  onVolumeChange: (type: string, volume: number) => void;
  micVolume: number;
  musicVolume: number;
  isMicMuted: boolean;
  isMusicMuted: boolean;
  onMicMute: () => void;
  onMusicMute: () => void;
}

export function AudioMixer({
  onVolumeChange,
  micVolume,
  musicVolume,
  isMicMuted,
  isMusicMuted,
  onMicMute,
  onMusicMute,
}: AudioMixerProps) {
  const [tracks, setTracks] = useState<AudioTrack[]>([
    { id: 1, name: 'Microphone', volume: micVolume, muted: isMicMuted, type: 'mic' },
    { id: 2, name: 'Background Music', volume: musicVolume, muted: isMusicMuted, type: 'music' },
    { id: 3, name: 'Sound Effects', volume: 0.5, muted: true, type: 'sfx' },
  ]);

  // Sync props → state
  useEffect(() => {
    setTracks((prev) =>
      prev.map((track) => {
        if (track.type === 'mic') return { ...track, volume: micVolume, muted: isMicMuted };
        if (track.type === 'music') return { ...track, volume: musicVolume, muted: isMusicMuted };
        return track;
      })
    );
  }, [micVolume, musicVolume, isMicMuted, isMusicMuted]);

  const updateTrackVolume = (id: number, newVolume: number) => {
    setTracks((prev) => {
      const newTracks = prev.map((track) =>
        track.id === id ? { ...track, volume: newVolume } : track
      );

      const updated = newTracks.find((t) => t.id === id);
      if (updated) {
        // Important: we send volume even when it's 0 — do NOT force mute here
        onVolumeChange(updated.type, newVolume);
      }

      return newTracks;
    });
  };

  const toggleMute = (id: number) => {
    setTracks((prev) => {
      const newTracks = prev.map((t) =>
        t.id === id ? { ...t, muted: !t.muted } : t
      );

      const toggled = newTracks.find((t) => t.id === id);
      if (toggled) {
        if (toggled.type === 'mic') onMicMute();
        else if (toggled.type === 'music') onMusicMute();
      }

      return newTracks;
    });
  };

  const applyPreset = (presetName: string) => {
    setTracks((prev) => {
      let newTracks = [...prev];

      switch (presetName) {
        case 'Interview':
          newTracks = newTracks.map((track) => {
            if (track.type === 'mic') return { ...track, volume: 0.9, muted: false };
            if (track.type === 'music') return { ...track, volume: 0.15, muted: false };
            if (track.type === 'sfx') return { ...track, volume: 0.3, muted: true };
            return track;
          });
          break;

        case 'Music Focus':
          newTracks = newTracks.map((track) => {
            if (track.type === 'mic') return { ...track, volume: 0.7, muted: false };
            if (track.type === 'music') return { ...track, volume: 0.85, muted: false };
            if (track.type === 'sfx') return { ...track, volume: 0.4, muted: false };
            return track;
          });
          break;

        case 'Voice Only':
          newTracks = newTracks.map((track) => {
            if (track.type === 'mic') return { ...track, volume: 1.0, muted: false };
            if (track.type === 'music') return { ...track, volume: 0.0, muted: true };
            if (track.type === 'sfx') return { ...track, volume: 0.0, muted: true };
            return track;
          });
          break;
      }

      // Notify parent of all changed values
      newTracks.forEach((track) => {
        const old = prev.find((t) => t.id === track.id);
        if (old && (old.volume !== track.volume || old.muted !== track.muted)) {
          onVolumeChange(track.type, track.volume);
          // Note: we don't call mute handlers here — preset only changes volume
          // mute is explicit user action
        }
      });

      return newTracks;
    });
  };

  return (
    <div className="border border-gray-200/60 dark:border-gray-800/60 rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-white/80 dark:bg-black/60 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-2.5 mb-4 sm:mb-5">
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#EF3866]/10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
          <SlidersVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#EF3866]" />
        </div>
        <h3 className="font-sora font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">Audio Mixer</h3>
      </div>

      {/* Tracks */}
      <div className="space-y-3 sm:space-y-4">
        {tracks.map((track) => {
          const isVeryLow = track.volume < 0.05 && !track.muted;

          return (
            <div key={track.id} className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3">
              {/* Label and mute row for mobile */}
              <div className="flex items-center justify-between xs:hidden">
                <span className="font-sora text-xs font-medium text-gray-900 dark:text-white">
                  {track.name}
                </span>
                <button
                  onClick={() => toggleMute(track.id)}
                  className={`p-2 rounded-lg transition-all ${
                    track.muted
                      ? 'bg-[#EF3866] text-white shadow-sm shadow-[#EF3866]/30'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  title={track.muted ? 'Unmute' : 'Mute'}
                >
                  {track.muted ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Desktop label (hidden on mobile) */}
              <span className="hidden xs:block font-sora text-xs font-medium text-gray-900 dark:text-white w-20 sm:w-24 lg:w-28 shrink-0 truncate">
                {track.name}
              </span>

              {/* Desktop mute button (hidden on mobile) */}
              <button
                onClick={() => toggleMute(track.id)}
                className={`hidden xs:flex p-2 rounded-lg transition-all shrink-0 ${
                  track.muted
                    ? 'bg-[#EF3866] text-white shadow-sm shadow-[#EF3866]/30'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title={track.muted ? 'Unmute' : 'Mute'}
              >
                {track.muted ? (
                  <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </button>

              {/* Slider and value row */}
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={track.volume}
                    onChange={(e) => updateTrackVolume(track.id, parseFloat(e.target.value))}
                    // Removed disabled={track.muted} — allow changing volume even when muted
                    className="w-full h-1.5 sm:h-2 rounded-full appearance-none cursor-pointer accent-[#EF3866] disabled:opacity-40"
                    style={{
                      background: track.muted
                        ? 'repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 4px, #d1d5db 4px, #d1d5db 8px)'
                        : `linear-gradient(to right, #EF3866 0%, #EF3866 ${track.volume * 100}%, #e5e7eb ${track.volume * 100}%)`,
                    }}
                  />

                  {/* Visual hint when volume is very low but not muted */}
                  {isVeryLow && !track.muted && (
                    <div className="absolute -top-4 sm:-top-5 right-0 text-[8px] sm:text-[10px] text-amber-600 dark:text-amber-400 pointer-events-none whitespace-nowrap">
                      very quiet
                    </div>
                  )}
                </div>

                {/* Value display */}
                <span className="font-sora text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 w-12 sm:w-14 text-right shrink-0">
                  {track.muted ? 'MUTED' : `${Math.round(track.volume * 100)}%`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Presets */}
      <div className="mt-5 sm:mt-6 pt-4 border-t border-gray-200/40 dark:border-gray-800/40">
        <p className="font-sora text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2.5 sm:mb-3">
          Quick Presets
        </p>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {['Interview', 'Music Focus', 'Voice Only'].map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-[#EF3866]/60 hover:text-[#EF3866] transition-colors whitespace-nowrap"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}