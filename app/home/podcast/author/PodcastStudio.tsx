"use client";

import { useState, useEffect } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { LiveSession, User } from "@/types/podcast";
import { Radio, Clock, Users } from "lucide-react";

import { AudioControls } from "./components/AudioControls";
import { useNetworkMonitoring } from "./hooks/useNetworkMonitoring";
import { SoundEffectsUpload } from "./components/SoundEffectsUpload";
import GuestManagement from "../GuestManagement";
import { useSessionRoles } from "../author/hooks/useSessionRoles";
import { GuestRequestsPanel } from "../components/GuestRequestsPanel";
import { useAuth } from "@clerk/nextjs";

interface Props {
  session: LiveSession;
  user: User;
  onEndSession: () => void;
  networkQuality: "high" | "medium" | "low";
}

export default function PodcastStudio({ session, onEndSession }: Props) {
  const { userId, isLoaded } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  // 1. Use Clerk's userId consistently
  const {
    userRole,
    isHost,
    loading: rolesLoading,
    promoteUser,
    demoteUser,
    refreshTokenForRole
  } = useSessionRoles(session.id, userId || ''); // ← Changed from user.id

  const deviceType = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)
    ? "mobile"
    : "desktop";
  const initialNetworkQuality = navigator.onLine ? "good" : "offline";

  useEffect(() => {
    async function getAuthorToken() {
      try {
        setIsConnecting(true);
        
        // ✅ Use Clerk's userId instead of user.id
        const res = await fetch(
          `/api/livekit/token?room=${session.roomName}&identity=${userId}&role=host&networkQuality=${initialNetworkQuality}&deviceType=${deviceType}`,
          {
            credentials: 'include', // ✅ Include cookies
          }
        );

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('Token fetch failed:', res.status, errorData);
          throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setToken(data.token);
        setConnectionStatus('connected');
      } catch (error) {
        console.error("Failed to get author token:", error);
        setError(error instanceof Error ? error.message : "Failed to get token");
      } finally {
        setIsConnecting(false);
      }
    }

    // ✅ Only fetch if userId is available
    if (userId) {
      getAuthorToken();
    }
  }, [session.roomName, userId, initialNetworkQuality, deviceType]);

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

  // 2. Fix role change handler
  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    try {
      if (newRole === 'guest') {
        await promoteUser(targetUserId);
      } else if (newRole === 'listener') {
        await demoteUser(targetUserId);
      }

      // If it's the current user, refresh token and rejoin
      if (targetUserId === userId) { // ← Changed from user.id
        await refreshTokenForRole();
        // In a real implementation, you'd want to reconnect with new permissions
      }
    } catch (error) {
      console.error('Role change failed:', error);
    }
  };

  // 3. Fix approve request handler
  const handleApproveRequest = async (requestId: string, targetUserId: string) => {
    try {
      const updateResponse = await fetch('/api/podcast/guest-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          status: 'approved',
          respondedBy: userId // ← Changed from user.id
        })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update request status');
      }

      const success = await promoteUser(targetUserId);

      if (!success) {
        await fetch('/api/podcast/guest-requests', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId,
            status: 'pending',
            respondedBy: null
          })
        });
        throw new Error('Failed to promote user');
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
      alert('Failed to approve request. Please try again.');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await fetch('/api/podcast/guest-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          status: 'rejected',
          respondedBy: userId // ← Changed from user.id
        })
      });
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert('Failed to reject request');
    }
  };

  // 4. Add safety check for userId
  if (!isLoaded || !userId) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="border border-black dark:border-white rounded-3xl p-12 text-center">
          <p>Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (isConnecting || rolesLoading) {
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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Session Header */}
      <div className="text-center border border-black dark:border-white rounded-3xl p-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-4 h-4 bg-[#EF3866] rounded-full animate-pulse"></div>
          <span className="text-[#EF3866] font-bold uppercase tracking-wider text-sm">
            Live Broadcasting • {userRole === 'host' ? '👑 Host' : '🎤 Guest'}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sound Effect Upload */}
          <div className="flex justify-center">
            <SoundEffectsUpload onUpload={handleSoundEffectUpload} />
          </div>

          {/* Guest Requests Panel - Only show for host */}
          {isHost && (
            <GuestRequestsPanel
              sessionId={session.id}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
            />
          )}

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

            <NetworkMonitoringWrapper
              onEndSession={onEndSession}
              session={session}
              connectionStatus={connectionStatus}
            />
          </LiveKitRoom>
        </div>

        {/* Guest Management Panel */}
        <div className="lg:col-span-1">
          <GuestManagement
            sessionId={session.id}
            isHost={isHost}
            currentUserRole={userRole}
            onRoleChange={handleRoleChange}
          />
        </div>
      </div>
    </div>
  );
}

const NetworkMonitoringWrapper = ({
  session,
  onEndSession,
  connectionStatus,
}: {
  session: LiveSession;
  onEndSession: () => void;
  connectionStatus: "connecting" | "connected" | "disconnected";
}) => {
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
};