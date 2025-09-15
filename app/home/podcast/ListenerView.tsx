"use client";

import React, { useState, useEffect } from "react";
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
}

// 🔊 AudioVisualizer Component
function AudioVisualizer() {
  const tracks = useTracks([Track.Source.Microphone], { onlySubscribed: true });
  const participants = useParticipants();
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-3 bg-[#EF3866] bg-opacity-10 px-6 py-3 rounded-full">
          <div className="w-3 h-3 bg-[#EF3866] rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-[#EF3866]">
            Connected • {participants.length} in session
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
      {tracks.length > 0 && (
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

// 🔊 ListenerControls Component
function ListenerControls() {
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    document.querySelectorAll("audio").forEach((audio) => {
      (audio as HTMLAudioElement).volume = isMuted ? 0 : newVolume;
    });
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
    document.querySelectorAll("audio").forEach((audio) => {
      (audio as HTMLAudioElement).volume = !isMuted ? 0 : volume;
    });
  };

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
              {isMuted ? (
                <VolumeX className="w-4 h-4 mr-2" />
              ) : (
                <Volume2 className="w-4 h-4 mr-2" />
              )}
              Volume
            </label>
            <span className="text-sm text-black dark:text-white opacity-60">
              {isMuted ? "Muted" : `${Math.round(volume * 100)}%`}
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
              className={`p-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 ${isMuted
                  ? "bg-[#EF3866] text-white shadow-lg"
                  : "border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                }`}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
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
  networkQuality,
}: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [audioRecoveryAttempts, setAudioRecoveryAttempts] = useState(0);

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
              const context = new (window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
    if (/Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      if ((window as unknown as { webkit?: { messageHandlers?: { audioSession?: unknown } } })?.webkit?.messageHandlers?.audioSession) {
        try {
          ((window as unknown as { webkit: { messageHandlers: { audioSession: { postMessage: (message: unknown) => void } } } }).webkit.messageHandlers.audioSession.postMessage)({
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
      return () =>
        window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, []);

  // iOS Autoplay Fix
  useEffect(() => {
    const handleAutoplay = async () => {
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        try {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          const audioContext = new AudioCtx();
          const oscillator = audioContext.createOscillator();
          oscillator.connect(audioContext.destination);
          oscillator.start();
          setTimeout(() => oscillator.stop(), 100);

          const silentAudio = document.createElement("audio");
          silentAudio.src =
            "data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAC";
          await silentAudio.play().catch(() => { });
        } catch (error) {
          console.log("iOS audio initialization:", error);
        }
      }
    };

    handleAutoplay();
  }, []);

  // Enhanced Network Monitoring
  const monitorNetworkQuality = async () => {
    try {
      const connection =
        (navigator as Navigator & {
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
        deviceType: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)
          ? "mobile"
          : "desktop",
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
  };

  // Token Request with Mobile Params
  useEffect(() => {
    async function getListenerToken() {
      try {
        const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const connection =
          (navigator as Navigator & {
            connection?: { type?: string };
          }).connection;

        const res = await fetch(
          `/api/livekit/token?room=${session.roomName}&identity=${user.id}&role=listener&networkQuality=${networkQuality}&deviceType=${isMobile ? "mobile" : "desktop"
          }&connectionType=${connection?.type || "wifi"}&isIOS=${isIOS}`
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
  }, [session.roomName, user.id, networkQuality]);

  // 🚨 Error handling UI
  if (connectionError) {
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

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

  if (isConnecting || !token) {
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

  // ✅ Main listener room
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
        connect
        audio={false} // ✅ listeners don’t request microphone
        video={false}
        options={{
          adaptiveStream: networkQuality === "low",
          dynacast: networkQuality !== "low",
          // iOS-specific options
          publishDefaults: {
            // Explicitly disabled for listeners
            audioPreset: undefined,
            videoSimulcastLayers: [],
          },
          // Audio context settings for iOS
          audioCaptureDefaults: {
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
          },
        }}
        onConnected={() => {
          console.log("Connected to live session as listener");

          // ✅ Initialize iOS audio context if needed
          if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            const audioContext = new (
              window.AudioContext ||
              (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
            )();

            if (audioContext.state === "suspended") {
              audioContext.resume().catch(console.warn);
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
        }}
        onDisconnected={() => {
          console.log("Disconnected from live session");
          fetch("/api/podcast/update-listener-count", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: session.id, increment: -1 }),
          }).catch(console.error);
        }}
        onError={(error) => {
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
        }}
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
      </LiveKitRoom>

    </div>
  );
}