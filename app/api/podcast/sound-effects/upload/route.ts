// app/api/podcast/sound-effects/upload/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // needs service role for writes
);

// Disable body size parsing so we can handle file uploads
export const config = {
  api: {
    bodyParser: false, // Disable body parsing
  },
};

export async function POST(req: Request) {
  try {
    // inside your POST handler
    const { parseBuffer } = await import("music-metadata");

    // 🔐 Clerk auth - Use currentUser() instead of auth()
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // 🔍 Get user from Supabase users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (userData.role !== "author") {
      return NextResponse.json({ error: "Only authors can upload sound effects" }, { status: 403 });
    }

    // 📂 Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const category = (formData.get("category") as string) || "general";
    const tags = (formData.get("tags") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer for Supabase upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Optional: extract duration using music-metadata
    let duration: number | null = null;
    try {
      const metadata = await parseBuffer(buffer, file.type);
      duration = Math.round(metadata.format.duration || 0);
    } catch (err) {
      console.warn("Could not extract duration:", err);
    }

    // Generate unique path in bucket
    const filePath = `sound-effects/${userData.id}/${Date.now()}-${file.name}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("sound-effects")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("sound-effects")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Insert metadata into sound_effects table
    const { error: dbError } = await supabase.from("sound_effects").insert({
      author_id: userData.id, // Clerk user ID from users table
      title,
      category,
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      file_url: publicUrl,
      file_size: file.size,
      duration,
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
      return NextResponse.json({ error: "Database insert failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, file_url: publicUrl });
  } catch (err) {
    console.error("Upload route error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}