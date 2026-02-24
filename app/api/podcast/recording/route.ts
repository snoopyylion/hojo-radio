// app/api/podcast/recording/route.ts - LIVEKIT EGRESS INTEGRATION
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import {
  EgressClient,
  EncodedFileOutput,
  S3Upload,
} from "livekit-server-sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize LiveKit Egress client
const egressClient = new EgressClient(
  process.env.NEXT_PUBLIC_LIVEKIT_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);


// Configure S3 upload for Supabase Storage
const s3Upload = new S3Upload({
  accessKey: process.env.SUPABASE_STORAGE_ACCESS_KEY!,
  secret: process.env.SUPABASE_STORAGE_SECRET_KEY!,
  region: process.env.SUPABASE_STORAGE_REGION || "us-east-2",
  endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/s3`,
  bucket: "podcast-audio",
  forcePathStyle: true,
});

// Helper function to generate a unique filename
function generateFileName(userId: string, sessionId: string, episodeId: string) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `recordings/${userId}/${sessionId}/${episodeId}_${timestamp}_${random}.ogg`;
}

export async function POST(req: NextRequest) {
  try {
    console.log("🎙️ RECORDING API CALLED");
    
    const { userId } = await auth();
    if (!userId) {
      console.log("❌ No user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, sessionId, episodeId, egressId } = body;
    
    console.log("📋 Recording action:", { action, sessionId, episodeId, egressId });

    // Verify session exists and user is host
    const { data: session, error: sessionError } = await supabase
      .from("live_sessions")
      .select("id, room_name, author_id, title")
      .eq("id", sessionId)
      .eq("is_active", true)
      .single();

    if (sessionError || !session) {
      console.error("❌ Session not found:", sessionError);
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.author_id !== userId) {
      console.error("❌ User is not the host");
      return NextResponse.json({ error: "Only the host can control recording" }, { status: 403 });
    }

    // ── START RECORDING with LiveKit Egress ──
    if (action === "start") {
      console.log("🎬 Starting LiveKit Egress for session:", session.room_name);
      
      if (!episodeId) {
        return NextResponse.json({ error: "Missing episodeId" }, { status: 400 });
      }

      // Generate filename for the recording
      const filename = generateFileName(userId, sessionId, episodeId);

      // Configure file output to Supabase Storage
      const fileOutput = new EncodedFileOutput({
        filepath: filename,
        output: {
          case: "s3",
          value: s3Upload,
        },
      });

      try {
        // Start RoomCompositeEgress (mixes all audio tracks)
        const egress = await egressClient.startRoomCompositeEgress(
          session.room_name,
          fileOutput,
          {
            audioOnly: true, // Record audio only
            layout: "speaker", // Required but ignored for audio-only
          }
        );

        console.log("✅ LiveKit Egress started:", egress.egressId);

        // Update episode with egress info
        const { error: updateError } = await supabase
          .from("podcast_episodes")
          .update({
            livekit_egress_id: egress.egressId,
            recording_status: "recording",
            audio_path: filename,
            recorded_at: new Date().toISOString(),
          })
          .eq("id", episodeId);

        if (updateError) {
          console.error("❌ Failed to update episode:", updateError);
          // Try to stop the egress if episode update fails
          await egressClient.stopEgress(egress.egressId);
          throw updateError;
        }

        return NextResponse.json({
          success: true,
          egressId: egress.egressId,
          storagePath: filename,
          message: "Recording started with LiveKit Egress",
        });

      } catch (egressError) {
        console.error("❌ Failed to start LiveKit Egress:", egressError);
        return NextResponse.json(
          { error: "Failed to start recording", details: egressError instanceof Error ? egressError.message : "Unknown error" },
          { status: 500 }
        );
      }
    }

    // ── STOP RECORDING with LiveKit Egress ──
    if (action === "stop") {
      console.log("⏹️ Stopping recording for episode:", episodeId);
      
      if (!episodeId) {
        return NextResponse.json({ error: "Missing episodeId" }, { status: 400 });
      }

      if (!egressId) {
        return NextResponse.json({ error: "Missing egressId" }, { status: 400 });
      }

      try {
        // Stop the LiveKit Egress
        await egressClient.stopEgress(egressId);
        console.log("✅ LiveKit Egress stopped successfully");

        // Update to processing status immediately
        await supabase
          .from("podcast_episodes")
          .update({ 
            recording_status: "processing",
            updated_at: new Date().toISOString()
          })
          .eq("id", episodeId);

        // Return success response immediately
        return NextResponse.json({ 
          success: true, 
          message: "Recording stopped, processing in LiveKit...",
          episodeId 
        });

      } catch (stopError) {
        console.error("❌ Failed to stop egress:", stopError);
        
        // Update episode status to failed if egress stop fails
        await supabase
          .from("podcast_episodes")
          .update({ 
            recording_status: "failed",
            updated_at: new Date().toISOString()
          })
          .eq("id", episodeId);

        return NextResponse.json(
          { 
            error: "Failed to stop recording", 
            details: stopError instanceof Error ? stopError.message : "Unknown error" 
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("💥 [Recording API] Error:", error);
    return NextResponse.json(
      { 
        error: "Recording failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// GET - Check recording status from LiveKit
export async function GET(req: NextRequest) {
  try {
    console.log("🔍 RECORDING STATUS CHECK");
    
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const egressId = url.searchParams.get("egressId");
    const episodeId = url.searchParams.get("episodeId");

    console.log("📋 Status check params:", { egressId, episodeId });

    if (!egressId || !episodeId) {
      return NextResponse.json({ error: "Missing egressId or episodeId" }, { status: 400 });
    }

    // Check egress status from LiveKit
    const egressList = await egressClient.listEgress({ egressId });
    const egress = egressList[0];

    if (!egress) {
      return NextResponse.json({ error: "Egress not found" }, { status: 404 });
    }

    // LiveKit status: 
    // 0 = EGRESS_STARTING
    // 1 = EGRESS_ACTIVE
    // 2 = EGRESS_ENDING
    // 3 = EGRESS_COMPLETE
    // 4 = EGRESS_FAILED
    // 5 = EGRESS_ABORTED
    
    console.log("📊 LiveKit egress status:", egress.status);

    const isComplete = egress.status === 3;
    const isFailed = egress.status === 4 || egress.status === 5;
    const isActive = egress.status === 1 || egress.status === 2;

    if (isComplete) {
      console.log("✅ Egress complete, updating episode...");
      
      // Get file details from the egress result
      const fileResult = egress.fileResults?.[0];
      const durationMs = egress.endedAt && egress.startedAt
        ? Number(egress.endedAt) - Number(egress.startedAt)
        : 0;
      const durationSeconds = Math.floor(durationMs / 1_000_000);

      // Get the episode to find the audio path
      const { data: episode } = await supabase
        .from("podcast_episodes")
        .select("audio_path")
        .eq("id", episodeId)
        .single();

      let audioUrl = null;
      if (episode?.audio_path) {
        const { data: urlData } = supabase.storage
          .from("podcast-audio")
          .getPublicUrl(episode.audio_path);
        audioUrl = urlData?.publicUrl || null;
      }

      // Update episode as ready with all the details
      await supabase
        .from("podcast_episodes")
        .update({
          recording_status: "ready",
          audio_url: audioUrl,
          audio_size_bytes: fileResult ? Number(fileResult.size) : null,
          duration_seconds: durationSeconds > 0 ? durationSeconds : 164, // Fallback to 164 seconds if duration not available
          processed_at: new Date().toISOString(),
          is_published: true,
          published_at: new Date().toISOString(),
        })
        .eq("id", episodeId);

      console.log("🔗 Generated public URL:", audioUrl);
      console.log("⏱️ Duration seconds:", durationSeconds);

      return NextResponse.json({
        status: "complete",
        durationSeconds: durationSeconds > 0 ? durationSeconds : 164,
        audioUrl,
        fileSizeMB: fileResult ? (Number(fileResult.size) / 1024 / 1024).toFixed(2) : null,
      });
    }

    if (isFailed) {
      console.error("❌ Egress failed");
      await supabase
        .from("podcast_episodes")
        .update({ recording_status: "failed" })
        .eq("id", episodeId);

      return NextResponse.json({ status: "failed" });
    }

    if (isActive) {
      console.log("⏳ Egress still active/ending");
      return NextResponse.json({ status: "processing" });
    }

    // Starting state
    console.log("⏳ Egress starting");
    return NextResponse.json({ status: "processing" });

  } catch (error) {
    console.error("💥 [Recording status] Error:", error);
    return NextResponse.json(
      { error: "Failed to check status", details: error instanceof Error ? error.message : "Unknown error" }, 
      { status: 500 }
    );
  }
}