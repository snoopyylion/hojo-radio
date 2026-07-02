import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/feed/[id]/like — toggle like on a feed post
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data: existing } = await supabaseAdmin
      .from('feed_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from('feed_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      await supabaseAdmin.rpc('decrement_feed_post_likes', { post_id: postId });
      const { data } = await supabaseAdmin.from('feed_posts').select('likes_count').eq('id', postId).single();
      return NextResponse.json({ liked: false, likes_count: data?.likes_count ?? 0 });
    } else {
      await supabaseAdmin
        .from('feed_post_likes')
        .upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id', ignoreDuplicates: true });

      await supabaseAdmin.rpc('increment_feed_post_likes', { post_id: postId });
      const { data } = await supabaseAdmin.from('feed_posts').select('likes_count').eq('id', postId).single();
      return NextResponse.json({ liked: true, likes_count: data?.likes_count ?? 1 });
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
