// app/api/podcast/stream/route.ts - ADAPTIVE STREAMING
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Quality configurations for adaptive streaming
const QUALITY_CONFIGS = {
  low: {
    bitrate: '32k',
    sampleRate: 22050,
    channels: 1,
    bufferSize: 2048,
    latency: 'high', // Higher latency for stability
    description: 'Optimized for poor connections'
  },
  medium: {
    bitrate: '64k',
    sampleRate: 44100,
    channels: 1,
    bufferSize: 4096,
    latency: 'medium',
    description: 'Balanced quality and performance'
  },
  high: {
    bitrate: '128k',
    sampleRate: 44100,
    channels: 2,
    bufferSize: 8192,
    latency: 'low',
    description: 'High quality for fast connections'
  },
  auto: {
    bitrate: 'adaptive',
    description: 'Automatically adjusts based on network conditions'
  }
};

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const quality = url.searchParams.get("quality") || "auto";
    const networkSpeed = url.searchParams.get("networkSpeed"); // in mbps
    const deviceType = url.searchParams.get("deviceType") || "desktop";

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" }, 
        { status: 400 }
      );
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" }, 
        { status: 404 }
      );
    }

    if (!session.is_active) {
      return NextResponse.json(
        { error: "Session is not active" }, 
        { status: 400 }
      );
    }

    // Determine optimal quality based on network conditions
    let recommendedQuality = quality;
    if (quality === 'auto' && networkSpeed) {
      const speed = parseFloat(networkSpeed);
      if (speed < 0.5) recommendedQuality = 'low';
      else if (speed < 2) recommendedQuality = 'medium';
      else recommendedQuality = 'high';
    }

    // Get audio tracks for adaptive streaming
    const { data: audioTracks, error: tracksError } = await supabase
      .from("session_audio_tracks")
      .select("*")
      .eq("session_id", sessionId)
      .order("uploaded_at", { ascending: true });

    if (tracksError) {
      console.error("Error fetching audio tracks:", tracksError);
    }

    // Increment listener count for active sessions
    if (userId && session.is_active) {
      await supabase
        .from("live_sessions")
        .update({ 
          listener_count: (session.listener_count || 0) + 1,
          last_activity: new Date().toISOString()
        })
        .eq("id", sessionId);
    }

    // LiveKit room configuration based on quality
    const roomConfig = {
      roomName: session.room_name,
      quality: recommendedQuality,
      config: QUALITY_CONFIGS[recommendedQuality as keyof typeof QUALITY_CONFIGS] || QUALITY_CONFIGS.medium,
      audioTracks: audioTracks || [],
      isLowLatency: recommendedQuality === 'high',
      adaptiveStreaming: quality === 'auto'
    };

    return NextResponse.json({
      roomName: session.room_name,
      sessionTitle: session.title,
      authorName: session.author_name,
      streamUrl: `${process.env.NEXT_PUBLIC_LIVEKIT_URL}/hls/${session.room_name}/index.m3u8`,
      webRTCUrl: `${process.env.NEXT_PUBLIC_LIVEKIT_URL}`,
      quality: recommendedQuality,
      networkOptimized: recommendedQuality === 'low',
      config: roomConfig,
      // Stream URLs for different qualities
      streams: {
        low: `${process.env.NEXT_PUBLIC_LIVEKIT_URL}/hls/${session.room_name}/low/index.m3u8`,
        medium: `${process.env.NEXT_PUBLIC_LIVEKIT_URL}/hls/${session.room_name}/medium/index.m3u8`,
        high: `${process.env.NEXT_PUBLIC_LIVEKIT_URL}/hls/${session.room_name}/high/index.m3u8`
      },
      availableQualities: Object.keys(QUALITY_CONFIGS),
      quickJoinEnabled: recommendedQuality === 'low',
      bufferSettings: {
        initialBuffer: recommendedQuality === 'low' ? 1 : 3, // seconds
        maxBuffer: recommendedQuality === 'low' ? 5 : 10, // seconds
        rebufferGoal: recommendedQuality === 'low' ? 0.5 : 2 // seconds
      }
    });
  } catch (error) {
    console.error("Stream setup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
    const { sessionId, networkQuality, connectionStats } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" }, 
        { status: 400 }
      );
    }

    // Update session with network quality feedback
    const { error: updateError } = await supabase
      .from("live_sessions")
      .update({
        network_quality_stats: JSON.stringify({
          quality: networkQuality,
          stats: connectionStats,
          timestamp: new Date().toISOString()
        }),
        last_activity: new Date().toISOString()
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("Error updating network stats:", updateError);
    }

    // Return optimized settings based on reported quality
    const optimizedSettings = QUALITY_CONFIGS[networkQuality as keyof typeof QUALITY_CONFIGS] || QUALITY_CONFIGS.medium;

    return NextResponse.json({
      success: true,
      recommendedSettings: optimizedSettings,
      adaptiveEnabled: true
    });
  } catch (error) {
    console.error("Network quality update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}