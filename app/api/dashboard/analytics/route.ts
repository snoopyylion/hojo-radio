
// app/api/dashboard/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total posts viewed by user
    const { count: totalPostsViewed, error: totalError } = await supabaseAdmin
      .from('post_views')
      .select('post_id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (totalError) {
      console.error('Error getting total posts viewed:', totalError);
      return NextResponse.json({ error: "Failed to get total posts viewed" }, { status: 500 });
    }

    // Get unique posts viewed by user
    const { data: uniquePosts, error: uniqueError } = await supabaseAdmin
      .from('post_views')
      .select('post_id')
      .eq('user_id', userId);

    if (uniqueError) {
      console.error('Error getting unique posts:', uniqueError);
      return NextResponse.json({ error: "Failed to get unique posts" }, { status: 500 });
    }

    const uniquePostsViewed = new Set(uniquePosts?.map(p => p.post_id)).size;

    // Get posts viewed in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: weeklyPostsViewed, error: weeklyError } = await supabaseAdmin
      .from('post_views')
      .select('post_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('viewed_at', sevenDaysAgo.toISOString());

    if (weeklyError) {
      console.error('Error getting weekly posts viewed:', weeklyError);
      return NextResponse.json({ error: "Failed to get weekly posts viewed" }, { status: 500 });
    }

    // Get recently viewed posts (last 10)
    const { data: recentlyViewed, error: recentError } = await supabaseAdmin
      .from('post_views')
      .select('post_id, post_title, post_slug, viewed_at')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Error getting recently viewed:', recentError);
      return NextResponse.json({ error: "Failed to get recently viewed" }, { status: 500 });
    }

    // Get daily view counts for the last 7 days
    const { data: dailyViews, error: dailyError } = await supabaseAdmin
      .from('post_views')
      .select('viewed_at')
      .eq('user_id', userId)
      .gte('viewed_at', sevenDaysAgo.toISOString())
      .order('viewed_at', { ascending: true });

    if (dailyError) {
      console.error('Error getting daily views:', dailyError);
      return NextResponse.json({ error: "Failed to get daily views" }, { status: 500 });
    }

    // Process daily views into a chart-friendly format
    const dailyViewCounts = dailyViews?.reduce((acc: Record<string, number>, view) => {
      const date = new Date(view.viewed_at).toDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {}) || {};

    return NextResponse.json({
      totalViews: totalPostsViewed || 0,
      uniquePostsViewed,
      weeklyViews: weeklyPostsViewed || 0,
      recentlyViewed: recentlyViewed || [],
      dailyViewCounts
    });

  } catch (error) {
    console.error('Error in dashboard analytics:', error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}