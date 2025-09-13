// app/home/podcast/author/PodcastStudio.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useMaybeRoomContext,
  TrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
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
  SlidersVertical
} from "lucide-react";

interface Props {
  session: LiveSession;
  user: User;
  onEndSession?: () => void;
}

interface AudioTrack {
  id: number;
  name: string;
  volume: number;
  muted: boolean;
  type: 'mic' | 'music' | 'sfx';
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
              className={`p-2 rounded-full transition-all duration-200 ${
                track.muted 
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

function AudioControls({ onEndSession }: { onEndSession?: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const room = useMaybeRoomContext();
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isPlayingJingle, setIsPlayingJingle] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.7);
  const [micVolume, setMicVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [uploadedMusic, setUploadedMusic] = useState<File[]>([]);
  const [currentTrack, setCurrentTrack] = useState<string>("");
  const [musicTrack, setMusicTrack] = useState<MediaStreamTrack | null>(null);

  const toggleMicrophone = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicEnabled);
      setIsMicEnabled(!isMicEnabled);
    }
  };

  const handleMusicUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    setUploadedMusic(prev => [...prev, ...audioFiles]);
  };

  const playMusic = async (file: File) => {
    if (!room || !localParticipant) return;

    try {
      const audioUrl = URL.createObjectURL(file);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.volume = audioVolume;

        if (isPlayingJingle) {
          audioRef.current.pause();
          setIsPlayingJingle(false);
          setCurrentTrack("");
          
          if (musicTrack) {
            localParticipant.unpublishTrack(musicTrack);
            setMusicTrack(null);
          }
        } else {
          await audioRef.current.play();
          setIsPlayingJingle(true);
          setCurrentTrack(file.name);

          const stream = audioRef.current.captureStream();
          const audioTrack = stream.getAudioTracks()[0];

          if (audioTrack) {
            await localParticipant.publishTrack(audioTrack, {
              name: "background-music",
            });
            setMusicTrack(audioTrack);
          }
        }
      }
    } catch (error) {
      console.error("Error playing music:", error);
    }
  };

  const stopMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingJingle(false);
      setCurrentTrack("");
    }

    if (musicTrack && localParticipant) {
      localParticipant.unpublishTrack(musicTrack);
      setMusicTrack(null);
    }
  };

  const handleVolumeChange = (value: number) => {
    setAudioVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
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
    }
  };

  const handleEndSession = async () => {
    try {
      stopMusic();

      const response = await fetch('/api/podcast/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: localParticipant?.identity }),
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
          if (musicTrack && localParticipant) {
            localParticipant.unpublishTrack(musicTrack);
            setMusicTrack(null);
          }
        }}
        hidden
      />

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
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleMicrophone}
              className={`flex items-center px-6 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 ${
                isMicEnabled
                  ? 'bg-[#EF3866] text-white shadow-lg'
                  : 'bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white'
              }`}
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
            />
            <div className="flex items-center px-4 py-2 border border-black dark:border-white rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-200 text-black dark:text-white">
              <Upload className="w-4 h-4 mr-2" />
              Upload
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
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                    currentTrack === file.name
                      ? 'border-[#EF3866] bg-[#EF3866] bg-opacity-5'
                      : 'border-black dark:border-white border-opacity-10 dark:border-opacity-10 hover:border-opacity-30 dark:hover:border-opacity-30'
                  }`}
                >
                  <span className="text-sm text-black dark:text-white truncate mr-4">
                    {file.name.replace(/\.[^/.]+$/, "")}
                  </span>
                  <button
                    onClick={() => playMusic(file)}
                    className={`p-2 rounded-full transition-all duration-200 ${
                      currentTrack === file.name
                        ? 'bg-[#EF3866] text-white'
                        : 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                    }`}
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
      </div>

      {/* End Session */}
      <button
        onClick={handleEndSession}
        className="w-full bg-[#EF3866] hover:bg-[#d12b56] text-white py-4 rounded-full font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center"
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

  useEffect(() => {
    async function getAuthorToken() {
      try {
        const res = await fetch(
          `/api/livekit/token?room=${session.roomName}&identity=${user.id}&role=author`
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
  }, [session.roomName, user.id]);

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
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#EF3866] hover:bg-[#d12b56] text-white px-6 py-3 rounded-full font-semibold transition-all duration-200"
          >
            Retry Setup
          </button>
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
        
        <div className="mt-4 text-xs text-black dark:text-white opacity-40">
          Room: {session.roomName}
        </div>
      </div>

      {/* LiveKit Room */}
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL!}
        connect={true}
        onConnected={() => {
          console.log("Connected to room as author");
        }}
        onDisconnected={() => {
          console.log("Disconnected from room");
          onEndSession?.();
        }}
        onError={(error) => {
          console.error("LiveKit room error:", error);
          setError(error.message);
        }}
      >
        <RoomAudioRenderer />
        <AudioControls onEndSession={onEndSession} />
      </LiveKitRoom>
    </div>
  );
}