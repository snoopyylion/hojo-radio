// app/api/podcasts/session/[sessionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get the specific session
    const { data: session, error } = await supabase
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
        youtube_broadcast_id,
        created_at
      `)
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Transform the data to match frontend expectations
    const transformedSession = {
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
      youtubeBroadcastId: session.youtube_broadcast_id,
      createdAt: session.created_at
    };

    return NextResponse.json({
      success: true,
      session: transformedSession
    });

  } catch (error) {
    console.error('Failed to fetch session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
