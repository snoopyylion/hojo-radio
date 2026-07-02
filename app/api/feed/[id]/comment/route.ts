import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/feed/[id]/comment — list comments for a post
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await params;
    const { data, error } = await supabaseAdmin
      .from('feed_post_comments')
      .select(`
        id, body, created_at,
        author:users!feed_post_comments_author_id_fkey(id, username, first_name, last_name, image_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 });
    return NextResponse.json({ comments: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/feed/[id]/comment — add a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { body } = await request.json();
    if (!body?.trim()) return NextResponse.json({ error: 'Comment body required' }, { status: 400 });

    const { data: comment, error } = await supabaseAdmin
      .from('feed_post_comments')
      .insert({ post_id: postId, author_id: userId, body: body.trim() })
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });

    // Increment comment count via raw SQL increment
    await supabaseAdmin.rpc('increment_feed_post_comments', { post_id: postId });

    return NextResponse.json({ comment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
