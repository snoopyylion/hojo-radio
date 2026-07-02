import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/stories — active (unexpired) stories grouped by author. Public.
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('stories')
      .select(`
        id, media_url, media_type, thumbnail_url, duration_seconds, created_at, expires_at,
        author:users!stories_author_id_fkey(id, username, first_name, last_name, image_url)
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 });

    // Group by author_id, preserving insertion order (most-recent author first)
    const grouped: Record<string, { author: unknown; stories: unknown[] }> = {};
    for (const story of data ?? []) {
      const authorId = (story.author as { id: string } | null)?.id;
      if (!authorId) continue;
      if (!grouped[authorId]) grouped[authorId] = { author: story.author, stories: [] };
      grouped[authorId].stories.push(story);
    }

    return NextResponse.json({ groups: Object.values(grouped) });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/stories
// Body: { media_url, media_type, thumbnail_url?, duration_seconds? }
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { media_url, media_type, thumbnail_url, duration_seconds } = body;

    if (!media_url || !media_type) {
      return NextResponse.json({ error: 'media_url and media_type are required' }, { status: 400 });
    }

    const { data: story, error } = await supabaseAdmin
      .from('stories')
      .insert({ author_id: userId, media_url, media_type, thumbnail_url, duration_seconds })
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to create story' }, { status: 500 });

    return NextResponse.json({ story }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
