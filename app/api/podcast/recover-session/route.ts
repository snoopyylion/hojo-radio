// app/api/podcast/recover-session/route.ts - OPTIMIZED RECOVERY
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const networkQuality = url.searchParams.get("networkQuality") || "medium";
    const quickJoin = url.searchParams.get("quickJoin") === "true";

    // Check for active session
    const { data: activeSession, error: sessionError } = await supabase
      .from("live_sessions")
      .select(`
        *,
        session_connections!inner(
          network_quality,
          device_type,
          last_updated
        )
      `)
      .eq("author_id", userId)
      .eq("is_active", true)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError && sessionError.code !== 'PGRST116') {
      console.error("Session query error:", sessionError);
    }

    if (!activeSession) {
      // Check for recent disconnected sessions that can be resumed
      const { data: recentSession } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("author_id", userId)
        .eq("is_active", false)
        .gte("started_at", new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!recentSession) {
        return NextResponse.json(
          { 
            error: "No recoverable session found",
            canCreateNew: true,
            message: "Start a new session to begin broadcasting"
          },
          { status: 404 }
        );
      }

      // Offer to reactivate recent session
      return NextResponse.json({
        canReactivate: true,
        recentSession: {
          id: recentSession.id,
          title: recentSession.title,
          description: recentSession.description,
          roomName: recentSession.room_name,
          endedAt: recentSession.ended_at,
          duration: recentSession.duration
        },
        message: "Recent session found. Would you like to reactivate it?"
      });
    }

    // Get audio tracks for active session (optimized for network quality)
    let audioTracksQuery = supabase
      .from("session_audio_tracks")
      .select("*")
      .eq("session_id", activeSession.id);

    // For poor network, limit and prioritize smaller files
    if (networkQuality === "low" || quickJoin) {
      audioTracksQuery = audioTracksQuery
        .order("file_size", { ascending: true })
        .limit(5); // Limit tracks for quick join
    } else {
      audioTracksQuery = audioTracksQuery
        .order("uploaded_at", { ascending: true });
    }

    const { data: audioTracks, error: tracksError } = await audioTracksQuery;

    if (tracksError) {
      console.error("Error fetching audio tracks:", tracksError);
    }

    // Get recent connection stats for network optimization
    const { data: connectionStats } = await supabase
      .from("session_connections")
      .select("network_quality, device_type, connection_stats")
      .eq("session_id", activeSession.id)
      .order("connected_at", { ascending: false })
      .limit(10);

    // Calculate session health metrics
    const currentListeners = activeSession.listener_count || 0;
    const sessionDuration = new Date().getTime() - new Date(activeSession.started_at).getTime();
    const isHealthy = sessionDuration < 4 * 60 * 60 * 1000; // Less than 4 hours

    // Determine if session needs optimization
    const needsOptimization = networkQuality === "low" || 
                             currentListeners > 50 || 
                             !isHealthy;

    // Transform the response with network optimizations
    const transformedSession = {
      id: activeSession.id,
      authorId: activeSession.author_id,
      authorName: activeSession.author_name,
      title: activeSession.title,
      description: activeSession.description,
      roomName: activeSession.room_name,
      startedAt: activeSession.started_at,
      listenerCount: currentListeners,
      isActive: activeSession.is_active,
      duration: Math.floor(sessionDuration / 1000), // in seconds
      health: {
        isHealthy,
        needsOptimization,
        averageNetworkQuality: connectionStats?.length ? 
          connectionStats.reduce((acc, conn) => {
            const quality = conn.network_quality;
            return acc + (quality === 'high' ? 3 : quality === 'medium' ? 2 : 1);
          }, 0) / connectionStats.length : 2,
        connectionStability: connectionStats?.length || 0
      },
      networkOptimizations: {
        quickJoinEnabled: networkQuality === "low" || quickJoin,
        adaptiveQualityEnabled: needsOptimization,
        bufferOptimization: networkQuality === "low",
        trackLimitApplied: (networkQuality === "low" || quickJoin) && audioTracks && audioTracks.length >= 5
      },
      audioTracks: audioTracks || [],
      totalTracks: audioTracks?.length || 0,
      canResume: true
    };

    // Update last activity
    await supabase
      .from("live_sessions")
      .update({ 
        last_activity: new Date().toISOString(),
        recovery_count: (activeSession.recovery_count || 0) + 1
      })
      .eq("id", activeSession.id);

    return NextResponse.json({ 
      session: transformedSession,
      success: true,
      optimizedForNetwork: networkQuality === "low",
      quickJoinMode: quickJoin,
      recommendations: {
        upgradeConnection: networkQuality === "low",
        limitConcurrentStreams: currentListeners > 20,
        useAudioOnly: networkQuality === "low",
        enableAdaptiveStreaming: needsOptimization
      }
    });
  } catch (error) {
    console.error("Session recovery error:", error);
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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { sessionId, action, networkQuality } = body;

    if (action === "reactivate" && sessionId) {
      // Reactivate a recent session
      const { data: session, error: sessionError } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("author_id", userId)
        .single();

      if (sessionError || !session) {
        return NextResponse.json(
          { error: "Session not found or unauthorized" },
          { status: 404 }
        );
      }

      // Reactivate the session
      const { data: reactivatedSession, error: reactivateError } = await supabase
        .from("live_sessions")
        .update({
          is_active: true,
          reactivated_at: new Date().toISOString(),
          ended_at: null,
          listener_count: 0,
          recovery_count: (session.recovery_count || 0) + 1
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (reactivateError) {
        console.error("Reactivation error:", reactivateError);
        return NextResponse.json(
          { error: "Failed to reactivate session" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        session: {
          id: reactivatedSession.id,
          roomName: reactivatedSession.room_name,
          title: reactivatedSession.title,
          reactivated: true
        },
        message: "Session reactivated successfully"
      });
    }

    if (action === "optimize" && sessionId) {
      // Apply network optimizations to existing session
      const { error: optimizeError } = await supabase
        .from("live_sessions")
        .update({
          network_optimization_enabled: true,
          preferred_quality: networkQuality,
          optimization_applied_at: new Date().toISOString()
        })
        .eq("id", sessionId)
        .eq("author_id", userId);

      if (optimizeError) {
        console.error("Optimization error:", optimizeError);
        return NextResponse.json(
          { error: "Failed to apply optimizations" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        optimizationsApplied: {
          networkQuality,
          adaptiveStreaming: true,
          bufferOptimization: networkQuality === "low",
          audioOnlyMode: networkQuality === "low"
        },
        message: "Network optimizations applied"
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Session recovery POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}