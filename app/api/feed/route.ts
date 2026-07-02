import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/feed?cursor=<created_at>&limit=20
// Returns feed posts with author info. Public.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);
    const cursor = searchParams.get('cursor');
    const authorOnly = searchParams.get('authorOnly') === 'true';
    const following  = searchParams.get('following')  === 'true';
    const { userId } = await auth();

    // Resolve filter sets before building the query
    let filterIds: string[] | null = null;

    if (authorOnly) {
      const { data: authors } = await supabaseAdmin
        .from('users').select('id').eq('role', 'author');
      filterIds = (authors ?? []).map((a) => a.id);
      if (filterIds.length === 0) return NextResponse.json({ posts: [], nextCursor: null });
    }

    if (following && userId) {
      const { data: followData } = await supabaseAdmin
        .from('follows').select('following_id').eq('follower_id', userId);
      filterIds = (followData ?? []).map((f) => f.following_id);
      if (filterIds.length === 0) return NextResponse.json({ posts: [], nextCursor: null });
    }

    let query = supabaseAdmin
      .from('feed_posts')
      .select(`
        id, caption, media, post_type, likes_count, comments_count, created_at,
        author:users!feed_posts_author_id_fkey(id, username, first_name, last_name, image_url, role)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filterIds) query = query.in('author_id', filterIds);
    if (cursor) query = query.lt('created_at', cursor);

    const { data: posts, error } = await query;
    if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 });

    // If signed in, batch-check which posts the current user liked
    let likedSet = new Set<string>();
    if (userId && posts?.length) {
      const ids = posts.map((p) => p.id);
      const { data: likes } = await supabaseAdmin
        .from('feed_post_likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', ids);
      likedSet = new Set((likes ?? []).map((l) => l.post_id));
    }

    const enriched = (posts ?? []).map((p) => ({
      ...p,
      liked: likedSet.has(p.id),
    }));

    const nextCursor = posts?.length === limit ? posts[posts.length - 1].created_at : null;

    return NextResponse.json({ posts: enriched, nextCursor });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/feed
// Body: { caption, media, post_type }
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { caption, media = [], post_type = 'text' } = body;

    if (!caption?.trim() && media.length === 0) {
      return NextResponse.json({ error: 'Post must have caption or media' }, { status: 400 });
    }

    const { data: post, error } = await supabaseAdmin
      .from('feed_posts')
      .insert({ author_id: userId, caption: caption?.trim() ?? null, media, post_type })
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });

    return NextResponse.json({ post }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
