// app/api/podcast/mixed-audio/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COMPRESSION_SETTINGS = {
  low: { bitrate: "32k", sampleRate: 22050, channels: 1 },
  medium: { bitrate: "64k", sampleRate: 44100, channels: 1 },
  high: { bitrate: "128k", sampleRate: 44100, channels: 2 },
} as const;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const sessionId = formData.get("sessionId") as string | null;
    const trackType = formData.get("trackType") as string | null;
    const networkQuality =
      (formData.get("networkQuality") as keyof typeof COMPRESSION_SETTINGS) ??
      "medium";

    if (!audioFile || !sessionId || !trackType) {
      return NextResponse.json(
        { error: "Missing audio file, session ID, or track type" },
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
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.author_id !== userId) {
      return NextResponse.json(
        { error: "Only session author can upload audio" },
        { status: 403 }
      );
    }

    // Generate unique filename
    const fileExtension = audioFile.name.split(".").pop() ?? "mp3";
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `session-audio/${sessionId}/${uniqueFileName}`;

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload original to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("podcast-audio")
      .upload(filePath, buffer, {
        contentType: audioFile.type,
        upsert: false,
        cacheControl: "3600",
      });

    if (storageError) {
      console.error("Storage upload error:", storageError);
      return NextResponse.json(
        { error: "Failed to upload audio" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("podcast-audio")
      .getPublicUrl(filePath);

    // Build insert payload
    const insertPayload: Record<string, unknown> = {
      session_id: sessionId,
      track_type: trackType,
      filename: audioFile.name,
      storage_path: filePath,
      public_url: urlData.publicUrl,
      file_size: audioFile.size,
      mime_type: audioFile.type,
      compression_settings: JSON.stringify(COMPRESSION_SETTINGS[networkQuality]),
      uploaded_at: new Date().toISOString(),
    };

    // Insert safely
    const { data: audioTrack, error: trackError } = await supabase
      .from("session_audio_tracks")
      .insert(insertPayload)
      .select()
      .single();

    if (trackError || !audioTrack) {
      console.error("Database error:", trackError);
      // Clean up uploaded file if DB insert fails
      await supabase.storage.from("podcast-audio").remove([filePath]);
      return NextResponse.json(
        { error: "Failed to store audio track" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      trackId: audioTrack.id,
      publicUrl: urlData.publicUrl,
      networkQuality,
      compressionApplied: networkQuality !== "high",
      message: "Audio uploaded successfully",
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
    const networkQuality = url.searchParams.get("networkQuality") || "medium";

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" }, 
        { status: 400 }
      );
    }

    // Get audio tracks filtered by network quality if needed
    let query = supabase
      .from("session_audio_tracks")
      .select("*")
      .eq("session_id", sessionId);

    // For poor network, prioritize compressed tracks
    if (networkQuality === 'low') {
      query = query.order("file_size", { ascending: true });
    } else {
      query = query.order("uploaded_at", { ascending: true });
    }

    const { data: tracks, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch audio tracks" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      tracks,
      networkQuality,
      optimizedForNetwork: networkQuality === 'low'
    });
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

    // Delete from storage first
    if (track.storage_path) {
      await supabase.storage
        .from('podcast-audio')
        .remove([track.storage_path]);
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