"use client";

import { useState, useEffect } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { LiveSession, User } from "@/types/podcast";
import { Radio, Clock, Users } from "lucide-react";

import { AudioControls } from "./components/AudioControls";
import { useNetworkMonitoring } from "./hooks/useNetworkMonitoring";
import { SoundEffectsUpload } from "./components/SoundEffectsUpload"; // ⬅️ Import here

interface Props {
  session: LiveSession;
  user: User;
  onEndSession: () => void;
  networkQuality: "high" | "medium" | "low";
}

export default function PodcastStudio({ session, user, onEndSession }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const deviceType = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)
    ? "mobile"
    : "desktop";
  const initialNetworkQuality = navigator.onLine ? "good" : "offline";

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

  const handleRoomConnected = () => {
    console.log("Connected to room as author");
    setConnectionStatus("connected");
    setError(null);
  };

  const handleRoomDisconnected = () => {
    console.log("Disconnected from room");
    setConnectionStatus("disconnected");
    setTimeout(() => {
      onEndSession?.();
    }, 5000);
  };

  const handleRoomError = (roomError: Error) => {
    console.error("LiveKit room error:", roomError);
    setError(roomError.message);
    setConnectionStatus("disconnected");
  };

  // ⬅️ This function will be passed to SoundEffectsUpload
  const handleSoundEffectUpload = async (formData: FormData) => {
    try {
      const res = await fetch("/api/sound-effects/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload sound effect");
      }

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
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
      </div>

      {/* Sound Effect Upload Button */}
      <div className="flex justify-center">
        <SoundEffectsUpload onUpload={handleSoundEffectUpload} />
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
              maxBitrate: 64000,
            },
          },
        }}
      >
        <RoomAudioRenderer />

        {/* ✅ Hook now runs INSIDE RoomProvider */}
        <NetworkMonitoringWrapper
          onEndSession={onEndSession}
          session={session}
          connectionStatus={connectionStatus}
        />
      </LiveKitRoom>
    </div>
  );
}

// Wrapper for network monitoring
function NetworkMonitoringWrapper({
  session,
  onEndSession,
  connectionStatus,
}: {
  session: LiveSession;
  onEndSession: () => void;
  connectionStatus: "connecting" | "connected" | "disconnected";
}) {
  const { networkQuality, updateNetworkStats } = useNetworkMonitoring();

  return (
    <AudioControls
      onEndSession={onEndSession}
      session={session}
      networkQuality={networkQuality}
      onNetworkStatsUpdate={updateNetworkStats}
      connectionStatus={connectionStatus}
    />
  );
}
