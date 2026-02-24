// app/api/podcast/episode/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const episodeId = formData.get("episodeId") as string;

    if (!audioFile || !episodeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify ownership
    const { data: episode } = await supabase
      .from("podcast_episodes")
      .select("id, author_id")
      .eq("id", episodeId)
      .eq("author_id", userId)
      .single();

    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    // Upload to storage
    const ext = audioFile.name.split(".").pop() || "mp3";
    const path = `episodes/${userId}/${episodeId}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await audioFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("podcast-audio")
      .upload(path, buffer, {
        contentType: audioFile.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("podcast-audio")
      .getPublicUrl(path);

    // Update episode record
    await supabase
      .from("podcast_episodes")
      .update({
        audio_path: path,
        audio_url: urlData.publicUrl,
        recording_status: "ready",
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .eq("id", episodeId);

    return NextResponse.json({ success: true, url: urlData.publicUrl });

  } catch (error) {
    console.error("[Upload error]", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}