// app/api/livekit/token/route.ts - NETWORK OPTIMIZED
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
    ttl: 60 * 30, // 30 minutes (shorter for poor connections)
    reconnectAttempts: 5,
    reconnectDelay: 2000,
    adaptiveStreaming: true
  },
  medium: {
    ttl: 60 * 60, // 1 hour
    reconnectAttempts: 3,
    reconnectDelay: 1000,
    adaptiveStreaming: true
  },
  high: {
    ttl: 60 * 120, // 2 hours
    reconnectAttempts: 3,
    reconnectDelay: 500,
    adaptiveStreaming: false
  }
};

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const roomName = url.searchParams.get("room");
    const identity = url.searchParams.get("identity");
    const role = url.searchParams.get("role") || "listener";
    const networkQuality = url.searchParams.get("networkQuality") || "medium";
    const deviceType = url.searchParams.get("deviceType") || "desktop";
    const connectionType = url.searchParams.get("connectionType") || "wifi";

    if (!roomName || !identity) {
      return NextResponse.json(
        { error: "Missing room or identity" }, 
        { status: 400 }
      );
    }

    if (identity !== userId) {
      return NextResponse.json(
        { error: "Identity mismatch" }, 
        { status: 403 }
      );
    }

    // Get session info for additional context
    const { data: session } = await supabase
      .from("live_sessions")
      .select("id, title, author_id")
      .eq("room_name", roomName)
      .eq("is_active", true)
      .single();

    const config = TOKEN_CONFIGS[networkQuality as keyof typeof TOKEN_CONFIGS] || TOKEN_CONFIGS.medium;

    const at = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      { 
        identity, 
        ttl: config.ttl,
        name: `User-${identity.slice(-6)}` // Shorter name for efficiency
      }
    );

    // Configure grants based on network quality and role
    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: role === "author",
      canSubscribe: true,
      canPublishData: role === "author",
    };

    // Restrict publishing sources for poor connections
    if (role === "author") {
      if (networkQuality === "low") {
        grant.canPublishSources = [TrackSource.MICROPHONE];
        // Disable video for poor connections
        grant.canPublish = true;
      } else {
        grant.canPublishSources = [TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE];
      }
    }

    at.addGrant(grant);
    
    // Add comprehensive metadata for server-side optimizations
    at.metadata = JSON.stringify({
      networkQuality,
      deviceType,
      connectionType,
      clientType: role === "author" ? "broadcaster" : "listener",
      joinTime: new Date().toISOString(),
      sessionId: session?.id,
      optimizations: {
        lowLatency: networkQuality === "high",
        adaptiveStreaming: config.adaptiveStreaming,
        audioOnly: networkQuality === "low",
        reconnectConfig: {
          attempts: config.reconnectAttempts,
          delay: config.reconnectDelay
        }
      }
    });

    const token = await at.toJwt();

    // Log connection attempt for analytics
    if (session) {
      await supabase
        .from("session_connections")
        .insert({
          session_id: session.id,
          user_id: userId,
          network_quality: networkQuality,
          device_type: deviceType,
          connection_type: connectionType,
          role,
          connected_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    return NextResponse.json({ 
      token,
      room: roomName,
      identity,
      canPublish: role === "author",
      networkQuality,
      optimizations: {
        quickJoin: networkQuality === "low",
        adaptiveQuality: config.adaptiveStreaming,
        reconnectEnabled: true,
        audioOnlyMode: networkQuality === "low",
        bufferOptimization: networkQuality === "low"
      },
      connectionConfig: {
        iceServers: networkQuality === "low" ? 
          // Use additional TURN servers for poor connections
          [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
          ] : 
          [{ urls: "stun:stun.l.google.com:19302" }],
        reconnectAttempts: config.reconnectAttempts,
        reconnectDelay: config.reconnectDelay
      },
      sessionInfo: session ? {
        id: session.id,
        title: session.title,
        isAuthor: session.author_id === userId
      } : null
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
    const { roomName, networkQuality, connectionStats, action } = body;

    if (action === "update_network_quality") {
      // Log network quality changes for session optimization
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
            connection_stats: JSON.stringify(connectionStats),
            last_updated: new Date().toISOString()
          })
          .eq("session_id", session.id)
          .eq("user_id", userId);
      }

      const newConfig = TOKEN_CONFIGS[networkQuality as keyof typeof TOKEN_CONFIGS] || TOKEN_CONFIGS.medium;

      return NextResponse.json({
        success: true,
        recommendedSettings: {
          networkQuality,
          reconnectAttempts: newConfig.reconnectAttempts,
          reconnectDelay: newConfig.reconnectDelay,
          adaptiveStreaming: newConfig.adaptiveStreaming
        }
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