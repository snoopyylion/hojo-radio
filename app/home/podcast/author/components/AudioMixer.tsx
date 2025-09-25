// app/home/podcast/author/components/AudioMixer.tsx - AUDIO MIXER COMPONENT
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
  onMusicMute
}: AudioMixerProps) {
  const [tracks, setTracks] = useState<AudioTrack[]>([
    { id: 1, name: 'Microphone', volume: micVolume, muted: isMicMuted, type: 'mic' },
    { id: 2, name: 'Background Music', volume: musicVolume, muted: isMusicMuted, type: 'music' },
    { id: 3, name: 'Sound Effects', volume: 0.5, muted: true, type: 'sfx' }
  ]);

  useEffect(() => {
    setTracks(prev => prev.map(track => {
      if (track.type === 'mic') {
        return { ...track, volume: micVolume, muted: isMicMuted };
      }
      if (track.type === 'music') {
        return { ...track, volume: musicVolume, muted: isMusicMuted };
      }
      return track;
    }));
  }, [micVolume, musicVolume, isMicMuted, isMusicMuted]);

  const updateTrackVolume = (id: number, volume: number) => {
    setTracks(prev => prev.map(track =>
      track.id === id ? { ...track, volume } : track
    ));

    const track = tracks.find(t => t.id === id);
    if (track) {
      onVolumeChange(track.type, volume);
    }
  };

  const toggleMute = (id: number) => {
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    setTracks(prev => prev.map(t =>
      t.id === id ? { ...t, muted: !t.muted } : t
    ));

    if (track.type === 'mic') {
      onMicMute();
    } else if (track.type === 'music') {
      onMusicMute();
    }
  };

  const applyPreset = (presetName: string) => {
    let newTracks = [...tracks];

    switch (presetName) {
      case 'Interview':
        newTracks = newTracks.map(track => {
          if (track.type === 'mic') return { ...track, volume: 0.9, muted: false };
          if (track.type === 'music') return { ...track, volume: 0.2, muted: false };
          if (track.type === 'sfx') return { ...track, volume: 0.3, muted: true };
          return track;
        });
        break;
      case 'Music Focus':
        newTracks = newTracks.map(track => {
          if (track.type === 'mic') return { ...track, volume: 0.7, muted: false };
          if (track.type === 'music') return { ...track, volume: 0.8, muted: false };
          if (track.type === 'sfx') return { ...track, volume: 0.4, muted: false };
          return track;
        });
        break;
      case 'Voice Only':
        newTracks = newTracks.map(track => {
          if (track.type === 'mic') return { ...track, volume: 1.0, muted: false };
          if (track.type === 'music') return { ...track, volume: 0.0, muted: true };
          if (track.type === 'sfx') return { ...track, volume: 0.0, muted: true };
          return track;
        });
        break;
    }

    setTracks(newTracks);
    newTracks.forEach(track => {
      onVolumeChange(track.type, track.volume);
    });
  };

  return (
    <div className="border border-black dark:border-white rounded-3xl p-6">
      <h3 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center">
        <SlidersVertical className="w-5 h-5 mr-3" />
        Audio Mixer
      </h3>

      <div className="space-y-4">
        {tracks.map(track => (
          <div key={track.id} className="flex items-center space-x-4">
            <div className="w-24 text-sm text-black dark:text-white">
              {track.name}
            </div>

            <button
              onClick={() => toggleMute(track.id)}
              className={`p-2 rounded-full transition-all duration-200 ${track.muted
                ? 'bg-[#EF3866] text-white'
                : 'bg-black dark:bg-white bg-opacity-10 dark:bg-opacity-10 hover:bg-opacity-20 dark:hover:bg-opacity-20'
                }`}
            >
              {track.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={track.volume}
                onChange={(e) => updateTrackVolume(track.id, parseFloat(e.target.value))}
                className="w-full h-2 bg-black dark:bg-white bg-opacity-10 dark:bg-opacity-10 rounded-full appearance-none cursor-pointer slider"
                disabled={track.muted}
              />
              <style jsx>{`
                .slider::-webkit-slider-thumb {
                  appearance: none;
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  background: ${track.muted ? '#999' : '#EF3866'};
                  cursor: pointer;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .slider::-moz-range-thumb {
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  background: ${track.muted ? '#999' : '#EF3866'};
                  cursor: pointer;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
              `}</style>
            </div>

            <div className="w-12 text-right text-sm text-black dark:text-white opacity-60">
              {track.muted ? 'MUTE' : `${Math.round(track.volume * 100)}%`}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-black dark:border-white border-opacity-10 dark:border-opacity-10">
        <h4 className="text-sm font-medium text-black dark:text-white mb-3">Presets</h4>
        <div className="flex space-x-3">
          <button
            onClick={() => applyPreset('Interview')}
            className="px-3 py-1 text-xs border border-black dark:border-white rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-200"
          >
            Interview
          </button>
          <button
            onClick={() => applyPreset('Music Focus')}
            className="px-3 py-1 text-xs border border-black dark:border-white rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-200"
          >
            Music Focus
          </button>
          <button
            onClick={() => applyPreset('Voice Only')}
            className="px-3 py-1 text-xs border border-black dark:border-white rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-200"
          >
            Voice Only
          </button>
        </div>
      </div>
    </div>
  );
}