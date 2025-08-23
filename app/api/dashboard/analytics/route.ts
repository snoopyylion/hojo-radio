
// app/api/dashboard/analytics/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auth } from '@clerk/nextjs/server';

interface RecentlyViewedPost {
  post_id: string;
  post_title: string;
  post_slug: string;
  viewed_at: string;
}

interface DashboardAnalytics {
  totalViews: number;
  uniquePostsViewed: number;
  weeklyViews: number;
  recentlyViewed: RecentlyViewedPost[];
  dailyViewCounts: Record<string, number>;
}

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total views for this user
    const { count: totalViews, error: totalError } = await supabaseAdmin
      .from('post_views')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (totalError) {
      console.error('Error getting total views:', totalError);
      return NextResponse.json({ error: "Failed to get total views" }, { status: 500 });
    }

    // Get unique posts viewed
    const { data: uniquePosts, error: uniqueError } = await supabaseAdmin
      .from('post_views')
      .select('post_id')
      .eq('user_id', userId);

    if (uniqueError) {
      console.error('Error getting unique posts:', uniqueError);
      return NextResponse.json({ error: "Failed to get unique posts" }, { status: 500 });
    }

    const uniquePostsViewed = new Set(uniquePosts?.map(p => p.post_id)).size;

    // Get views for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: weeklyViews, error: weeklyError } = await supabaseAdmin
      .from('post_views')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('viewed_at', sevenDaysAgo.toISOString());

    if (weeklyError) {
      console.error('Error getting weekly views:', weeklyError);
      return NextResponse.json({ error: "Failed to get weekly views" }, { status: 500 });
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

    // Get daily view counts for last 7 days
    const { data: dailyViews, error: dailyError } = await supabaseAdmin
      .from('post_views')
      .select('viewed_at')
      .eq('user_id', userId)
      .gte('viewed_at', sevenDaysAgo.toISOString());

    if (dailyError) {
      console.error('Error getting daily views:', dailyError);
      return NextResponse.json({ error: "Failed to get daily views" }, { status: 500 });
    }

    // Process daily view counts
    const dailyViewCounts: Record<string, number> = {};
    const today = new Date();
    
    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyViewCounts[dateKey] = 0;
    }

    // Count views for each day
    dailyViews?.forEach(view => {
      const dateKey = new Date(view.viewed_at).toISOString().split('T')[0];
      if (dailyViewCounts[dateKey] !== undefined) {
        dailyViewCounts[dateKey]++;
      }
    });

    const analytics: DashboardAnalytics = {
      totalViews: totalViews || 0,
      uniquePostsViewed,
      weeklyViews: weeklyViews || 0,
      recentlyViewed: recentlyViewed || [],
      dailyViewCounts
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error in dashboard analytics:', error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}