// app/home/podcast/author/components/AudioControls.tsx - MAIN AUDIO CONTROLS COMPONENT
import React, { useState, useEffect } from 'react';
import { Square, Mic, MicOff, Volume2, VolumeX, Settings, Headphones } from 'lucide-react';
import { useLocalParticipant, useMaybeRoomContext } from "@livekit/components-react";
import { LiveSession } from "@/types/podcast";

import { AudioMixer } from './AudioMixer';
import { NetworkQualityIndicator } from './NetworkQualityIndicator';
import { MicrophoneControls } from './MicrophoneControls';
import { MusicControls } from './MusicControls';
import { SoundEffectsPanel } from './SoundEffectsPanel';
import { useAudioManager } from '../hooks/useAudioManager';
import { useNetworkMonitoring } from '../hooks/useNetworkMonitoring';
import { useSoundEffects } from '../hooks/useSoundEffects';
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
    setTrackVolume
  } = useAudioManager();

  const {
    effects,
    playSound,
    isPlaying: isSoundEffectPlaying,
    stopAllSounds
  } = useSoundEffects();

  const { startNetworkMonitoring, stopNetworkMonitoring } = useNetworkMonitoring();

  // Quick access to favorite effects (first 6)
  const quickAccessEffects = effects.slice(0, 6);

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

  const getConnectionColor = () => {
    if (connectionStatus === 'connecting') return 'text-blue-500';
    if (connectionStatus === 'disconnected') return 'text-red-500';
    
    switch (networkQuality?.quality) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-yellow-500';
      case 'poor':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
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
    <div className="space-y-6">
      {/* Main Audio Controls Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Studio Controls
          </h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getConnectionColor()}`} />
            <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {connectionStatus} ({getNetworkQualityText()})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Microphone Controls */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Microphone
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={handleMuteToggle}
                className={`p-3 rounded-full transition-colors ${
                  isMuted
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-[#EF3866] hover:bg-[#d12b56] text-white'
                }`}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <VolumeX size={16} className="text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    disabled={isMuted}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50"
                  />
                  <Volume2 size={16} className="text-gray-400" />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {isMuted ? 'Muted' : `${volume}%`}
                </div>
              </div>
            </div>
          </div>

          {/* Session Info */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Session
            </label>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {session.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                ID: {session.id}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSoundEffects(!showSoundEffects)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Headphones size={16} />
              Sound Effects
              {effects.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-[#EF3866] text-white rounded-full">
                  {effects.length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Settings size={16} />
              Settings
            </button>
          </div>

          <button
            onClick={handleEndSession}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            disabled={connectionStatus === 'connecting'}
          >
            End Session
          </button>
        </div>
      </div>

      {/* Quick Access Sound Effects */}
      {!showSoundEffects && quickAccessEffects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Quick Effects
            </h3>
            <button
              onClick={() => setShowSoundEffects(true)}
              className="text-sm text-[#EF3866] hover:text-[#d12b56] transition-colors"
            >
              View All ({effects.length})
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickAccessEffects.map((effect) => (
              <button
                key={effect.id}
                onClick={() => playSound(effect.id)}
                disabled={isMuted}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                  isSoundEffectPlaying(effect.id)
                    ? 'bg-[#EF3866] text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={effect.title}
              >
                <div className="truncate">{effect.title}</div>
                {effect.category && (
                  <div className="text-xs opacity-75 truncate capitalize">
                    {effect.category}
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {isMuted && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Unmute to use sound effects
            </p>
          )}
        </div>
      )}

      {/* Full Sound Effects Panel */}
      {showSoundEffects && (
  <SoundEffectsPanel className="shadow-lg" />
)}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Audio Settings
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Audio Quality
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#EF3866] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="high">High Quality</option>
                <option value="medium">Medium Quality</option>
                <option value="low">Low Quality (Better for slow connections)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Noise Suppression
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-[#EF3866] bg-gray-100 border-gray-300 rounded focus:ring-[#EF3866] dark:focus:ring-[#EF3866] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Enable noise suppression
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Auto Gain Control
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-[#EF3866] bg-gray-100 border-gray-300 rounded focus:ring-[#EF3866] dark:focus:ring-[#EF3866] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Automatically adjust microphone levels
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sound Effects Volume
              </label>
              <div className="flex items-center gap-3">
                <VolumeX size={16} className="text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="75"
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <Volume2 size={16} className="text-gray-400" />
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
        onMusicUpload={handleMusicUpload}
        onPlayTrack={playTrack}
        onPlayNext={playNextTrack}
        onPlayPrevious={playPreviousTrack}
        onPause={pauseMusic}
        onResume={resumeMusic}
        onStop={stopMusic}
        onVolumeChange={setTrackVolume}
      />

      {/* End Session Button */}
      <button
        onClick={handleEndSession}
        className="w-full bg-[#EF3866] hover:bg-[#d12b56] text-white py-4 rounded-full font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center"
        disabled={connectionStatus === 'connecting'}
      >
        <Square className="w-4 h-4 mr-2" />
        End Live Session
      </button>
    </div>
  );
}