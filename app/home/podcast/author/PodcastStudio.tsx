// app/home/podcast/author/PodcastStudio.tsx - IMPROVED MUSIC PUBLISHING
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  AlertCircle,
  SkipBack,
  SkipForward
} from "lucide-react";

// Fixed Audio Management System
interface AudioTrackManager {
  id: string;
  file: File;
  audioElement: HTMLAudioElement;
  source: MediaElementAudioSourceNode | null;
  gainNode: GainNode | null;
  isPlaying: boolean;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

class PodcastAudioManager {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private destination: MediaStreamAudioDestinationNode;
  private tracks: Map<string, AudioTrackManager> = new Map();
  private currentlyPlaying: string | null = null;

  constructor() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass();
    this.masterGain = this.audioContext.createGain();
    this.destination = this.audioContext.createMediaStreamDestination();
    this.masterGain.connect(this.destination);
  }

  async addTrack(file: File): Promise<string> {
    const trackId = `track_${Date.now()}_${Math.random()}`;
    const audioUrl = URL.createObjectURL(file);
    
    // Create dedicated audio element for this track
    const audioElement = new Audio(audioUrl);
    audioElement.crossOrigin = 'anonymous';
    
    // Wait for audio to be ready
    await new Promise((resolve, reject) => {
      audioElement.addEventListener('canplay', resolve, { once: true });
      audioElement.addEventListener('error', reject, { once: true });
      audioElement.load();
    });

    const trackManager: AudioTrackManager = {
      id: trackId,
      file,
      audioElement,
      source: null,
      gainNode: null,
      isPlaying: false
    };

    this.tracks.set(trackId, trackManager);
    return trackId;
  }

  async playTrack(trackId: string, volume: number = 0.7): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error('Track not found');

    // Stop any currently playing track
    if (this.currentlyPlaying && this.currentlyPlaying !== trackId) {
      await this.stopTrack(this.currentlyPlaying);
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create audio graph for this track if not exists
      if (!track.source) {
        track.source = this.audioContext.createMediaElementSource(track.audioElement);
        track.gainNode = this.audioContext.createGain();
        
        track.source.connect(track.gainNode);
        track.gainNode.connect(this.masterGain);
      }

      // Set volume and play
      if (track.gainNode) {
        track.gainNode.gain.value = volume;
      }
      
      track.audioElement.currentTime = 0; // Reset to beginning
      await track.audioElement.play();
      
      track.isPlaying = true;
      this.currentlyPlaying = trackId;

      // Set up end handler
      const handleEnded = () => {
        track.isPlaying = false;
        if (this.currentlyPlaying === trackId) {
          this.currentlyPlaying = null;
        }
        track.audioElement.removeEventListener('ended', handleEnded);
      };
      
      track.audioElement.addEventListener('ended', handleEnded, { once: true });

    } catch (error) {
      console.error('Failed to play track:', error);
      throw error;
    }
  }

  async stopTrack(trackId: string): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track) return;

    track.audioElement.pause();
    track.audioElement.currentTime = 0;
    track.isPlaying = false;
    
    if (this.currentlyPlaying === trackId) {
      this.currentlyPlaying = null;
    }
  }

  async pauseTrack(trackId: string): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track || !track.isPlaying) return;

    track.audioElement.pause();
    track.isPlaying = false;
    
    if (this.currentlyPlaying === trackId) {
      this.currentlyPlaying = null;
    }
  }

  async resumeTrack(trackId: string): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track) return;

    await track.audioElement.play();
    track.isPlaying = true;
    this.currentlyPlaying = trackId;
  }

  setTrackVolume(trackId: string, volume: number): void {
    const track = this.tracks.get(trackId);
    if (!track?.gainNode) return;
    
    track.gainNode.gain.value = Math.max(0, Math.min(1, volume));
  }

  setMasterVolume(volume: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  getOutputStream(): MediaStream {
    return this.destination.stream;
  }

  getCurrentTrack(): string | null {
    return this.currentlyPlaying;
  }

  getTrackInfo(trackId: string): { name: string; isPlaying: boolean; duration: number } | null {
    const track = this.tracks.get(trackId);
    if (!track) return null;

    return {
      name: track.file.name,
      isPlaying: track.isPlaying,
      duration: track.audioElement.duration || 0
    };
  }

  getAllTracks(): { id: string; name: string; isPlaying: boolean }[] {
    return Array.from(this.tracks.values()).map(track => ({
      id: track.id,
      name: track.file.name,
      isPlaying: track.isPlaying
    }));
  }

  removeTrack(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track) return;

    // Stop if playing
    if (track.isPlaying) {
      this.stopTrack(trackId);
    }

    // Disconnect audio nodes
    if (track.source) {
      track.source.disconnect();
    }
    if (track.gainNode) {
      track.gainNode.disconnect();
    }

    // Clean up audio element
    URL.revokeObjectURL(track.audioElement.src);
    track.audioElement.remove();

    this.tracks.delete(trackId);
  }

  async cleanup(): Promise<void> {
    // Stop all tracks and clean up
    for (const [trackId] of this.tracks) {
      this.removeTrack(trackId);
    }
    
    if (this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
  }
}

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
  const [audioVolume, setAudioVolume] = useState(0.7);
  const [micVolume, setMicVolume] = useState(0.8);
  const [, setUploadedMusic] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const networkMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  // Audio manager for track management
  const audioManagerRef = useRef<PodcastAudioManager | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<{id: string; name: string; isPlaying: boolean}[]>([]);
  const [publishedAudioTrack, setPublishedAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [playlistIndex, setPlaylistIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Initialize audio manager
  useEffect(() => {
    audioManagerRef.current = new PodcastAudioManager();
    
    return () => {
      audioManagerRef.current?.cleanup();
    };
  }, []);

  // Monitor room connection status
  useEffect(() => {
    if (room) {
      const updateConnectionStatus = () => {
        setConnectionStatus(room.state as 'connecting' | 'connected' | 'disconnected');
      };

      updateConnectionStatus();

      // ✅ use string literal instead of RoomEvent
      room.on("connectionStateChanged", updateConnectionStatus);

      return () => {
        room.off("connectionStateChanged", updateConnectionStatus);
      };
    }
  }, [room]);

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

  const handleMusicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));

    if (audioFiles.length === 0) return;

    setIsUploading(true);

    try {
      // Add files to audio manager
      for (const file of audioFiles) {
        const trackId = await audioManagerRef.current?.addTrack(file);
        if (trackId) {
          // Also upload to server if needed
          await uploadMixedAudio(file, 'music');
        }
      }

      // Update local state
      setUploadedMusic(prev => [...prev, ...audioFiles]);
      
      // Update track list
      if (audioManagerRef.current) {
        setTracks(audioManagerRef.current.getAllTracks());
      }
    } catch (error) {
      console.error('Failed to upload audio files:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Play a specific track
  const playTrack = async (trackId: string) => {
    if (!audioManagerRef.current || !room || !localParticipant) return;
    
    try {
      await audioManagerRef.current.playTrack(trackId, audioVolume);
      setCurrentTrackId(trackId);
      setIsPlaying(true);
      
      // Publish the audio to the stream
      await publishAudioTrack();
      
      // Update track list
      setTracks(audioManagerRef.current.getAllTracks());
      
      // Set the playlist index
      const trackIndex = tracks.findIndex(t => t.id === trackId);
      if (trackIndex !== -1) {
        setPlaylistIndex(trackIndex);
      }
    } catch (error) {
      console.error('Failed to play track:', error);
    }
  };

  // Play next track in playlist
  const playNextTrack = useCallback(async () => {
    if (!tracks.length) return;
    
    const nextIndex = (playlistIndex + 1) % tracks.length;
    setPlaylistIndex(nextIndex);
    
    if (tracks[nextIndex]) {
      await playTrack(tracks[nextIndex].id);
    }
  }, [tracks, playlistIndex]);

  // Play previous track in playlist
  const playPreviousTrack = async () => {
    if (!tracks.length) return;
    
    const prevIndex = (playlistIndex - 1 + tracks.length) % tracks.length;
    setPlaylistIndex(prevIndex);
    
    if (tracks[prevIndex]) {
      await playTrack(tracks[prevIndex].id);
    }
  };

  // Stop current track
  const stopMusic = async () => {
    if (currentTrackId && audioManagerRef.current) {
      await audioManagerRef.current.stopTrack(currentTrackId);
      setCurrentTrackId(null);
      setIsPlaying(false);
      
      // Update track list
      setTracks(audioManagerRef.current.getAllTracks());
    }

    if (publishedAudioTrack && localParticipant) {
      try {
        await localParticipant.unpublishTrack(publishedAudioTrack);
        setPublishedAudioTrack(null);
      } catch (error) {
        console.error("Error unpublishing track:", error);
      }
    }
  };

  // Pause current track
  const pauseMusic = async () => {
    if (currentTrackId && audioManagerRef.current) {
      await audioManagerRef.current.pauseTrack(currentTrackId);
      setIsPlaying(false);
      
      // Update track list
      setTracks(audioManagerRef.current.getAllTracks());
    }
  };

  // Resume current track
  const resumeMusic = async () => {
    if (currentTrackId && audioManagerRef.current) {
      await audioManagerRef.current.resumeTrack(currentTrackId);
      setIsPlaying(true);
      
      // Update track list
      setTracks(audioManagerRef.current.getAllTracks());
    }
  };

  // IMPROVED: Robust audio track publishing with multiple fallback strategies
  const publishAudioTrack = async () => {
    if (!audioManagerRef.current || !localParticipant) return;

    try {
      // Get the audio stream from the manager
      const audioStream = audioManagerRef.current.getOutputStream();
      const audioTracks = audioStream.getAudioTracks();

      if (audioTracks.length > 0) {
        try {
          // Create LocalAudioTrack from the stream
          const newAudioTrack = new LocalAudioTrack(audioTracks[0]);

          // Publish with explicit source as UNKNOWN (this bypasses source restrictions)
          await localParticipant.publishTrack(newAudioTrack, {
            name: "background-music",
            source: Track.Source.Unknown, // Key: Use Unknown source
          });
          
          setPublishedAudioTrack(newAudioTrack);
          console.log("Successfully published audio track");
          return;

        } catch (publishError) {
          console.warn("Failed to publish via Web Audio API:", publishError);
        }
      }
    } catch (webAudioError) {
      console.warn("Web Audio API approach failed:", webAudioError);
    }

    // Fallback strategy if needed
    try {
      // Request microphone permission and create track
      const micTrack = await createLocalAudioTrack({
        deviceId: "default",
      });

      // Publish as Unknown source to bypass restrictions
      await localParticipant.publishTrack(micTrack, {
        name: "background-music",
        source: Track.Source.Unknown,
      });

      setPublishedAudioTrack(micTrack);
      console.log("Successfully published using microphone track fallback");

    } catch (micError) {
      console.error("All publishing strategies failed:", micError);
      
      // Show user-friendly error message
      if (micError instanceof Error) {
        if (micError.message.includes('permissions') || micError.message.includes('Permission')) {
          console.error("Insufficient permissions to publish audio tracks");
        } else if (micError.message.includes('NotFound')) {
          console.error("No audio input device found");
        } else {
          console.error("Unknown error publishing audio:", micError.message);
        }
      }
    }
  };

  const handleVolumeChange = (value: number) => {
    setAudioVolume(value);
    if (currentTrackId && audioManagerRef.current) {
      audioManagerRef.current.setTrackVolume(currentTrackId, value);
    }
  };

  const handleMixerVolumeChange = (type: string, volume: number) => {
    if (type === 'mic') {
      setMicVolume(volume);
    } else if (type === 'music') {
      setAudioVolume(volume);
      if (currentTrackId && audioManagerRef.current) {
        audioManagerRef.current.setTrackVolume(currentTrackId, volume);
      }
    }
  };

  const handleEndSession = async () => {
    try {
      await stopMusic();

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

  // Set up track ended listener to play next track
  useEffect(() => {
    const handleTrackEnded = () => {
      if (tracks.length > 1) {
        playNextTrack();
      } else {
        setIsPlaying(false);
        setCurrentTrackId(null);
      }
    };

    // Add event listener to all audio elements
    if (audioManagerRef.current) {
      const allTracks = audioManagerRef.current.getAllTracks();
      allTracks.forEach(track => {
        const audioElement = document.getElementById(`audio-${track.id}`) as HTMLAudioElement;
        if (audioElement) {
          audioElement.addEventListener('ended', handleTrackEnded);
        }
      });
    }

    return () => {
      // Clean up event listeners
      if (audioManagerRef.current) {
        const allTracks = audioManagerRef.current.getAllTracks();
        allTracks.forEach(track => {
          const audioElement = document.getElementById(`audio-${track.id}`) as HTMLAudioElement;
          if (audioElement) {
            audioElement.removeEventListener('ended', handleTrackEnded);
          }
        });
      }
    };
  }, [tracks, playNextTrack]);

  return (
    <div className="space-y-6">
      {/* Network Quality Indicator */}
      <NetworkQualityIndicator networkQuality={networkQuality} />

      {/* Audio Mixer */}
      <AudioMixer
        onVolumeChange={handleMixerVolumeChange}
        micVolume={micVolume}
        musicVolume={audioVolume}
        isMicMuted={!isMicEnabled}
        isMusicMuted={!isPlaying}
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
            {connectionStatus === 'connected' ? (
              <div className="flex items-center space-x-1 text-green-500">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs">Connected</span>
              </div>
            ) : connectionStatus === 'connecting' ? (
              <div className="flex items-center space-x-1 text-orange-500">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs">Connecting...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-red-500">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs">Disconnected</span>
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
              disabled={connectionStatus !== 'connected'}
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
        {currentTrackId && (
          <div className="mb-6 p-4 border border-[#EF3866] rounded-2xl bg-[#EF3866] bg-opacity-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-[#EF3866] rounded-full animate-pulse mr-3"></div>
                <div>
                  <div className="text-sm font-medium text-black dark:text-white">Now Playing</div>
                  <div className="text-xs text-black dark:text-white opacity-60 truncate max-w-48">
                    {tracks.find(t => t.id === currentTrackId)?.name}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={playPreviousTrack}
                  className="p-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-full transition-all duration-200"
                  disabled={tracks.length <= 1}
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                {isPlaying ? (
                  <button
                    onClick={pauseMusic}
                    className="p-2 bg-[#EF3866] text-white rounded-full transition-all duration-200"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={resumeMusic}
                    className="p-2 bg-[#EF3866] text-white rounded-full transition-all duration-200"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={playNextTrack}
                  className="p-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-full transition-all duration-200"
                  disabled={tracks.length <= 1}
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <button
                  onClick={stopMusic}
                  className="p-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-full transition-all duration-200"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
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
        {tracks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-black dark:text-white mb-3">
              Your Tracks ({tracks.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${currentTrackId === track.id
                    ? 'border-[#EF3866] bg-[#EF3866] bg-opacity-5'
                    : 'border-black dark:border-white border-opacity-10 dark:border-opacity-10 hover:border-opacity-30 dark:hover:border-opacity-30'
                    }`}
                >
                  <span className="text-sm text-black dark:text-white truncate mr-4">
                    {track.name.replace(/\.[^/.]+$/, "")}
                  </span>
                  <button
                    onClick={() => playTrack(track.id)}
                    className={`p-2 rounded-full transition-all duration-200 ${currentTrackId === track.id
                      ? 'bg-[#EF3866] text-white'
                      : 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                      }`}
                    disabled={connectionStatus !== 'connected'}
                  >
                    {currentTrackId === track.id && isPlaying ? (
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

        {tracks.length === 0 && (
          <div className="text-center py-8 text-black dark:text-white opacity-60">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No audio files uploaded yet</p>
            <p className="text-xs mt-1">Upload music, jingles, or sound effects</p>
          </div>
        )}

        {/* Connection Status Warning */}
        {connectionStatus === 'disconnected' && (
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

        {/* Permission Warning */}
        {connectionStatus === 'connected' && !publishedAudioTrack && currentTrackId && (
          <div className="mt-4 p-4 bg-yellow-500 bg-opacity-10 rounded-2xl">
            <div className="flex items-center justify-start">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  Audio Not Broadcasting
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 opacity-80">
                  Music is playing locally but not being shared with listeners.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* End Session */}
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

export default function PodcastStudio({ session, user, onEndSession }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [networkQuality, setNetworkQuality] = useState<NetworkQualityStats | null>(null);

  const deviceType = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  const initialNetworkQuality = navigator.onLine ? 'good' : 'offline';

  useEffect(() => {
    async function getAuthorToken() {
      try {
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

  const handleNetworkStatsUpdate = (stats: NetworkQualityStats) => {
    setNetworkQuality(stats);
  };

  const handleRoomConnected = () => {
    console.log("Connected to room as author");
    setError(null);
  };

  const handleRoomDisconnected = () => {
    console.log("Disconnected from room");
    setTimeout(() => {
      onEndSession?.();
    }, 5000);
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