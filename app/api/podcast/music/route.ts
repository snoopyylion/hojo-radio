// app/api/podcast/music/route.ts
// Reusable music library for podcast hosts.
// The mobile client uploads the (compressed) song directly to Cloudinary, then
// POSTs the resulting metadata here. GET lists the library (all or ?mine=true).
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET /api/podcast/music?mine=true
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const mine = new URL(request.url).searchParams.get('mine') === 'true';

    let query = supabaseAdmin
      .from('music_tracks')
      .select('*')
      .order('created_at', { ascending: false });

    if (mine) query = query.eq('author_id', userId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const tracks = (data ?? []).map((t) => ({ ...t, isOwned: t.author_id === userId }));
    return NextResponse.json({ success: true, tracks });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/podcast/music
// Body: { title, artist?, url, publicId?, duration?, fileSize?, format? }
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only authors curate the library (they're the ones who go live).
    const { data: user } = await supabaseAdmin
      .from('users').select('role').eq('id', userId).single();
    if (user?.role !== 'author') {
      return NextResponse.json({ error: 'Only authors can add music' }, { status: 403 });
    }

    const body = await request.json();
    const { title, artist, url, publicId, duration, fileSize, format } = body;
    if (!title || !url) {
      return NextResponse.json({ error: 'title and url are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('music_tracks')
      .insert({
        author_id: userId,
        title,
        artist: artist ?? null,
        url,
        public_id: publicId ?? null,
        duration: duration ?? null,
        file_size: fileSize ?? null,
        format: format ?? null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, track: { ...data, isOwned: true } });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/podcast/music  Body: { id }
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data: track } = await supabaseAdmin
      .from('music_tracks').select('author_id, public_id').eq('id', id).single();
    if (!track) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (track.author_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Best-effort remove from Cloudinary (audio is stored under the video type).
    if (track.public_id) {
      try { await cloudinary.uploader.destroy(track.public_id, { resource_type: 'video' }); } catch {}
    }

    const { error } = await supabaseAdmin.from('music_tracks').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
