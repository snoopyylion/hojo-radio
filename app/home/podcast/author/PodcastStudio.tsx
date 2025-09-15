// app/home/podcast/author/PodcastStudio.tsx - FIXED MUSIC PUBLISHING
"use client";

import { useState, useEffect, useRef } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useMaybeRoomContext,
  TrackToggle,
} from "@livekit/components-react";
import { Track, LocalAudioTrack, createLocalAudioTrack } from "livekit-client";
import { LiveSession, User } from "@/types/podcast";
import {
  Mic,
  MicOff,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  Users,
  Clock,
  Radio,
  Square,
  SlidersVertical,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface Props {
  session: LiveSession;
  user: User;
  onEndSession: () => void;
  networkQuality: "high" | "medium" | "low";
}

interface AudioTrack {
  id: number;
  name: string;
  volume: number;
  muted: boolean;
  type: 'mic' | 'music' | 'sfx';
}

interface NetworkQualityStats {
  quality: 'excellent' | 'good' | 'medium' | 'poor' | 'offline';
  latency: number;
  jitter: number;
  packetLoss: number;
  bandwidth: number;
}

function AudioMixer({
  onVolumeChange,
  micVolume,
  musicVolume,
  isMicMuted,
  isMusicMuted,
  onMicMute,
  onMusicMute
}: {
  onVolumeChange: (type: string, volume: number) => void;
  micVolume: number;
  musicVolume: number;
  isMicMuted: boolean;
  isMusicMuted: boolean;
  onMicMute: () => void;
  onMusicMute: () => void;
}) {
  const [tracks, setTracks] = useState<AudioTrack[]>([
    { id: 1, name: 'Microphone', volume: micVolume, muted: isMicMuted, type: 'mic' },
    { id: 2, name: 'Background Music', volume: musicVolume, muted: isMusicMuted, type: 'music' },
    { id: 3, name: 'Sound Effects', volume: 0.5, muted: true, type: 'sfx' }
  ]);

  // Update tracks when props change
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

    // Apply volume changes to actual audio tracks
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

    // Apply mute changes to actual audio tracks
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

    // Apply preset changes
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

      {/* Presets */}
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

function NetworkQualityIndicator({ networkQuality }: { networkQuality: NetworkQualityStats | null }) {
  if (!networkQuality) return null;

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-green-400';
      case 'medium': return 'text-yellow-500';
      case 'poor': return 'text-orange-500';
      case 'offline': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getQualityIcon = (quality: string) => {
    if (quality === 'offline') {
      return <WifiOff className="w-4 h-4" />;
    }
    return <Wifi className="w-4 h-4" />;
  };

  return (
    <div className="border border-black dark:border-white rounded-3xl p-4">
      <h4 className="text-sm font-medium text-black dark:text-white mb-3 flex items-center">
        {getQualityIcon(networkQuality.quality)}
        <span className="ml-2">Network Quality</span>
      </h4>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${networkQuality.quality === 'excellent' ? 'bg-green-500 animate-pulse' : networkQuality.quality === 'good' ? 'bg-green-400' : networkQuality.quality === 'medium' ? 'bg-yellow-500' : networkQuality.quality === 'poor' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
          <span className={`text-sm font-medium capitalize ${getQualityColor(networkQuality.quality)}`}>
            {networkQuality.quality}
          </span>
        </div>

        <div className="text-xs text-black dark:text-white opacity-60">
          {networkQuality.latency}ms | {networkQuality.packetLoss.toFixed(1)}% loss
        </div>
      </div>

      {networkQuality.quality === 'poor' && (
        <div className="mt-2 p-2 bg-orange-500 bg-opacity-10 rounded-lg">
          <p className="text-xs text-orange-600 dark:text-orange-400">
            Poor connection detected. Consider moving closer to your router.
          </p>
        </div>
      )}
    </div>
  );
}

function AudioControls({
  onEndSession,
  session,
  networkQuality,
  onNetworkStatsUpdate
}: {
  onEndSession?: () => void;
  session: LiveSession;
  networkQuality: NetworkQualityStats | null;
  onNetworkStatsUpdate: (stats: NetworkQualityStats) => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const room = useMaybeRoomContext();
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isPlayingJingle, setIsPlayingJingle] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.7);
  const [micVolume, setMicVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const [uploadedMusic, setUploadedMusic] = useState<File[]>([]);
  const [currentTrack, setCurrentTrack] = useState<string>("");
  const [publishedAudioTrack, setPublishedAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const networkMonitorRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context for proper audio routing
useEffect(() => {
  const initAudioContext = async () => {
    try {
      // Properly handle browser-specific AudioContext types
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      gainNodeRef.current = audioContextRef.current.createGain();
      destinationRef.current = audioContextRef.current.createMediaStreamDestination();
      
      gainNodeRef.current.connect(destinationRef.current);
      gainNodeRef.current.gain.value = audioVolume;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  };

  initAudioContext();

  return () => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };
}, []);

  // Network quality monitoring
  const monitorNetworkQuality = async (stats: NetworkQualityStats) => {
    try {
      await fetch('/api/podcast/network-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          networkStats: stats,
          deviceInfo: { userAgent: navigator.userAgent },
          connectionType: navigator.onLine ? 'wifi' : 'offline'
        })
      });
    } catch (error) {
      console.error('Network monitoring failed:', error);
    }
  };

  // Upload mixed audio functionality
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

  // Start network monitoring when component mounts
  useEffect(() => {
    const startNetworkMonitoring = () => {
      networkMonitorRef.current = setInterval(async () => {
        if (room && localParticipant) {
          try {
            let quality: NetworkQualityStats['quality'] = 'medium';
            const latency = 0;
            const jitter = 0;
            const packetLoss = 0;
            const bandwidth = 0;

            const connectionQuality = localParticipant.connectionQuality;
            switch (connectionQuality) {
              case 'excellent':
                quality = 'excellent';
                break;
              case 'good':
                quality = 'good';
                break;
              case 'poor':
                quality = 'poor';
                break;
              case 'unknown':
                quality = 'offline';
                break;
              default:
                quality = 'medium';
            }

            if (!navigator.onLine) quality = 'offline';

            const networkStats: NetworkQualityStats = {
              quality,
              latency: Math.round(latency),
              jitter: Math.round(jitter * 1000),
              packetLoss,
              bandwidth
            };

            onNetworkStatsUpdate(networkStats);
            await monitorNetworkQuality(networkStats);
          } catch (error) {
            console.error('Network monitoring error:', error);
          }
        }
      }, 5000);
    };

    if (room && localParticipant) {
      startNetworkMonitoring();
    }

    return () => {
      if (networkMonitorRef.current) {
        clearInterval(networkMonitorRef.current);
      }
    };
  }, [room, localParticipant, session.id, networkQuality, onNetworkStatsUpdate]);

  const toggleMicrophone = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicEnabled);
      setIsMicEnabled(!isMicEnabled);
    }
  };

  // Updated handleMusicUpload function
  const handleMusicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));

    if (audioFiles.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = audioFiles.map(file => uploadMixedAudio(file, 'music'));
      await Promise.all(uploadPromises);

      setUploadedMusic(prev => [...prev, ...audioFiles]);
    } catch (error) {
      console.error('Failed to upload audio files:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // FIXED: Improved music playback with proper audio routing
  const playMusic = async (file: File) => {
    if (!room || !localParticipant || !audioContextRef.current || !gainNodeRef.current || !destinationRef.current) {
      console.error('Room or audio context not ready');
      return;
    }

    try {
      const audioUrl = URL.createObjectURL(file);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.volume = audioVolume;

        if (isPlayingJingle) {
          // Stop current playback
          audioRef.current.pause();
          setIsPlayingJingle(false);
          setCurrentTrack("");

          // Unpublish the track if it exists
          if (publishedAudioTrack) {
            localParticipant.unpublishTrack(publishedAudioTrack);
            setPublishedAudioTrack(null);
          }
        } else {
          // Start new playback
          await audioRef.current.play();
          setIsPlayingJingle(true);
          setCurrentTrack(file.name);

          // Create audio source from the audio element
          if (sourceNodeRef.current) {
            sourceNodeRef.current.disconnect();
          }

          sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
          sourceNodeRef.current.connect(gainNodeRef.current);

          // Get the audio stream from destination
          const audioStream = destinationRef.current.stream;

          // Create a new audio track from the stream
          const audioTracks = audioStream.getAudioTracks();
          if (audioTracks.length > 0) {
            try {
              // Create a local audio track from the media stream
              const newAudioTrack = new LocalAudioTrack(audioTracks[0]);

              // Publish the track with proper metadata
              await localParticipant.publishTrack(newAudioTrack, {
                name: "background-music",
                source: Track.Source.Unknown,
              });
              setPublishedAudioTrack(newAudioTrack);
            } catch (error) {
              console.error("Failed to publish audio track:", error);

              // Fallback: try to create track directly
              try {
                const newAudioTrack = await createLocalAudioTrack({
                  deviceId: "default",
                });

                // Set track name after creation
                await localParticipant.publishTrack(newAudioTrack, {
                  name: "background-music",
                  source: Track.Source.Unknown,
                });
                setPublishedAudioTrack(newAudioTrack);
              } catch (fallbackError) {
                console.error("Fallback audio publishing failed:", fallbackError);

                // Check if it's a permissions error
                if (fallbackError instanceof Error && fallbackError.message.includes('permissions')) {
                  console.error("User doesn't have permission to publish audio tracks");
                  // You might want to show a user-friendly error message here
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error playing music:", error);
      setIsPlayingJingle(false);
      setCurrentTrack("");
    }
  };

  const stopMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingJingle(false);
      setCurrentTrack("");
    }

    if (publishedAudioTrack && localParticipant) {
      localParticipant.unpublishTrack(publishedAudioTrack);
      setPublishedAudioTrack(null);
    }
  };

  const handleVolumeChange = (value: number) => {
    setAudioVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = value;
    }
  };

  const handleMixerVolumeChange = (type: string, volume: number) => {
    if (type === 'mic') {
      setMicVolume(volume);
      // Apply microphone volume changes if needed
    } else if (type === 'music') {
      setAudioVolume(volume);
      if (audioRef.current) {
        audioRef.current.volume = volume;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = volume;
      }
    }
  };

  const handleEndSession = async () => {
    try {
      stopMusic();

      // Clear network monitoring
      if (networkMonitorRef.current) {
        clearInterval(networkMonitorRef.current);
      }

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
      <audio
        ref={audioRef}
        onEnded={() => {
          setIsPlayingJingle(false);
          setCurrentTrack("");
          if (publishedAudioTrack && localParticipant) {
            localParticipant.unpublishTrack(publishedAudioTrack);
            setPublishedAudioTrack(null);
          }
        }}
        hidden
      />

      {/* Network Quality Indicator */}
      <NetworkQualityIndicator networkQuality={networkQuality} />

      {/* Audio Mixer */}
      <AudioMixer
        onVolumeChange={handleMixerVolumeChange}
        micVolume={micVolume}
        musicVolume={audioVolume}
        isMicMuted={!isMicEnabled}
        isMusicMuted={!isPlayingJingle}
        onMicMute={toggleMicrophone}
        onMusicMute={stopMusic}
      />

      {/* Microphone Controls */}
      <div className="border border-black dark:border-white rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-black dark:text-white flex items-center">
            <Radio className="w-5 h-5 mr-3" />
            Audio Control
          </h3>

          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {room?.state === 'connected' ? (
              <div className="flex items-center space-x-1 text-green-500">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs">Connected</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-orange-500">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs">Connecting...</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleMicrophone}
              className={`flex items-center px-6 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 ${isMicEnabled
                ? 'bg-[#EF3866] text-white shadow-lg'
                : 'bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white'
                }`}
              disabled={room?.state !== 'connected'}
            >
              {isMicEnabled ? (
                <Mic className="w-4 h-4 mr-2" />
              ) : (
                <MicOff className="w-4 h-4 mr-2" />
              )}
              {isMicEnabled ? 'Live' : 'Muted'}
            </button>

            <TrackToggle
              source={Track.Source.Microphone}
              className="px-6 flex py-3 gap-2 border border-black dark:border-white rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-200 text-black dark:text-white text-sm"
            >
              Toggle
            </TrackToggle>
          </div>

          <div className="text-sm text-black dark:text-white opacity-60">
            {isMicEnabled ? 'Broadcasting' : 'Audio Off'}
          </div>
        </div>
      </div>

      {/* Music & Audio Library */}
      <div className="border border-black dark:border-white rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-black dark:text-white flex items-center">
            <Music className="w-5 h-5 mr-3" />
            Audio Library
          </h3>

          <label className="cursor-pointer">
            <input
              type="file"
              accept="audio/*"
              multiple
              onChange={handleMusicUpload}
              className="hidden"
              disabled={isUploading}
            />
            <div className={`flex items-center px-4 py-2 border border-black dark:border-white rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-200 text-black dark:text-white ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload'}
            </div>
          </label>
        </div>

        {/* Current Track */}
        {currentTrack && (
          <div className="mb-6 p-4 border border-[#EF3866] rounded-2xl bg-[#EF3866] bg-opacity-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-[#EF3866] rounded-full animate-pulse mr-3"></div>
                <div>
                  <div className="text-sm font-medium text-black dark:text-white">Now Playing</div>
                  <div className="text-xs text-black dark:text-white opacity-60 truncate max-w-48">
                    {currentTrack}
                  </div>
                </div>
              </div>
              <button
                onClick={stopMusic}
                className="p-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-full transition-all duration-200"
              >
                <Square className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Volume Control */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-black dark:text-white flex items-center">
              <Volume2 className="w-4 h-4 mr-2" />
              Volume
            </label>
            <span className="text-sm text-black dark:text-white opacity-60">
              {Math.round(audioVolume * 100)}%
            </span>
          </div>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={audioVolume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-black dark:bg-white bg-opacity-10 dark:bg-opacity-10 rounded-full appearance-none cursor-pointer slider"
            />
            <style jsx>{`
              .slider::-webkit-slider-thumb {
                appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #EF3866;
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              }
              .slider::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #EF3866;
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              }
            `}</style>
          </div>
        </div>

        {/* Music Library */}
        {uploadedMusic.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-black dark:text-white mb-3">
              Your Tracks ({uploadedMusic.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {uploadedMusic.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${currentTrack === file.name
                    ? 'border-[#EF3866] bg-[#EF3866] bg-opacity-5'
                    : 'border-black dark:border-white border-opacity-10 dark:border-opacity-10 hover:border-opacity-30 dark:hover:border-opacity-30'
                    }`}
                >
                  <span className="text-sm text-black dark:text-white truncate mr-4">
                    {file.name.replace(/\.[^/.]+$/, "")}
                  </span>
                  <button
                    onClick={() => playMusic(file)}
                    className={`p-2 rounded-full transition-all duration-200 ${currentTrack === file.name
                      ? 'bg-[#EF3866] text-white'
                      : 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                      }`}
                    disabled={room?.state !== 'connected'}
                  >
                    {currentTrack === file.name ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadedMusic.length === 0 && (
          <div className="text-center py-8 text-black dark:text-white opacity-60">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No audio files uploaded yet</p>
            <p className="text-xs mt-1">Upload music, jingles, or sound effects</p>
          </div>
        )}

        {/* Quick reconnect for better experience */}
        {room?.state === 'disconnected' && (
          <div className="mt-4 p-4 bg-orange-500 bg-opacity-10 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  Connection Lost
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 opacity-80">
                  Attempting to reconnect...
                </p>
              </div>
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        )}
      </div>

      {/* End Session */}
      <button
        onClick={handleEndSession}
        className="w-full bg-[#EF3866] hover:bg-[#d12b56] text-white py-4 rounded-full font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center"
        disabled={room?.state === 'connecting'}
      >
        <Square className="w-4 h-4 mr-2" />
        End Live Session
      </button>
    </div>
  );
}

export default function PodcastStudio({ session, user, onEndSession }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [networkQuality, setNetworkQuality] = useState<NetworkQualityStats | null>(null);

  // Detect device type and initial network quality
  const deviceType = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  const initialNetworkQuality = navigator.onLine ? 'good' : 'offline';

  useEffect(() => {
    async function getAuthorToken() {
      try {
        // Updated token request with network quality and device type
        const res = await fetch(
          `/api/livekit/token?room=${session.roomName}&identity=${user.id}&role=author&networkQuality=${initialNetworkQuality}&deviceType=${deviceType}`
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setToken(data.token);
      } catch (error) {
        console.error("Failed to get author token:", error);
        setError(error instanceof Error ? error.message : "Failed to get token");
      } finally {
        setIsConnecting(false);
      }
    }

    getAuthorToken();
  }, [session.roomName, user.id, initialNetworkQuality, deviceType]);

  // Network quality update handler
  const handleNetworkStatsUpdate = (stats: NetworkQualityStats) => {
    setNetworkQuality(stats);
  };

  // Handle connection state changes
  const handleRoomConnected = () => {
    console.log("Connected to room as author");
    setError(null);
  };

  const handleRoomDisconnected = () => {
    console.log("Disconnected from room");
    // Don't immediately call onEndSession to allow for reconnection attempts
    setTimeout(() => {
      onEndSession?.();
    }, 5000); // Wait 5 seconds before ending session
  };

  const handleRoomError = (roomError: Error) => {
    console.error("LiveKit room error:", roomError);
    setError(roomError.message);
  };

  if (isConnecting) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="border border-black dark:border-white rounded-3xl p-12 text-center">
          <div className="w-16 h-16 border-4 border-[#EF3866] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
            Setting up your studio
          </h3>
          <p className="text-sm text-black dark:text-white opacity-60">
            Connecting to live audio room...
          </p>
          <div className="mt-4 text-xs text-black dark:text-white opacity-40">
            Device: {deviceType} | Network: {initialNetworkQuality}
          </div>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="border border-[#EF3866] rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-[#EF3866] rounded-full flex items-center justify-center mx-auto mb-6">
            <Radio className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
            Studio Setup Failed
          </h3>
          <p className="text-sm text-black dark:text-white opacity-60 mb-6">
            {error || "Unable to get access token"}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="bg-[#EF3866] hover:bg-[#d12b56] text-white px-6 py-3 rounded-full font-semibold transition-all duration-200"
            >
              Retry Setup
            </button>
            <div className="text-xs text-black dark:text-white opacity-40">
              If problems persist, check your internet connection
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Session Header */}
      <div className="text-center border border-black dark:border-white rounded-3xl p-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-4 h-4 bg-[#EF3866] rounded-full animate-pulse"></div>
          <span className="text-[#EF3866] font-bold uppercase tracking-wider text-sm">
            Live Broadcasting
          </span>
        </div>

        <h1 className="text-3xl font-bold text-black dark:text-white mb-3">
          {session.title}
        </h1>

        {session.description && (
          <p className="text-black dark:text-white opacity-70 mb-4 max-w-md mx-auto">
            {session.description}
          </p>
        )}

        <div className="flex items-center justify-center space-x-8 text-sm text-black dark:text-white opacity-60">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>{session.listenerCount} listening</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Started {new Date(session.startedAt).toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-black dark:text-white opacity-40">
          <span>Room: {session.roomName}</span>
          <span>•</span>
          <span>Device: {deviceType}</span>
          {networkQuality && (
            <>
              <span>•</span>
              <span className={`capitalize ${networkQuality.quality === 'excellent' ? 'text-green-500' : networkQuality.quality === 'good' ? 'text-green-400' : networkQuality.quality === 'medium' ? 'text-yellow-500' : networkQuality.quality === 'poor' ? 'text-orange-500' : 'text-red-500'}`}>
                {networkQuality.quality} connection
              </span>
            </>
          )}
        </div>
      </div>

      {/* LiveKit Room */}
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL!}
        connect={true}
        onConnected={handleRoomConnected}
        onDisconnected={handleRoomDisconnected}
        onError={handleRoomError}
        options={{
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: {
            audioPreset: {
              maxBitrate: networkQuality?.quality === 'poor' ? 32000 : 64000,
            },
          },
        }}
      >
        <RoomAudioRenderer />
        <AudioControls
          onEndSession={onEndSession}
          session={session}
          networkQuality={networkQuality}
          onNetworkStatsUpdate={handleNetworkStatsUpdate}
        />
      </LiveKitRoom>
    </div>
  );
}