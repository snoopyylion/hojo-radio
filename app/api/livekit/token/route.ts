// app/api/livekit/token/route.ts - FIXED GUEST AUDIO PERMISSIONS + ROLE DETECTION
import { NextResponse, NextRequest } from "next/server";
import { AccessToken, VideoGrant, TrackSource } from "livekit-server-sdk";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Token configurations based on network quality
const TOKEN_CONFIGS = {
  low: {
    ttl: 60 * 30, // 30 minutes
    reconnectAttempts: 5,
    reconnectDelay: 2000,
    adaptiveStreaming: true,
  },
  medium: {
    ttl: 60 * 60, // 1 hour
    reconnectAttempts: 3,
    reconnectDelay: 1000,
    adaptiveStreaming: true,
  },
  high: {
    ttl: 60 * 120, // 2 hours
    reconnectAttempts: 3,
    reconnectDelay: 500,
    adaptiveStreaming: false,
  },
};

// Mobile-specific configurations
const MOBILE_CONFIGS = {
  ios: {
    ttl: 60 * 20,
    adaptiveStreaming: true,
    audioOnly: true,
    bufferOptimization: true,
  },
  android: {
    ttl: 60 * 30,
    adaptiveStreaming: true,
    audioOnly: false,
    bufferOptimization: true,
  },
  default: {
    ttl: 60 * 60,
    adaptiveStreaming: false,
    audioOnly: false,
    bufferOptimization: false,
  },
};

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const roomName = url.searchParams.get("room");
    const identity = url.searchParams.get("identity");
    const requestedRole = url.searchParams.get("role") || "listener";
    const networkQuality =
      (url.searchParams.get("networkQuality") as keyof typeof TOKEN_CONFIGS) ||
      "medium";
    const deviceType = url.searchParams.get("deviceType") || "desktop";
    const connectionType = url.searchParams.get("connectionType") || "wifi";
    const isIOS = url.searchParams.get("isIOS") === "true";

    if (!roomName || !identity) {
      return NextResponse.json(
        { error: "Missing room or identity" },
        { status: 400 }
      );
    }

    if (identity !== userId) {
      return NextResponse.json({ error: "Identity mismatch" }, { status: 403 });
    }

    // ✅ Fetch session info including creator_id AND check guest status
    const { data: session } = await supabase
      .from("live_sessions")
      .select("id, title, author_id, creator_id")
      .eq("room_name", roomName)
      .eq("is_active", true)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // ✅ Check if user is approved guest (FIXED ROLE DETECTION)
    const { data: guestRole } = await supabase
      .from("session_roles")
      .select("role")
      .eq("session_id", session.id)
      .eq("user_id", userId)
      .single(); // ⬅️ removed .eq("role", "guest")

    // ✅ Decide role based on DATABASE, not request
    let finalRole: "host" | "guest" | "listener";

    if (session.creator_id === userId) {
      finalRole = "host";
    } else if (guestRole?.role === "guest") {
      finalRole = "guest";
    } else {
      finalRole = "listener";
    }

    console.log(
      `[Token] User ${userId} requested ${requestedRole}, granted: ${finalRole}`
    );

    // Merge configs: network + mobile
    const baseConfig = TOKEN_CONFIGS[networkQuality] || TOKEN_CONFIGS.medium;
    const mobileConfig =
      isIOS && deviceType === "mobile"
        ? MOBILE_CONFIGS.ios
        : deviceType === "mobile"
        ? MOBILE_CONFIGS.android
        : MOBILE_CONFIGS.default;

    const config = { ...baseConfig, ...mobileConfig };

    // Generate AccessToken
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      ttl: config.ttl,
      name:
        finalRole === "host"
          ? `Host-${session.author_id || identity.slice(-6)}`
          : finalRole === "guest"
          ? `Guest-${identity.slice(-6)}`
          : `Listener-${identity.slice(-6)}`,
    });

    // ✅ Permissions by role - CRITICAL FIX
    let grant: VideoGrant;

    if (finalRole === "listener") {
      // Listeners: can only subscribe (listen)
      grant = {
        room: roomName,
        roomJoin: true,
        canSubscribe: true,
        canPublish: false,
        canPublishData: false,
        canUpdateOwnMetadata: true,
      };
    } else if (finalRole === "host") {
      // Host: full permissions
      grant = {
        room: roomName,
        roomJoin: true,
        canSubscribe: true,
        canPublish: true,
        canPublishData: true,
        canUpdateOwnMetadata: true,
        roomAdmin: true,
      };
    } else {
      // Guest: can publish audio only
      grant = {
        room: roomName,
        roomJoin: true,
        canSubscribe: true,
        canPublish: true, // ✅ Guests can speak
        canPublishData: true,
        canUpdateOwnMetadata: true,
        canPublishSources: [TrackSource.MICROPHONE], // ✅ Audio only
      };
    }

    at.addGrant(grant);

    // Attach metadata
    at.metadata = JSON.stringify({
      finalRole,
      networkQuality,
      deviceType,
      connectionType,
      joinTime: new Date().toISOString(),
      sessionId: session.id,
      isMobile: deviceType === "mobile",
      isIOS,
      isCreator: session.creator_id === userId,
      isGuest: finalRole === "guest",
      optimizations: {
        lowLatency: networkQuality === "high" && !isIOS,
        adaptiveStreaming: config.adaptiveStreaming,
        audioOnly: config.audioOnly || finalRole === "guest",
        bufferOptimization: config.bufferOptimization,
        mobileOptimized: deviceType === "mobile",
        reconnectConfig: {
          attempts: config.reconnectAttempts,
          delay: config.reconnectDelay,
        },
      },
    });

    const token = await at.toJwt();

    // Save connection log
    await supabase.from("session_connections").insert({
      session_id: session.id,
      user_id: userId,
      network_quality: networkQuality,
      device_type: deviceType,
      connection_type: connectionType,
      role: finalRole,
      connected_at: new Date().toISOString(),
    });

    console.log(
      `[Token] Generated token for ${finalRole} (canPublish: ${grant.canPublish})`
    );

    return NextResponse.json({
      token,
      role: finalRole,
      room: roomName,
      identity,
      sessionInfo: {
        id: session.id,
        title: session.title,
        isCreator: session.creator_id === userId,
        isGuest: finalRole === "guest",
      },
    });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      roomName,
      networkQuality,
      connectionStats,
      action,
    }: {
      roomName: string;
      networkQuality: keyof typeof TOKEN_CONFIGS;
      connectionStats?: Record<string, unknown>;
      action: string;
    } = body;

    if (action === "update_network_quality") {
      const { data: session } = await supabase
        .from("live_sessions")
        .select("id")
        .eq("room_name", roomName)
        .eq("is_active", true)
        .single();

      if (session) {
        await supabase
          .from("session_connections")
          .update({
            network_quality: networkQuality,
            connection_stats: JSON.stringify(connectionStats ?? {}),
            last_updated: new Date().toISOString(),
          })
          .eq("session_id", session.id)
          .eq("user_id", userId);
      }

      const newConfig =
        TOKEN_CONFIGS[networkQuality] || TOKEN_CONFIGS.medium;

      return NextResponse.json({
        success: true,
        recommendedSettings: {
          networkQuality,
          reconnectAttempts: newConfig.reconnectAttempts,
          reconnectDelay: newConfig.reconnectDelay,
          adaptiveStreaming: newConfig.adaptiveStreaming,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Token update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
