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
import { Mic, MicOff, Music, Play, Pause, Volume2 } from "lucide-react";

interface Props {
  session: LiveSession; // Now required
  user: User;
  onEndSession?: () => void;
}

function AudioControls({ onEndSession }: { onEndSession?: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const room = useMaybeRoomContext();
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isPlayingJingle, setIsPlayingJingle] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.7);
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
          
          // Unpublish the current music track
          if (musicTrack) {
            localParticipant.unpublishTrack(musicTrack);
            setMusicTrack(null);
          }
        } else {
          await audioRef.current.play();
          setIsPlayingJingle(true);
          setCurrentTrack(file.name);

          // Create audio track from the audio element and publish it
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

    // Unpublish the music track if it exists
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

  const handleEndSession = async () => {
    try {
      // Stop any playing music
      stopMusic();

      // End session on server
      const response = await fetch('/api/podcast/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: localParticipant?.identity }),
      });

      if (!response.ok) {
        console.error('Failed to end session on server');
      }

      // Disconnect from room
      if (room) {
        room.disconnect();
      }

      onEndSession?.();
    } catch (error) {
      console.error("Error ending session:", error);
      // Still call onEndSession to update UI even if server call fails
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

      {/* Microphone Controls */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
        <h3 className="font-semibold mb-3 flex items-center">
          <Mic className="w-4 h-4 mr-2" />
          Microphone
        </h3>

        <div className="flex items-center space-x-4">
          <button
            onClick={toggleMicrophone}
            className={`flex items-center px-4 py-2 rounded-lg font-medium ${isMicEnabled
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-red-600 text-white hover:bg-red-700'
              }`}
          >
            {isMicEnabled ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
            {isMicEnabled ? 'Mic On' : 'Mic Off'}
          </button>

          <TrackToggle
            source={Track.Source.Microphone}
            className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Toggle Mic
          </TrackToggle>
        </div>
      </div>

      {/* Music & Jingle Controls */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
        <h3 className="font-semibold mb-3 flex items-center">
          <Music className="w-4 h-4 mr-2" />
          Music & Jingles
        </h3>

        {/* Upload Music */}
        <div className="mb-4">
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={handleMusicUpload}
            className="hidden"
            id="music-upload"
          />
          <label
            htmlFor="music-upload"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            <Music className="w-4 h-4 mr-2" />
            Upload Music/Jingles
          </label>
        </div>

        {/* Current Track */}
        {currentTrack && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm font-medium">Now Playing: {currentTrack}</span>
              </div>
              <button
                onClick={stopMusic}
                className="text-red-600 hover:text-red-800"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Volume Control */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 flex items-center">
            <Volume2 className="w-4 h-4 mr-2" />
            Music Volume: {Math.round(audioVolume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={audioVolume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Music Library */}
        {uploadedMusic.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Your Music Library:</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {uploadedMusic.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm truncate">{file.name}</span>
                  <button
                    onClick={() => playMusic(file)}
                    className={`p-1 rounded ${currentTrack === file.name
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-blue-600'
                      }`}
                  >
                    <Play className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* End Session */}
      <button
        onClick={handleEndSession}
        className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 font-medium"
      >
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
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Setting up your studio...</p>
          <p className="text-sm text-gray-500 mt-2">Connecting to audio room</p>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="text-center text-red-600">
          <p className="font-semibold">Studio Setup Failed</p>
          <p className="text-sm mt-2">{error || "Unable to get access token"}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Session Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold mb-1">{session.title}</h2>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-600 font-medium">LIVE</span>
            <span className="text-sm text-gray-500">• {session.listenerCount} listening</span>
          </div>
        </div>

        {session.description && (
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-4">
            <p className="text-sm">{session.description}</p>
          </div>
        )}

        <div className="text-center text-xs text-gray-500">
          Room: {session.roomName} • Started: {new Date(session.startedAt).toLocaleTimeString()}
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
      >
        <RoomAudioRenderer />
        <AudioControls onEndSession={onEndSession} />
      </LiveKitRoom>
    </div>
  );
}