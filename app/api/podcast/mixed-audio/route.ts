// app/api/podcast/mixed-audio/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const sessionId = formData.get("sessionId") as string;
    const trackType = formData.get("trackType") as string; // "voice", "music", "jingle"

    if (!audioFile || !sessionId) {
      return NextResponse.json(
        { error: "Missing audio file or session ID" }, 
        { status: 400 }
      );
    }

    // Verify session exists and user is the author
    const { data: session, error: sessionError } = await supabase
      .from("live_sessions")
      .select("author_id, room_name")
      .eq("id", sessionId)
      .eq("is_active", true)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" }, 
        { status: 404 }
      );
    }

    if (session.author_id !== userId) {
      return NextResponse.json(
        { error: "Only session author can upload audio" }, 
        { status: 403 }
      );
    }


    // Store audio metadata in database
    const { data: audioTrack, error: trackError } = await supabase
      .from("session_audio_tracks")
      .insert({
        session_id: sessionId,
        track_type: trackType,
        filename: audioFile.name,
        file_size: audioFile.size,
        mime_type: audioFile.type,
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (trackError) {
      console.error("Database error:", trackError);
      return NextResponse.json(
        { error: "Failed to store audio track" },
        { status: 500 }
      );
    }

    // In a production environment, you would:
    // 1. Upload the buffer to a storage service (S3, Supabase Storage, etc.)
    // 2. Stream it to LiveKit for real-time mixing
    // 3. Apply audio processing/effects

    return NextResponse.json({
      success: true,
      trackId: audioTrack.id,
      message: "Audio uploaded and ready for streaming",
      roomName: session.room_name,
    });
  } catch (error) {
    console.error("Mixed audio upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" }, 
        { status: 400 }
      );
    }

    // Get all audio tracks for a session
    const { data: tracks, error } = await supabase
      .from("session_audio_tracks")
      .select("*")
      .eq("session_id", sessionId)
      .order("uploaded_at", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch audio tracks" },
        { status: 500 }
      );
    }

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("Get audio tracks error:", error);
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
    const { trackId } = body;

    if (!trackId) {
      return NextResponse.json(
        { error: "Track ID required" }, 
        { status: 400 }
      );
    }

    // Verify user owns this track
    const { data: track, error: trackError } = await supabase
      .from("session_audio_tracks")
      .select(`
        *,
        live_sessions!inner(author_id)
      `)
      .eq("id", trackId)
      .single();

    if (trackError || !track) {
      return NextResponse.json(
        { error: "Track not found" }, 
        { status: 404 }
      );
    }

    if (track.live_sessions.author_id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to delete this track" }, 
        { status: 403 }
      );
    }

    // Delete track record
    const { error: deleteError } = await supabase
      .from("session_audio_tracks")
      .delete()
      .eq("id", trackId);

    if (deleteError) {
      console.error("Database error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete track" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete audio track error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}