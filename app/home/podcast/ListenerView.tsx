"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Volume2,
  VolumeX,
  Users,
  Headphones,
  Radio,
  Clock,
  User as UserIcon,
  Waves,
  AlertCircle,
} from "lucide-react";
import { useSessionRoles } from "./author/hooks/useSessionRoles";

// Types
interface LiveSession {
  id: string;
  roomName: string;
  title: string;
  authorName: string;
  description?: string;
  listenerCount: number;
  startedAt: string;
}

interface User {
  id: string;
}

interface NetworkStats {
  latency: number;
  bandwidth: number;
  packetLoss: number;
  effectiveType: string;
  rtt: number;
  saveData: boolean;
  deviceType: string;
}

interface Props {
  session: LiveSession;
  user: User;
  networkQuality: "high" | "medium" | "low";
  onEndSession?: () => void;
}

// Request to Speak Button Component
function RequestToSpeakButton({ 
  sessionId, 
  userId 
}: { 
  sessionId: string; 
  userId: string; 
}) {
  const [requested, setRequested] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001';
    const ws = new WebSocket(`${wsUrl}/podcast/${sessionId}?role=listener&userId=${userId}`);
    wsRef.current = ws;
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId, userId]);

  const handleRequest = useCallback(async () => {
    try {
      const response = await fetch('/api/podcast/guest-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          message: 'I would like to speak in this session'
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Send WebSocket notification to host
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'new_guest_request',
            request: data.request
          }));
        }
        
        setRequested(true);
        alert('Request sent to host!');
      }
    } catch (error) {
      console.error('Failed to send request:', error);
      alert('Failed to send request. Please try again.');
    }
  }, [sessionId, userId]);

  if (requested) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-600 text-white p-4 rounded-lg shadow-lg z-50">
        <p className="font-medium">Request Sent!</p>
        <p className="text-sm opacity-90">Waiting for host approval...</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
      <p className="font-medium">Want to speak?</p>
      <p className="text-sm opacity-90">Ask the host to promote you to guest!</p>
      <button
        onClick={handleRequest}
        className="mt-2 px-3 py-1 bg-white text-blue-600 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
        type="button"
      >
        Request to Speak
      </button>
    </div>
  );
}

// 🔊 AudioVisualizer Component
function AudioVisualizer() {
  const tracks = useTracks([Track.Source.Microphone], { onlySubscribed: true });
  const participants = useParticipants();
  
  const isMobile = useMemo(() => 
    /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
    []
  );

  const hasAudioStream = tracks.length > 0;
  const participantCount = participants.length;

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-3 bg-[#EF3866] bg-opacity-10 px-6 py-3 rounded-full">
          <div className="w-3 h-3 bg-[#EF3866] rounded-full animate-pulse" />
          <span className="text-sm font-medium text-[#EF3866]">
            Connected • {participantCount} in session
            {isMobile && " • Mobile"}
          </span>
        </div>
      </div>

      {/* Mobile-specific warning */}
      {isMobile && (
        <div className="border border-yellow-500 border-opacity-30 rounded-2xl p-4 bg-yellow-500 bg-opacity-5">
          <div className="flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-600">
              Mobile listening: Keep app open for best audio experience
            </span>
          </div>
        </div>
      )}

      {/* Audio Stream Indicator */}
      {hasAudioStream && (
        <div className="border border-[#EF3866] border-opacity-30 rounded-2xl p-4 bg-[#EF3866] bg-opacity-5">
          <div className="flex items-center justify-center space-x-4">
            <Waves className="w-5 h-5 text-[#EF3866]" />
            <span className="text-sm font-medium text-black dark:text-white">
              Audio streaming
            </span>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-1 h-6 bg-[#EF3866] rounded-full animate-pulse"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    height: `${Math.random() * 16 + 8}px`,
                  }}
                />
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
            <span>{participantCount - 1} listeners</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🔊 ListenerControls Component
function ListenerControls() {
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    document.querySelectorAll("audio").forEach((audio) => {
      (audio as HTMLAudioElement).volume = isMuted ? 0 : newVolume;
    });
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    document.querySelectorAll("audio").forEach((audio) => {
      (audio as HTMLAudioElement).volume = newMutedState ? 0 : volume;
    });
  }, [isMuted, volume]);

  const VolumeIcon = isMuted ? VolumeX : Volume2;
  const volumeDisplay = isMuted ? "Muted" : `${Math.round(volume * 100)}%`;

  return (
    <div className="border border-black dark:border-white rounded-3xl p-6">
      {/* Volume Control */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-black dark:text-white flex items-center">
          <Headphones className="w-5 h-5 mr-3" />
          Audio Control
        </h3>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-black dark:text-white flex items-center">
              <VolumeIcon className="w-4 h-4 mr-2" />
              Volume
            </label>
            <span className="text-sm text-black dark:text-white opacity-60">
              {volumeDisplay}
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
                  background: #ef3866;
                  cursor: pointer;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                .slider::-moz-range-thumb {
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: #ef3866;
                  cursor: pointer;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
              `}</style>
            </div>

            <button
              onClick={toggleMute}
              className={`p-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 ${
                isMuted
                  ? "bg-[#EF3866] text-white shadow-lg"
                  : "border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
              }`}
              type="button"
            >
              <VolumeIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Listening Tip */}
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

// 🎧 Main ListenerView Component
export default function ListenerView({
  session,
  user,
  networkQuality
}: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [audioRecoveryAttempts, setAudioRecoveryAttempts] = useState(0);

  // Add session roles hook
  const {
    userRole,
    loading: rolesLoading
  } = useSessionRoles(session.id, user.id);

  // Device detection
  const isMobile = useMemo(() => 
    /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
    []
  );
  
  const isIOS = useMemo(() => 
    /iPhone|iPad|iPod/i.test(navigator.userAgent),
    []
  );

  // 🎵 Audio recovery check
  useEffect(() => {
    const checkAudioState = () => {
      const audioElements = document.querySelectorAll("audio");
      let hasActiveAudio = false;

      audioElements.forEach((audio) => {
        if (!audio.paused && audio.currentTime > 0) {
          hasActiveAudio = true;
        }
      });

      if (!hasActiveAudio && audioRecoveryAttempts < 3) {
        console.log("Audio stalled, attempting recovery...");
        setAudioRecoveryAttempts((prev) => prev + 1);

        audioElements.forEach((audio) => {
          audio.play().catch(() => {
            try {
              type AudioContextType = typeof window.AudioContext;
              const AudioContext: AudioContextType = window.AudioContext || (window as unknown as { webkitAudioContext: AudioContextType }).webkitAudioContext;
              const context = new AudioContext();
              context.resume().then(() => {
                audio.play().catch((e) =>
                  console.log("Audio recovery failed:", e),
                );
              });
            } catch (e) {
              console.log("Audio context recovery failed:", e);
            }
          });
        });
      }
    };

    const audioCheckInterval = setInterval(checkAudioState, 5000);
    return () => clearInterval(audioCheckInterval);
  }, [audioRecoveryAttempts]);

  // 📱 Handle mobile/iOS background audio session
  useEffect(() => {
    if (isMobile) {
      const { webkit } = window as unknown as { 
        webkit?: { 
          messageHandlers?: { 
            audioSession?: { 
              postMessage: (message: unknown) => void 
            } 
          } 
        } 
      };
      
      if (webkit?.messageHandlers?.audioSession) {
        try {
          webkit.messageHandlers.audioSession.postMessage({
            action: "activate",
          });
        } catch {
          console.log("iOS audio session request failed");
        }
      }

      const handleBeforeUnload = () => {
        const audioElements = document.querySelectorAll("audio");
        audioElements.forEach((audio) => {
          audio.pause();
          audio.src = "";
        });
      };

      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [isMobile]);

  // iOS Autoplay Fix
  useEffect(() => {
    const handleAutoplay = async () => {
      if (isIOS) {
        try {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const audioContext = new AudioCtx();
          const oscillator = audioContext.createOscillator();
          oscillator.connect(audioContext.destination);
          oscillator.start();
          setTimeout(() => oscillator.stop(), 100);

          const silentAudio = document.createElement("audio");
          silentAudio.src = "data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAC";
          await silentAudio.play().catch(() => { });
        } catch (error) {
          console.log("iOS audio initialization:", error);
        }
      }
    };

    handleAutoplay();
  }, [isIOS]);

  // Enhanced Network Monitoring
  const monitorNetworkQuality = useCallback(async () => {
    try {
      const connection = (navigator as Navigator & {
        connection?: {
          downlink?: number;
          effectiveType?: string;
          rtt?: number;
          saveData?: boolean;
          type?: string;
        };
      }).connection;

      const networkStats: NetworkStats = {
        latency: performance.now(),
        bandwidth: connection?.downlink ?? 0,
        packetLoss: 0,
        effectiveType: connection?.effectiveType ?? "unknown",
        rtt: connection?.rtt ?? 0,
        saveData: connection?.saveData ?? false,
        deviceType: isMobile ? "mobile" : "desktop",
      };

      await fetch("/api/podcast/network-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          networkStats,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          },
          connectionType: connection?.type ?? "unknown",
        }),
      });
    } catch (error) {
      console.error("Network monitoring failed:", error);
    }
  }, [session.id, isMobile]);

  // Token Request with Mobile Params
  useEffect(() => {
    async function getListenerToken() {
      try {
        const connection = (navigator as Navigator & {
          connection?: { type?: string };
        }).connection;

        const res = await fetch(
          `/api/livekit/token?room=${session.roomName}&identity=${user.id}&role=listener&networkQuality=${networkQuality}&deviceType=${isMobile ? "mobile" : "desktop"}&connectionType=${connection?.type || "wifi"}&isIOS=${isIOS}`
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data: { token?: string; error?: string } = await res.json();

        if (data.error || !data.token) {
          throw new Error(data.error || "Missing token");
        }

        setToken(data.token);
      } catch (error) {
        console.error("Failed to get listener token:", error);
        setConnectionError(
          error instanceof Error ? error.message : "Failed to connect"
        );
      } finally {
        setIsConnecting(false);
      }
    }

    getListenerToken();
  }, [session.roomName, user.id, networkQuality, isMobile, isIOS]);

  // Connection handlers
  const handleConnected = useCallback(() => {
    console.log("Connected to live session as listener");

    // ✅ Initialize iOS audio context if needed
    if (isIOS) {
      type AudioContextConstructor = typeof AudioContext;
      const AudioContextCtor = (window.AudioContext || (window as unknown as { webkitAudioContext: AudioContextConstructor }).webkitAudioContext);
      if (AudioContextCtor) {
        const audioContext = new AudioContextCtor();

        if (audioContext.state === "suspended") {
          audioContext.resume().catch(console.warn);
        }
      }
    }

    // ✅ Update listener count
    fetch("/api/podcast/update-listener-count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, increment: 1 }),
    }).catch(console.error);

    // ✅ Continue your network monitoring
    const interval = setInterval(() => {
      monitorNetworkQuality();
    }, 10000);
    return () => clearInterval(interval);
  }, [session.id, isIOS, monitorNetworkQuality]);

  const handleDisconnected = useCallback(() => {
    console.log("Disconnected from live session");
    fetch("/api/podcast/update-listener-count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, increment: -1 }),
    }).catch(console.error);
  }, [session.id]);

  const handleError = useCallback((error: Error) => {
    console.error("LiveKit connection error:", error);

    // ✅ More specific error handling for iOS
    if (
      error.message.includes("permissions") ||
      error.message.includes("publish")
    ) {
      setConnectionError(
        "Audio permission issue. Try refreshing and allowing audio access."
      );
    } else {
      setConnectionError(error.message);
    }
  }, []);

  // Memoized session info
  const sessionInfo = useMemo(() => ({
    title: session.title,
    authorName: session.authorName,
    description: session.description,
    listenerCount: session.listenerCount,
    startedAt: new Date(session.startedAt).toLocaleTimeString(),
  }), [session]);

  // 🚨 Error handling UI
  if (connectionError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="border border-[#EF3866] rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-[#EF3866] rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
            {isMobile ? "Mobile Connection Issue" : "Connection Failed"}
          </h3>
          <p className="text-sm text-black dark:text-white opacity-60 mb-6">
            {connectionError || "Unable to get access token"}
          </p>

          {isIOS && (
            <div className="mb-4 p-3 bg-blue-500 bg-opacity-10 rounded-lg">
              <p className="text-xs text-blue-600">
                💡 iOS Tip: Make sure to allow audio playback in Safari settings
              </p>
            </div>
          )}

          <button
            onClick={() => window.location.reload()}
            className="bg-[#EF3866] hover:bg-[#d12b56] text-white px-6 py-3 rounded-full font-semibold transition-all duration-200 transform hover:scale-105"
            type="button"
          >
            Retry Connection
          </button>

          {isMobile && (
            <div className="mt-4 text-xs text-black dark:text-white opacity-40">
              Using {isIOS ? "iOS" : "Android"} • Try switching between WiFi and
              cellular
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isConnecting || !token || rolesLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="border border-black dark:border-white rounded-3xl p-12 text-center">
          <div className="w-16 h-16 border-4 border-[#EF3866] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
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

  // ✅ Main listener room
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Session Header */}
      <div className="text-center border border-black dark:border-white rounded-3xl p-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-4 h-4 bg-[#EF3866] rounded-full animate-pulse" />
          <span className="text-[#EF3866] font-bold uppercase tracking-wider text-sm">
            Live Session • {userRole === 'listener' ? '👂 Listener' : '🎤 Guest'}
          </span>
        </div>

        <h1 className="text-3xl font-bold text-black dark:text-white mb-3">
          {sessionInfo.title}
        </h1>

        <div className="text-lg text-black dark:text-white opacity-80 mb-4">
          hosted by {sessionInfo.authorName}
        </div>

        {sessionInfo.description && (
          <div className="border border-black dark:border-white border-opacity-10 dark:border-opacity-10 rounded-2xl p-4 mb-6">
            <p className="text-black dark:text-white opacity-80 text-sm">
              {sessionInfo.description}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center space-x-8 text-sm text-black dark:text-white opacity-60">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>{sessionInfo.listenerCount} listening</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Started {sessionInfo.startedAt}</span>
          </div>
        </div>
      </div>

      {/* LiveKit Room */}
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL!}
        connect
        audio={false}
        video={false}
        options={{
          adaptiveStream: networkQuality === "low",
          dynacast: networkQuality !== "low",
          publishDefaults: {
            audioPreset: undefined,
            videoSimulcastLayers: [],
          },
          audioCaptureDefaults: {
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
          },
        }}
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        onError={handleError}
        className="space-y-6"
      >
        <RoomAudioRenderer />
        <div className="border border-black dark:border-white rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-black dark:text-white flex items-center">
              <Radio className="w-5 h-5 mr-3" />
              Live Stream
            </h3>
          </div>
          <AudioVisualizer />
        </div>
        <ListenerControls />
        <div className="border border-black dark:border-white border-opacity-20 dark:border-opacity-20 rounded-3xl p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-[#EF3866] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Waves className="w-6 h-6 text-[#EF3866]" />
            </div>
            <h4 className="text-sm font-semibold text-black dark:text-white mb-2">
              Premium Audio Experience
            </h4>
            <p className="text-xs text-black dark:text-white opacity-60">
              The host can mix live music, jingles, and sound effects during the
              broadcast
            </p>
          </div>
        </div>

        {/* Request to Speak Button for Listeners */}
        {userRole === 'listener' && (
          <RequestToSpeakButton 
            sessionId={session.id}
            userId={user.id}
          />
        )}
      </LiveKitRoom>
    </div>
  );
}