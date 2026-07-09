// app/api/user/stats/route.ts
// Counts only — avoids shipping full follower/post lists just to render numbers.
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { client } from '@/sanity/lib/client';

const POSTS_COUNT_QUERY = `count(*[_type == "post" && author->userId == $userId])`;

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const targetUserId = new URL(req.url).searchParams.get('userId') || userId;

    // head:true returns the count without transferring any rows.
    const [followersRes, followingRes, postsCount] = await Promise.all([
      supabaseAdmin
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId),
      supabaseAdmin
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId),
      client.fetch<number>(POSTS_COUNT_QUERY, { userId: targetUserId }).catch(() => 0),
    ]);

    return NextResponse.json({
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
      posts: postsCount ?? 0,
    });
  } catch (error) {
    console.error('/api/user/stats error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
