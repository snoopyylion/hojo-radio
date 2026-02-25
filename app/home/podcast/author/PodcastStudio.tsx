"use client";

import { useState, useEffect } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { LiveSession, User } from "@/types/podcast";
import { Radio, Clock, Users, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import { AudioControls } from "./components/AudioControls";
import { useNetworkMonitoring } from "./hooks/useNetworkMonitoring";
import { SoundEffectsUpload } from "./components/SoundEffectsUpload";
import GuestManagement from "../GuestManagement";
import { useSessionRoles } from "../author/hooks/useSessionRoles";
import { GuestRequestsPanel } from "../components/GuestRequestsPanel";
import { useAuth } from "@clerk/nextjs";
import { RecordingControls } from "./components/RecordingControls";

interface Props {
  session: LiveSession;
  user: User;
  onEndSession: () => void;
  networkQuality: "high" | "medium" | "low";
}

export default function PodcastStudio({ session, onEndSession }: Props) {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [recordedEpisodeId, setRecordedEpisodeId] = useState<string | null>(null);

  // 1. Use Clerk's userId consistently
  const {
    userRole,
    isHost,
    loading: rolesLoading,
    promoteUser,
    demoteUser,
    refreshTokenForRole
  } = useSessionRoles(session.id, userId || '');

  const deviceType = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)
    ? "mobile"
    : "desktop";
  const initialNetworkQuality = navigator.onLine ? "good" : "offline";

  useEffect(() => {
    async function getAuthorToken() {
      try {
        setIsConnecting(true);

        const res = await fetch(
          `/api/livekit/token?room=${session.roomName}&identity=${userId}&role=host&networkQuality=${initialNetworkQuality}&deviceType=${deviceType}`,
          {
            credentials: 'include',
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

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    try {
      if (newRole === 'guest') {
        await promoteUser(targetUserId);
      } else if (newRole === 'listener') {
        await demoteUser(targetUserId);
      }

      if (targetUserId === userId) {
        await refreshTokenForRole();
      }
    } catch (error) {
      console.error('Role change failed:', error);
    }
  };

  const handleApproveRequest = async (requestId: string, targetUserId: string) => {
    const toastId = toast.loading("Approving request...");

    try {
      const updateResponse = await fetch("/api/podcast/guest-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          status: "approved",
          respondedBy: userId,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update request status");
      }

      const success = await promoteUser(targetUserId);

      if (!success) {
        await fetch("/api/podcast/guest-requests", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId,
            status: "pending",
            respondedBy: null,
          }),
        });
        throw new Error("Failed to promote user");
      }

      toast.success("✅ Guest approved! They'll reconnect automatically.", { id: toastId });

    } catch (error) {
      console.error("❌ Failed to approve request:", error);
      toast.error("Failed to approve request. Please try again.", { id: toastId });
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
          respondedBy: userId
        })
      });
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert('Failed to reject request');
    }
  };

  const handleRecordingComplete = (episodeId: string) => {
    setRecordedEpisodeId(episodeId);
    toast.success('✅ Episode recorded and published!');
  };

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
          <p className="text-sm text-black dark:text-white opacity-60 mb-2">
            Connecting to live audio room...
          </p>
          {recordedEpisodeId && (
            <p className="text-sm text-green-600 dark:text-green-400">
              ✓ Episode recorded and published!
            </p>
          )}
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
      <div className="border border-black/10 dark:border-white/10 backdrop-blur-sm rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm dark:shadow-none transition-all duration-300">

        {/* Top accent bar + status */}
        <div className="
    px-5 sm:px-6 py-3 sm:py-4 
    bg-gradient-to-r from-[#EF3866]/10 to-transparent 
    border-b border-black/5 dark:border-white/5
    flex items-center justify-between gap-4
  ">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="
        w-3 h-3 sm:w-3.5 sm:h-3.5 
        bg-[#EF3866] rounded-full 
        animate-pulse ring-4 ring-[#EF3866]/20
      "/>
            <span className="
        font-sora font-bold uppercase tracking-wider 
        text-xs sm:text-sm 
        text-[#EF3866]
      ">
              LIVE BROADCASTING
            </span>
            <span className="
        text-[10px] sm:text-xs 
        font-medium text-black/50 dark:text-white/50
        px-2 py-0.5 rounded-full 
        bg-black/5 dark:bg-white/5
      ">
              {userRole === 'host' ? 'Host Mode' : 'Guest Mode'}
            </span>
          </div>

          {/* Listener count - moved here for better mobile visibility */}
          <div className="
      flex items-center gap-1.5 sm:gap-2 
      text-xs sm:text-sm 
      font-medium text-black/70 dark:text-white/70
    ">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{session.listenerCount}</span>
            <span className="hidden sm:inline opacity-60">listening</span>
          </div>
        </div>

        {/* Main content */}
        <div className="px-5 sm:px-7 py-6 sm:py-8">
          <h1 className="
      font-sora font-semibold 
      text-xl sm:text-2xl lg:text-3xl 
      text-black dark:text-white 
      leading-tight mb-3 sm:mb-4
      line-clamp-2
    ">
            {session.title}
          </h1>

          {session.description && (
            <p className="
        font-sora text-sm sm:text-base 
        text-black/70 dark:text-white/70 
        leading-relaxed mb-5 sm:mb-6 
        line-clamp-3 sm:line-clamp-4
        max-w-2xl
      ">
              {session.description}
            </p>
          )}

          {/* Meta row - started time + listener count (mobile shows listener here too) */}
          <div className="
      flex flex-wrap items-center gap-4 sm:gap-6 
      text-xs sm:text-sm 
      text-black/60 dark:text-white/60
    ">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>
                Started {new Date(session.startedAt).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            </div>

            {/* Mobile-only listener count repeat (hidden on sm+) */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <Users className="w-3.5 h-3.5" />
              <span>{session.listenerCount} listening</span>
            </div>
          </div>

          {/* Success message - full width, nice styling */}
          {recordedEpisodeId && (
            <div className="
        mt-6 sm:mt-8 
        bg-gradient-to-r from-green-50 to-green-50/50 
        dark:from-green-950/30 dark:to-green-950/20 
        border border-green-200 dark:border-green-800/40 
        rounded-xl sm:rounded-2xl 
        p-4 sm:p-5
      ">
              <div className="
          flex flex-col sm:flex-row 
          items-start sm:items-center 
          justify-between gap-3 sm:gap-4
        ">
                <div className="flex items-center gap-3">
                  <div className="
              w-9 h-9 sm:w-10 sm:h-10 
              bg-green-100 dark:bg-green-900/40 
              rounded-full flex items-center justify-center
            ">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="
                font-sora font-medium 
                text-sm sm:text-base 
                text-green-700 dark:text-green-300
              ">
                      Episode successfully recorded & published!
                    </p>
                    <p className="
                text-xs sm:text-sm 
                text-green-600/80 dark:text-green-400/80 
                mt-0.5
              ">
                      Ready to share or edit
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/home/podcast/episode/${recordedEpisodeId}`)}
                  className="
              px-5 sm:px-6 py-2.5 sm:py-3 
              bg-green-600 hover:bg-green-700 
              text-white font-medium text-sm 
              rounded-xl transition-all duration-200
              flex items-center gap-2 whitespace-nowrap
            "
                >
                  View Episode
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest Requests Panel & Recording Controls - Only show for host */}
          {isHost && (
            <>
              <GuestRequestsPanel
                sessionId={session.id}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={handleRejectRequest}
              />

              <RecordingControls
                sessionId={session.id}
                userId={userId}
                onRecordingComplete={handleRecordingComplete}
              />
            </>
          )}

          {/* Sound Effect Upload */}
          <div className="flex justify-start">
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