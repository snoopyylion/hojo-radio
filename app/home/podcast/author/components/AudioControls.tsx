// app/home/podcast/author/components/AudioControls.tsx - MAIN AUDIO CONTROLS COMPONENT
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Square, Mic, MicOff, Volume2, VolumeX, Settings, Headphones, Play } from 'lucide-react';
import { useLocalParticipant, useMaybeRoomContext } from "@livekit/components-react";
import { LiveSession } from "@/types/podcast";

import { AudioMixer } from './AudioMixer';
import { NetworkQualityIndicator } from './NetworkQualityIndicator';
import { MicrophoneControls } from './MicrophoneControls';
import { MusicControls } from './MusicControls';
import { SoundEffectsPanel } from './SoundEffectsPanel';
import { useAudioManager } from '../hooks/useAudioManager';
import { useNetworkMonitoring } from '../hooks/useNetworkMonitoring';
import { useSoundEffects, SoundEffect } from '../hooks/useSoundEffects';
import { NetworkQualityStats } from '../types/audio';

interface AudioControlsProps {
  onEndSession?: () => void;
  session: LiveSession;
  networkQuality: NetworkQualityStats | null;
  onNetworkStatsUpdate: (stats: NetworkQualityStats) => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  userRole?: string;
}

export function AudioControls({
  onEndSession,
  session,
  networkQuality,
  connectionStatus,
}: AudioControlsProps) {
  const { localParticipant } = useLocalParticipant();
  const room = useMaybeRoomContext();
  const [micVolume, setMicVolume] = useState(0.8);
  const [isUploading, setIsUploading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [showSoundEffects, setShowSoundEffects] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(false);

  // Use custom hooks
  const {
    tracks,
    currentTrackId,
    isPlaying: isMusicPlaying,
    audioVolume,
    publishedAudioTrack,
    addTrack,
    playTrack,
    playNextTrack,
    playPreviousTrack,
    stopMusic,
    pauseMusic,
    resumeMusic,
    setTrackVolume,
    setAutoplay,           // ← Added this from useAudioManager
    playSoundEffect,
    stopSoundEffect,
    stopAllSoundEffects,
  } = useAudioManager();

  const soundboardOptions = useMemo(
    () => ({
      playEffect: playSoundEffect,
      stopEffect: stopSoundEffect,
      stopAllEffects: stopAllSoundEffects,
    }),
    [playSoundEffect, stopSoundEffect, stopAllSoundEffects]
  );

  const {
    effects,
    userEffects,
    loading: effectsLoading,
    error: effectsError,
    playSound,
    stopSound,
    stopAllSounds,
    isPlaying: isSoundEffectPlaying,
    volume: effectsVolume,
    setVolume: setEffectsVolume,
    refetch,
    activeEffects,
  } = useSoundEffects(soundboardOptions);

  const { startNetworkMonitoring, stopNetworkMonitoring } = useNetworkMonitoring();

  // Quick access to favorite effects (first 6)
  const quickAccessEffects = effects.slice(0, 6);

  const broadcastingEffects = useMemo(() => {
    if (activeEffects.length === 0) return [] as SoundEffect[];
    const lookup = new Map<string, SoundEffect>();
    [...effects, ...userEffects].forEach(effect => {
      lookup.set(effect.id, effect);
    });
    return activeEffects
      .map(id => lookup.get(id))
      .filter((effect): effect is SoundEffect => Boolean(effect));
  }, [activeEffects, effects, userEffects]);

  // Start network monitoring when component mounts
  useEffect(() => {
    if (connectionStatus === 'connected') {
      startNetworkMonitoring(session.id);
    }

    return () => {
      stopNetworkMonitoring();
    };
  }, [connectionStatus, session.id, startNetworkMonitoring, stopNetworkMonitoring]);

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    // Stop all sound effects when muting
    if (!isMuted) {
      stopAllSounds();
    }
  };

  const getNetworkQualityText = () => {
    if (connectionStatus !== 'connected') return connectionStatus;
    return networkQuality?.quality || 'good';
  };

  const uploadMixedAudio = async (file: File, trackType: string = 'music') => {
    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('sessionId', session.id);
      formData.append('trackType', trackType);
      formData.append('networkQuality', networkQuality?.quality || 'medium');

      const response = await fetch('/api/podcast/mixed-audio', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Audio uploaded:', data);
        return data;
      }
    } catch (error) {
      console.error('Audio upload failed:', error);
      throw error;
    }
  };

  const handleMusicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));

    if (audioFiles.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of audioFiles) {
        const trackId = await addTrack(file);
        if (trackId) {
          await uploadMixedAudio(file, 'music');
        }
      }
    } catch (error) {
      console.error('Failed to upload audio files:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMixerVolumeChange = (type: string, volumeValue: number) => {
    if (type === 'mic') {
      setMicVolume(volumeValue);
    } else if (type === 'music') {
      setTrackVolume(volumeValue);
    }
  };

  // Update the toggle to also sync the ref inside the hook
  const handleToggleAutoplay = () => {
    setAutoplayEnabled(prev => {
      const next = !prev;
      setAutoplay(next);   // ← keeps the ref in sync
      return next;
    });
  };

  // Track ended handler
  const handleTrackEnded = useCallback(() => {
    if (autoplayEnabled && tracks.length > 0 && currentTrackId) {
      const currentIndex = tracks.findIndex(t => t.id === currentTrackId);

      if (currentIndex < tracks.length - 1) {
        // Play next track
        const nextTrackId = tracks[currentIndex + 1].id;
        playTrack(nextTrackId);
      } else {
        // End of playlist - stop or loop back to first
        // Option 1: Stop
        stopMusic();
        // Option 2: Loop back to first (uncomment below)
        // playTrack(tracks[0].id);
      }
    }
  }, [autoplayEnabled, tracks, currentTrackId, playTrack, stopMusic]);

  const handleEndSession = async () => {
    try {
      await stopMusic();
      stopAllSounds();
      stopNetworkMonitoring();

      const response = await fetch('/api/podcast/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: localParticipant?.identity,
          sessionId: session.id
        }),
      });

      if (!response.ok) {
        console.error('Failed to end session on server');
      }

      if (room) {
        room.disconnect();
      }

      onEndSession?.();
    } catch (error) {
      console.error("Error ending session:", error);
      onEndSession?.();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* Main Audio Controls Card */}
      <div className="border border-black/10 dark:border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-white dark:bg-black">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#EF3866]/10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <Mic size={14} className="sm:w-4 sm:h-4 text-[#EF3866]" />
            </div>
            <h3 className="font-sora font-semibold text-xs sm:text-sm text-black dark:text-white">
              Studio Controls
            </h3>
          </div>
          {/* Connection status pill */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border border-black/10 dark:border-white/10 w-fit">
            <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' :
              connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
              }`} />
            <span className="font-sora text-[10px] sm:text-[11px] font-medium text-black dark:text-white capitalize whitespace-nowrap">
              {connectionStatus === 'connected' ? `· ${getNetworkQualityText()}` : connectionStatus}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Microphone */}
          <div className="space-y-2 sm:space-y-2.5">
            <label className="font-sora text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">
              Microphone
            </label>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleMuteToggle}
                className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-colors shrink-0 ${isMuted
                  ? 'bg-red-500 text-white'
                  : 'bg-[#EF3866] text-white hover:bg-[#d12b56]'
                  }`}
              >
                {isMuted ? <MicOff size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Mic size={16} className="sm:w-[18px] sm:h-[18px]" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <VolumeX size={12} className="sm:w-3.5 sm:h-3.5 text-black/30 dark:text-white/30 shrink-0" />
                  <input
                    type="range" min="0" max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    disabled={isMuted}
                    className="flex-1 h-1 sm:h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-40 min-w-0"
                    style={{
                      background: isMuted ? '#e5e7eb'
                        : `linear-gradient(to right, #EF3866 ${volume}%, #e5e7eb ${volume}%)`
                    }}
                  />
                  <Volume2 size={12} className="sm:w-3.5 sm:h-3.5 text-black/30 dark:text-white/30 shrink-0" />
                </div>
                <p className="font-sora text-[9px] sm:text-[10px] text-black/40 dark:text-white/40 mt-1">
                  {isMuted ? 'Muted' : `${volume}%`}
                </p>
              </div>
            </div>
          </div>

          {/* Session info */}
          <div className="space-y-2 sm:space-y-2.5">
            <label className="font-sora text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">
              Session
            </label>
            <div className="p-2.5 sm:p-3 bg-black/2 dark:bg-white/3 border border-black/8 dark:border-white/8 rounded-lg sm:rounded-xl">
              <p className="font-sora text-xs sm:text-sm font-medium text-black dark:text-white truncate">
                {session.title}
              </p>
              {/* <p className="font-sora text-[9px] sm:text-[10px] text-black/40 dark:text-white/40 mt-0.5 font-mono truncate">
                {session.id.slice(-8)}
              </p> */}
            </div>
          </div>
        </div>

        {/* Action row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mt-4 sm:mt-5 pt-4 border-t border-black/5 dark:border-white/5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSoundEffects(!showSoundEffects)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 border border-black/15 dark:border-white/15 rounded-lg font-sora text-[11px] sm:text-xs font-medium text-black dark:text-white hover:border-[#EF3866] hover:text-[#EF3866] transition-all duration-200"
            >
              <Headphones size={12} className="sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline">Effects</span>
              {effects.length > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] bg-[#EF3866] text-white rounded-full leading-none">
                  {effects.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 border border-black/15 dark:border-white/15 rounded-lg font-sora text-[11px] sm:text-xs font-medium text-black dark:text-white hover:border-[#EF3866] hover:text-[#EF3866] transition-all duration-200"
            >
              <Settings size={12} className="sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline">Settings</span>
            </button>
          </div>

          <button
            onClick={handleEndSession}
            disabled={connectionStatus === 'connecting'}
            className="w-full sm:w-auto px-4 sm:px-5 py-2 bg-black dark:bg-white text-white dark:text-black font-sora text-xs sm:text-xs font-semibold rounded-lg hover:bg-[#EF3866] hover:text-white transition-all duration-200 disabled:opacity-40"
          >
            End Session
          </button>
        </div>
      </div>

      {/* Quick Access Sound Effects */}
      {!showSoundEffects && quickAccessEffects.length > 0 && (
        <div className="border border-black/10 dark:border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-white dark:bg-black">
          <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 xs:gap-0 mb-4">
            <h3 className="font-sora font-semibold text-xs sm:text-sm text-black dark:text-white">
              Quick Effects
            </h3>
            <button
              onClick={() => setShowSoundEffects(true)}
              className="text-[11px] sm:text-xs text-[#EF3866] hover:text-[#d12b56] transition-colors"
            >
              View All ({effects.length})
            </button>
          </div>

          {broadcastingEffects.length > 0 && (
            <div className="flex items-center gap-2 mb-4 rounded-lg bg-green-500/10 px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs text-green-600 dark:text-green-400">
              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="truncate">
                Now playing: {broadcastingEffects.map(effect => effect.title).join(', ')}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
            {quickAccessEffects.map((effect) => (
              <button
                key={effect.id}
                onClick={() => void playSound(effect.id)}
                disabled={isMuted}
                className={`p-2 sm:p-3 rounded-lg text-[11px] sm:text-xs font-medium transition-colors ${isSoundEffectPlaying(effect.id)
                  ? 'bg-[#EF3866] text-white'
                  : 'bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={effect.title}
              >
                <div className="truncate font-medium">{effect.title}</div>
                {effect.category && (
                  <div className="text-[9px] sm:text-[10px] opacity-75 truncate capitalize">
                    {effect.category}
                  </div>
                )}
              </button>
            ))}
          </div>

          {isMuted && (
            <p className="text-[10px] sm:text-xs text-black/40 dark:text-white/40 mt-3 text-center">
              Unmute to use sound effects
            </p>
          )}
        </div>
      )}

      {/* Full Sound Effects Panel */}
      {showSoundEffects && (
        <SoundEffectsPanel
          className="border border-black/10 dark:border-white/10 rounded-xl sm:rounded-2xl bg-white dark:bg-black"
          effects={effects}
          userEffects={userEffects}
          loading={effectsLoading}
          error={effectsError}
          playSound={playSound}
          stopSound={stopSound}
          isPlaying={isSoundEffectPlaying}
          volume={effectsVolume}
          setVolume={setEffectsVolume}
          refetch={refetch}
        />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="border border-black/10 dark:border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-white dark:bg-black">
          <h3 className="font-sora font-semibold text-xs sm:text-sm text-black dark:text-white mb-4">
            Audio Settings
          </h3>

          <div className="space-y-4 sm:space-y-5">
            <div>
              <label className="block font-sora text-[11px] sm:text-xs font-medium text-black/60 dark:text-white/60 mb-2">
                Audio Quality
              </label>
              <select className="w-full px-3 py-2 text-xs sm:text-sm border border-black/15 dark:border-white/15 rounded-lg focus:ring-2 focus:ring-[#EF3866] focus:border-transparent bg-white dark:bg-black text-black dark:text-white">
                <option value="high">High Quality</option>
                <option value="medium">Medium Quality</option>
                <option value="low">Low Quality (Better for slow connections)</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-[#EF3866] bg-white border-black/20 rounded focus:ring-[#EF3866] focus:ring-offset-0"
                />
                <span className="font-sora text-[11px] sm:text-xs text-black dark:text-white">
                  Enable noise suppression
                </span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-[#EF3866] bg-white border-black/20 rounded focus:ring-[#EF3866] focus:ring-offset-0"
                />
                <span className="font-sora text-[11px] sm:text-xs text-black dark:text-white">
                  Automatically adjust microphone levels
                </span>
              </label>
            </div>

            <div>
              <label className="block font-sora text-[11px] sm:text-xs font-medium text-black/60 dark:text-white/60 mb-2">
                Sound Effects Volume
              </label>
              <div className="flex items-center gap-2 sm:gap-3">
                <VolumeX size={12} className="sm:w-3.5 sm:h-3.5 text-black/30 dark:text-white/30 shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="75"
                  className="flex-1 h-1 sm:h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #EF3866 75%, #e5e7eb 75%)`
                  }}
                />
                <Volume2 size={12} className="sm:w-3.5 sm:h-3.5 text-black/30 dark:text-white/30 shrink-0" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Network Quality Indicator */}
      <NetworkQualityIndicator networkQuality={networkQuality} />

      {/* Audio Mixer */}
      <AudioMixer
        onVolumeChange={handleMixerVolumeChange}
        micVolume={micVolume}
        musicVolume={audioVolume}
        isMicMuted={isMuted}
        isMusicMuted={!isMusicPlaying}
        onMicMute={handleMuteToggle}
        onMusicMute={stopMusic}
      />

      {/* Microphone Controls */}
      <MicrophoneControls connectionStatus={connectionStatus} />

      {/* Music Controls */}
      <MusicControls
        tracks={tracks}
        currentTrackId={currentTrackId}
        isPlaying={isMusicPlaying}
        audioVolume={audioVolume}
        isUploading={isUploading}
        connectionStatus={connectionStatus}
        publishedAudioTrack={publishedAudioTrack?.mediaStreamTrack ?? null}
        autoplayEnabled={autoplayEnabled}
        onToggleAutoplay={handleToggleAutoplay}
        onMusicUpload={handleMusicUpload}
        onPlayTrack={playTrack}
        onPlayNext={playNextTrack}
        onPlayPrevious={playPreviousTrack}
        onPause={pauseMusic}
        onResume={resumeMusic}
        onStop={stopMusic}
        onVolumeChange={setTrackVolume}
        onTrackEnded={handleTrackEnded}
      />

      {/* End Session Button */}
      <button
        onClick={handleEndSession}
        className="w-full bg-[#EF3866] hover:bg-[#d12b56] text-white py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-sora font-semibold text-xs sm:text-sm transition-all duration-200 active:scale-[0.98] shadow-lg shadow-[#EF3866]/20 flex items-center justify-center gap-2 disabled:opacity-40"
        disabled={connectionStatus === 'connecting'}
      >
        <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        End Live Session
      </button>
    </div>
  );
}