// app/api/podcasts/join-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sessionId, action } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify the session exists and is live
    const { data: session, error: sessionError } = await supabase
      .from('podcast_sessions')
      .select('id, is_live, status, listeners')
      .eq('id', sessionId)
      .eq('is_live', true)
      .eq('status', 'live')
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Live session not found' },
        { status: 404 }
      );
    }

    if (action === 'join') {
      // Increment listener count
      const { error: updateError } = await supabase
        .from('podcast_sessions')
        .update({ 
          listeners: (session.listeners || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Error updating listener count:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to join session' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Joined session successfully',
        listenerCount: (session.listeners || 0) + 1
      });

    } else if (action === 'leave') {
      // Decrement listener count (but not below 0)
      const newListenerCount = Math.max((session.listeners || 0) - 1, 0);
      
      const { error: updateError } = await supabase
        .from('podcast_sessions')
        .update({ 
          listeners: newListenerCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Error updating listener count:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to leave session' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Left session successfully',
        listenerCount: newListenerCount
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Failed to handle session join/leave:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
