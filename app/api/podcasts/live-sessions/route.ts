// app/api/podcasts/live-sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get all active live sessions
    const { data: sessions, error } = await supabase
      .from('podcast_sessions')
      .select(`
        id,
        title,
        description,
        user_id,
        username,
        is_live,
        start_time,
        duration,
        listeners,
        likes,
        status,
        youtube_watch_url,
        created_at
      `)
      .eq('is_live', true)
      .eq('status', 'live')
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching live sessions:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch live sessions' },
        { status: 500 }
      );
    }

    // Transform the data to match frontend expectations
    const transformedSessions = sessions.map(session => ({
      id: session.id,
      title: session.title,
      description: session.description,
      userId: session.user_id,
      username: session.username,
      isLive: session.is_live,
      startTime: session.start_time,
      duration: session.duration || 0,
      listeners: session.listeners || 0,
      likes: session.likes || 0,
      status: session.status,
      youtubeWatchUrl: session.youtube_watch_url,
      createdAt: session.created_at
    }));

    return NextResponse.json({
      success: true,
      sessions: transformedSessions
    });

  } catch (error) {
    console.error('Failed to fetch live sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
