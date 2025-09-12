// app/api/podcasts/current/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
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
      .eq('user_id', userId)
      .eq('is_live', true)
      .eq('status', 'live')
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching current session:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch current session' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ success: true, session: null });
    }

    const session = {
      id: data.id,
      title: data.title,
      description: data.description,
      userId: data.user_id,
      username: data.username,
      isLive: data.is_live,
      startTime: data.start_time,
      duration: data.duration || 0,
      listeners: data.listeners || 0,
      likes: data.likes || 0,
      status: data.status,
      youtubeWatchUrl: data.youtube_watch_url,
      createdAt: data.created_at
    };

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Failed to fetch current session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
