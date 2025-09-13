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
import { 
  Volume2, 
  VolumeX, 
  Users, 
  Headphones, 
  Radio,
  Clock,
  User as UserIcon,
  Waves,
  AlertCircle
} from "lucide-react";

interface Props {
  session: LiveSession;
  user: User;
}

function AudioVisualizer() {
  const tracks = useTracks([Track.Source.Microphone], { onlySubscribed: true });
  const participants = useParticipants();

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-3 bg-[#EF3866] bg-opacity-10 px-6 py-3 rounded-full">
          <div className="w-3 h-3 bg-[#EF3866] rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-[#EF3866]">
            Connected • {participants.length} in session
          </span>
        </div>
      </div>

      {/* Audio Stream Indicator */}
      {tracks.length > 0 && (
        <div className="border border-[#EF3866] border-opacity-30 rounded-2xl p-4 bg-[#EF3866] bg-opacity-5">
          <div className="flex items-center justify-center space-x-4">
            <Waves className="w-5 h-5 text-[#EF3866]" />
            <span className="text-sm font-medium text-black dark:text-white">Audio streaming</span>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-1 h-6 bg-[#EF3866] rounded-full animate-pulse"
                  style={{ 
                    animationDelay: `${i * 0.1}s`,
                    height: `${Math.random() * 16 + 8}px`
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Participants Info */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-6 text-sm text-black dark:text-white opacity-60">
          <div className="flex items-center space-x-2">
            <UserIcon className="w-4 h-4" />
            <span>Host broadcasting</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>{participants.length - 1} listeners</span>
          </div>
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
    <div className="border border-black dark:border-white rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-black dark:text-white flex items-center">
          <Headphones className="w-5 h-5 mr-3" />
          Audio Control
        </h3>
      </div>
      
      <div className="space-y-6">
        {/* Volume Control */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-black dark:text-white flex items-center">
              {isMuted ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
              Volume
            </label>
            <span className="text-sm text-black dark:text-white opacity-60">
              {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                disabled={isMuted}
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
            
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 ${
                isMuted
                  ? 'bg-[#EF3866] text-white shadow-lg'
                  : 'border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Audio Quality Tip */}
        <div className="border border-black dark:border-white border-opacity-10 dark:border-opacity-10 rounded-2xl p-4">
          <div className="flex items-start space-x-3">
            <Headphones className="w-5 h-5 text-[#EF3866] flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-black dark:text-white mb-1">
                Listening Tip
              </div>
              <div className="text-xs text-black dark:text-white opacity-60">
                Use headphones or earphones for the best audio experience
              </div>
            </div>
          </div>
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
      <div className="max-w-2xl mx-auto">
        <div className="border border-black dark:border-white rounded-3xl p-12 text-center">
          <div className="w-16 h-16 border-4 border-[#EF3866] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
            Joining live session
          </h3>
          <p className="text-sm text-black dark:text-white opacity-60">
            Setting up audio stream...
          </p>
        </div>
      </div>
    );
  }

  if (connectionError || !token) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="border border-[#EF3866] rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-[#EF3866] rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
            Connection Failed
          </h3>
          <p className="text-sm text-black dark:text-white opacity-60 mb-6">
            {connectionError || "Unable to get access token"}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#EF3866] hover:bg-[#d12b56] text-white px-6 py-3 rounded-full font-semibold transition-all duration-200 transform hover:scale-105"
          >
            Retry Connection
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
            Live Session
          </span>
        </div>
        
        <h1 className="text-3xl font-bold text-black dark:text-white mb-3">
          {session.title}
        </h1>
        
        <div className="text-lg text-black dark:text-white opacity-80 mb-4">
          hosted by {session.authorName}
        </div>

        {session.description && (
          <div className="border border-black dark:border-white border-opacity-10 dark:border-opacity-10 rounded-2xl p-4 mb-6">
            <p className="text-black dark:text-white opacity-80 text-sm">
              {session.description}
            </p>
          </div>
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
        className="space-y-6"
      >
        {/* Audio Renderer - This handles all incoming audio */}
        <RoomAudioRenderer />
        
        {/* Audio Visualization and Status */}
        <div className="border border-black dark:border-white rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-black dark:text-white flex items-center">
              <Radio className="w-5 h-5 mr-3" />
              Live Stream
            </h3>
          </div>
          <AudioVisualizer />
        </div>
        
        {/* Listener Controls */}
        <ListenerControls />
        
        {/* Listening Experience Info */}
        <div className="border border-black dark:border-white border-opacity-20 dark:border-opacity-20 rounded-3xl p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-[#EF3866] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Waves className="w-6 h-6 text-[#EF3866]" />
            </div>
            <h4 className="text-sm font-semibold text-black dark:text-white mb-2">
              Premium Audio Experience
            </h4>
            <p className="text-xs text-black dark:text-white opacity-60">
              The host can mix live music, jingles, and sound effects during the broadcast
            </p>
          </div>
        </div>
      </LiveKitRoom>
    </div>
  );
}