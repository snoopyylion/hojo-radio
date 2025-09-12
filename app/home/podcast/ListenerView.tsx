// app/home/podcast/ListenerView.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  LiveKitRoom, 
  RoomAudioRenderer, 
  useTracks,
  useParticipants,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { LiveSession, User } from "@/types/podcast";
import { Volume2, VolumeX, Users, Headphones } from "lucide-react";

interface Props {
  session: LiveSession;
  user: User;
}

function AudioVisualizer() {
  const tracks = useTracks([Track.Source.Microphone], { onlySubscribed: true });
  const participants = useParticipants();

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-2 bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-700 dark:text-green-300">
            Connected • {participants.length} in room
          </span>
        </div>
      </div>

      {/* Audio Tracks Info */}
      {tracks.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <div className="flex items-center justify-center space-x-2">
            <Volume2 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">Audio streaming</span>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-1 h-4 bg-blue-600 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Participants */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
          <Users className="w-4 h-4" />
          <span>Host and {participants.length - 1} others listening</span>
        </div>
      </div>
    </div>
  );
}

function ListenerControls() {
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    // Apply volume to all audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.volume = isMuted ? 0 : newVolume;
    });
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.volume = !isMuted ? 0 : volume;
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
      <h3 className="font-semibold mb-3 flex items-center">
        <Headphones className="w-4 h-4 mr-2" />
        Audio Controls
      </h3>
      
      <div className="space-y-4">
        {/* Volume Control */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center">
            {isMuted ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
            Volume: {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="flex-1"
              disabled={isMuted}
            />
            <button
              onClick={toggleMute}
              className={`p-2 rounded-lg ${
                isMuted 
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Audio Quality Info */}
        <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-700 p-2 rounded">
          💡 Tip: Use headphones for the best listening experience
        </div>
      </div>
    </div>
  );
}

export default function ListenerView({ session, user }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    async function getListenerToken() {
      try {
        const res = await fetch(
          `/api/livekit/token?room=${session.roomName}&identity=${user.id}&role=listener`
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
        console.error("Failed to get listener token:", error);
        setConnectionError(error instanceof Error ? error.message : "Failed to connect");
      } finally {
        setIsConnecting(false);
      }
    }

    getListenerToken();
  }, [session.roomName, user.id]);

  if (isConnecting) {
    return (
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Connecting to live session...</p>
          <p className="text-sm text-gray-500 mt-2">Setting up audio stream</p>
        </div>
      </div>
    );
  }

  if (connectionError || !token) {
    return (
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="text-center text-red-600">
          <p className="font-semibold">Connection Failed</p>
          <p className="text-sm mt-2">{connectionError || "Unable to get access token"}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Session Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-1">🎧 {session.title}</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-2">by {session.authorName}</p>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-600 font-medium">LIVE</span>
            <span className="text-sm text-gray-500">• {session.listenerCount} listening</span>
          </div>
        </div>

        {session.description && (
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mt-4">
            <p className="text-sm">{session.description}</p>
          </div>
        )}
      </div>

      {/* LiveKit Room */}
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL!}
        connect={true}
        onConnected={() => {
          console.log("Connected to live session");
          // Update listener count when someone joins
          fetch('/api/podcast/update-listener-count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: session.id, increment: 1 }),
          }).catch(console.error);
        }}
        onDisconnected={() => {
          console.log("Disconnected from live session");
          // Update listener count when someone leaves
          fetch('/api/podcast/update-listener-count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: session.id, increment: -1 }),
          }).catch(console.error);
        }}
        onError={(error) => {
          console.error("LiveKit connection error:", error);
          setConnectionError(error.message);
        }}
        className="space-y-4"
      >
        {/* Audio Renderer - This handles all incoming audio */}
        <RoomAudioRenderer />
        
        {/* Audio Visualization and Status */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <AudioVisualizer />
        </div>
        
        {/* Listener Controls */}
        <ListenerControls />
        
        {/* Listening Tips */}
        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-xl">
          <p className="text-center text-sm text-blue-700 dark:text-blue-300">
            🎵 Enjoying the show? The host can mix music and jingles live!
          </p>
        </div>
      </LiveKitRoom>
    </div>
  );
}