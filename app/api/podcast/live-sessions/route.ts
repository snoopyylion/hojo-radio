// app/api/podcast/live-sessions/route.ts this is for mobile
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: sessions, error } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('is_active', true)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Live sessions fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    const normalized = (sessions || []).map((s) => ({
      id: s.id,
      authorId: s.author_id,
      authorName: s.author_name,
      title: s.title,
      description: s.description || '',
      roomName: s.room_name,
      startedAt: s.started_at,
      listenerCount: s.listener_count || 0,
      isActive: s.is_active,
    }));

    return NextResponse.json({ sessions: normalized });
  } catch (error) {
    console.error('Live sessions API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}