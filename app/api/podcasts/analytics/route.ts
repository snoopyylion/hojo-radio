// app/api/podcasts/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { PodcastDatabase } from '@/lib/supabase-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (sessionId) {
      // Get analytics for specific session
      const { data: session, error: sessionError } = await supabase
        .from('podcast_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (sessionError || !session) {
        return NextResponse.json(
          { success: false, error: 'Session not found' },
          { status: 404 }
        );
      }

      // Get latest analytics data
      const { data: analyticsData } = await supabase
        .from('live_analytics')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      // Get message count
      const { count: messageCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);

      const analytics = {
        listeners: session.listeners || 0,
        likes: session.likes || 0,
        comments: messageCount || 0,
        duration: session.duration || 0,
        status: session.status,
        countries: analyticsData?.countries || [],
        deviceTypes: analyticsData?.device_types || { mobile: 0, desktop: 0, tablet: 0 },
        peakListeners: analyticsData?.listeners || session.listeners || 0
      };

      return NextResponse.json({
        success: true,
        analytics
      });
    } else {
      // Get overall user analytics
      const userStats = await PodcastDatabase.getUserStats(userId);
      
      // Get recent sessions
      const { data: recentSessions } = await supabase
        .from('podcast_sessions')
        .select('id, title, listeners, likes, created_at, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      return NextResponse.json({
        success: true,
        userStats: userStats || {
          total_sessions: 0,
          total_listeners: 0,
          total_likes: 0,
          total_watch_time: 0,
          followers_count: 0
        },
        recentSessions: recentSessions || []
      });
    }

  } catch (error) {
    console.error('Analytics fetch failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// Update analytics in real-time
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sessionId, listeners, countries, deviceTypes } = await request.json();

    // Verify user owns this session
    const { data: session } = await supabase
      .from('podcast_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (!session || session.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized for this session' },
        { status: 403 }
      );
    }

    // Update session listener count
    await PodcastDatabase.updateListenerCount(sessionId, listeners);

    // Insert analytics snapshot
    await supabase
      .from('live_analytics')
      .insert([{
        session_id: sessionId,
        listeners,
        countries: countries || [],
        device_types: deviceTypes || { mobile: 0, desktop: 0, tablet: 0 }
      }]);

    return NextResponse.json({
      success: true,
      message: 'Analytics updated'
    });

  } catch (error) {
    console.error('Analytics update failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update analytics' },
      { status: 500 }
    );
  }
}