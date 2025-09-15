// app/api/podcast/quick-join/route.ts - NEW
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      sessionId, 
      networkQuality = 'low', 
      deviceType = 'mobile',
      connectionSpeed,
      skipPreload = true 
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      );
    }

    // Get minimal session info for quick join
    const { data: session, error: sessionError } = await supabase
      .from("live_sessions")
      .select("id, room_name, title, author_name, is_active, listener_count")
      .eq("id", sessionId)
      .eq("is_active", true)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Active session not found" },
        { status: 404 }
      );
    }

    // Get only essential audio tracks (limit to 2 for quick join)
    const { data: essentialTracks, error: tracksError } = await supabase
      .from("session_audio_tracks")
      .select("id, track_type, public_url, file_size")
      .eq("session_id", sessionId)
      .order("file_size", { ascending: true }) // Smallest files first
      .limit(2);

    if (tracksError) {
      console.error("Error fetching essential tracks:", tracksError);
    }

    // Create optimized connection record
    const { data: connectionRecord, error: connectionError } = await supabase
      .from("session_connections")
      .insert({
        session_id: sessionId,
        user_id: userId,
        network_quality: networkQuality,
        device_type: deviceType,
        connection_type: 'quick_join',
        connected_at: new Date().toISOString(),
        optimization_flags: JSON.stringify({
          quickJoin: true,
          skipPreload,
          audioOnly: true,
          minimalTracks: true
        })
      })
      .select()
      .single();

    if (connectionError) {
      console.error("Connection record error:", connectionError);
    }

    // Increment listener count
    await supabase
      .from("live_sessions")
      .update({ 
        listener_count: (session.listener_count || 0) + 1,
        last_activity: new Date().toISOString()
      })
      .eq("id", sessionId);

    // Generate quick join configuration
    const quickJoinConfig = {
      sessionInfo: {
        id: session.id,
        roomName: session.room_name,
        title: session.title,
        authorName: session.author_name
      },
      connectionConfig: {
        audioOnly: true,
        skipVideoTracks: true,
        minimalBuffer: true,
        autoReconnect: true,
        reconnectAttempts: 5,
        reconnectDelay: 1000,
        networkOptimized: true
      },
      streamingConfig: {
        quality: 'low',
        bitrate: '32k',
        sampleRate: 22050,
        channels: 1,
        latencyMode: 'high', // Higher latency for stability
        adaptiveStreaming: false // Disable for consistency
      },
      essentialTracks: essentialTracks || [],
      quickJoinEnabled: true,
      estimatedJoinTime: networkQuality === 'low' ? '2-3 seconds' : '1-2 seconds'
    };

    return NextResponse.json({
      success: true,
      quickJoinConfig,
      optimizations: {
        tracksLimited: true,
        audioOnlyMode: true,
        bufferMinimized: true,
        preloadSkipped: skipPreload,
        networkOptimized: true
      },
      connectionId: connectionRecord?.id,
      message: "Quick join configuration ready"
    });

  } catch (error) {
    console.error("Quick join error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const networkTest = url.searchParams.get("networkTest") === "true";

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      );
    }

    // Check if session exists and get basic info
    const { data: session, error: sessionError } = await supabase
      .from("live_sessions")
      .select("id, room_name, title, author_name, is_active, listener_count")
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

    // Get quick join suitability metrics
    const quickJoinMetrics = {
      sessionActive: session.is_active,
      currentListeners: session.listener_count || 0,
      sessionLoad: (session.listener_count || 0) > 20 ? 'high' : 'normal',
      quickJoinRecommended: true,
      estimatedJoinTime: {
        high: '< 1 second',
        medium: '1-2 seconds', 
        low: '2-4 seconds'
      }
    };

    // If network test requested, provide test endpoints
    const testEndpoints = networkTest ? {
      speedTest: `${process.env.NEXT_PUBLIC_API_URL}/api/podcast/network-test`,
      latencyTest: `${process.env.NEXT_PUBLIC_LIVEKIT_URL}/ping`,
      connectivityTest: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`
    } : null;

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        roomName: session.room_name,
        title: session.title,
        authorName: session.author_name,
        isActive: session.is_active
      },
      quickJoinMetrics,
      testEndpoints,
      recommendations: {
        useQuickJoin: quickJoinMetrics.sessionLoad === 'high',
        audioOnlyMode: true,
        skipPreload: true,
        minimalUI: true
      }
    });

  } catch (error) {
    console.error("Quick join GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { connectionId, sessionId } = body;

    if (!connectionId && !sessionId) {
      return NextResponse.json(
        { error: "Connection ID or Session ID required" },
        { status: 400 }
      );
    }

    // End the connection
    if (connectionId) {
      // Fetch the connection to get connected_at
      const { data: connection } = await supabase
        .from("session_connections")
        .select("connected_at")
        .eq("id", connectionId)
        .eq("user_id", userId)
        .single();

      let connection_duration = null;
      if (connection && connection.connected_at) {
        const connectedAt = new Date(connection.connected_at).getTime();
        const disconnectedAt = Date.now();
        connection_duration = Math.floor((disconnectedAt - connectedAt) / 1000); // in seconds
      }

      await supabase
        .from("session_connections")
        .update({
          disconnected_at: new Date().toISOString(),
          connection_duration
        })
        .eq("id", connectionId)
        .eq("user_id", userId);
    }

    // Decrement listener count if session provided
    if (sessionId) {
      const { data: session } = await supabase
        .from("live_sessions")
        .select("listener_count")
        .eq("id", sessionId)
        .single();

      if (session && session.listener_count > 0) {
        await supabase
          .from("live_sessions")
          .update({ 
            listener_count: session.listener_count - 1,
            last_activity: new Date().toISOString()
          })
          .eq("id", sessionId);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Quick join session ended"
    });

  } catch (error) {
    console.error("Quick join disconnect error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}