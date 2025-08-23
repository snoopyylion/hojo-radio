
// app/api/post/[id]/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;

    // Get total views for this post
    const { count: totalViews, error: totalError } = await supabaseAdmin
      .from('post_views')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (totalError) {
      console.error('Error getting total views:', totalError);
      return NextResponse.json({ error: "Failed to get total views" }, { status: 500 });
    }

    // Get unique viewers
    const { data: uniqueViewers, error: uniqueError } = await supabaseAdmin
      .from('post_views')
      .select('user_id')
      .eq('post_id', postId);

    if (uniqueError) {
      console.error('Error getting unique viewers:', uniqueError);
      return NextResponse.json({ error: "Failed to get unique viewers" }, { status: 500 });
    }

    const uniqueViewerCount = new Set(uniqueViewers?.map(v => v.user_id)).size;

    // Get views for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: weeklyViews, error: weeklyError } = await supabaseAdmin
      .from('post_views')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .gte('viewed_at', sevenDaysAgo.toISOString());

    if (weeklyError) {
      console.error('Error getting weekly views:', weeklyError);
      return NextResponse.json({ error: "Failed to get weekly views" }, { status: 500 });
    }

    return NextResponse.json({
      postId,
      totalViews: totalViews || 0,
      uniqueViewers: uniqueViewerCount,
      weeklyViews: weeklyViews || 0
    });

  } catch (error) {
    console.error('Error in stats endpoint:', error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
