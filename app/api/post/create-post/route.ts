import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity/server';
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);
export async function POST(req: NextRequest) {
  try {

    
    const formData = await req.formData();

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const body = formData.get('body') as string;
    const slug = formData.get('slug') as string || title.toLowerCase().replace(/\s+/g, '-');
    const authorId = formData.get('authorId') as string;
    const imageRef = formData.get('imageRef') as string;
    const categoryIds = formData.getAll('categoryIds') as string[];

    // 1️⃣ Find author doc
    const authorDoc = await sanityClient.fetch(
      `*[_type == "author" && userId == $userId][0]{ _id, name }`,
      { userId: authorId }
    );

    if (!authorDoc?._id) {
      return NextResponse.json({ error: "Author not found in Sanity" }, { status: 404 });
    }

    // 2️⃣ Parse image reference
    let mainImage = null;
    if (imageRef) {
      try {
        mainImage = typeof imageRef === 'string' ? JSON.parse(imageRef) : imageRef;
      } catch (err) {
        console.error('Error parsing image reference:', err);
      }
    }

    // 3️⃣ Create post in Sanity first
    const post = await sanityClient.create({
      _type: 'post',
      title,
      description,
      slug: { _type: 'slug', current: slug },
      author: { _type: 'reference', _ref: authorDoc._id },
      categories: categoryIds.map((id: string) => ({ _type: 'reference', _ref: id })),
      mainImage,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      body,
      status: 'pending',
      rejectionReason: '',
      likes: [],
      comments: [],
    });

    // 4️⃣ Trigger TTS generation in background (non-blocking)
    (async () => {
      try {
        const res = await fetch(`${process.env.TTS_API_URL}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            author: authorDoc.name,
            description,
            body,
          }),
        });

        if (!res.ok) throw new Error('TTS generation failed');
        const audioBlobs = await res.json(); // { segments: [{ name, blob_base64 }] }

        // Upload each segment to Supabase
        const uploadedSegments = [];
        for (const seg of audioBlobs.segments) {
          const audioBuffer = Buffer.from(seg.blob_base64, 'base64');
          const path = `narrations/${post._id}/${seg.name}.mp3`;

          const { error } = await supabaseServer.storage
            .from('post-audios')
            .upload(path, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });

          if (error) throw error;

          const { data: publicUrlData } = supabaseServer.storage
            .from('post-audios')
            .getPublicUrl(path);

          uploadedSegments.push({
            name: seg.name,
            url: publicUrlData.publicUrl,
            createdAt: new Date().toISOString(),
          });
        }

        // Patch post in Sanity with audio metadata
        await sanityClient.patch(post._id).set({
          audioNarration: {
            _type: 'audioNarration',
            generatedAt: new Date().toISOString(),
            segments: uploadedSegments,
          },
        }).commit();

        console.log(`TTS narration saved for post ${post._id}`);
      } catch (ttsError) {
        console.error('TTS generation failed:', ttsError);
      }
    })();

    return NextResponse.json({ success: true, _id: post._id });
  } catch (err) {
    console.error('Error creating post:', err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
