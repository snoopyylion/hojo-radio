// app/api/podcasts/live/stop/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { YouTubeLiveService } from '@/lib/youtube-live';

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

    const body = await request.json();
    const { broadcastId: bodyBroadcastId, sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Load session to verify ownership and get broadcast id if missing
    const { data: sessionRow, error: sessionErr } = await supabase
      .from('podcast_sessions')
      .select('id, user_id, youtube_broadcast_id')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !sessionRow || sessionRow.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'No active live session to stop' },
        { status: 404 }
      );
    }

    const broadcastId = bodyBroadcastId || sessionRow.youtube_broadcast_id || null;

    // If we have a broadcastId, try to end the YouTube broadcast; otherwise, just end locally
    if (broadcastId) {
      // Get YouTube access token from database
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_youtube_tokens')
        .select('access_token')
        .eq('user_id', userId)
        .single();

      if (tokenError || !tokenData?.access_token) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'YouTube access token not found'
          },
          { status: 400 }
        );
      }

      const youtubeService = new YouTubeLiveService(tokenData.access_token);
      try {
        await youtubeService.endBroadcast(broadcastId);
      } catch (error: any) {
        const msg = String(error?.message || '');
        const reason = (error?.reason || '').toString();
        console.error('YouTube API error:', error);

        const isReadyStateError = msg.includes('Cannot end broadcast from status: ready') || reason === 'invalidTransition';
        const isNotFound = msg.toLowerCase().includes('not found') || reason === 'notFound';
        const isForbidden = msg.toLowerCase().includes('forbidden') || reason === 'forbidden';

        if (isForbidden) {
          return NextResponse.json(
            { success: false, error: 'Permission denied to access this broadcast' },
            { status: 403 }
          );
        }

        if (!(isReadyStateError || isNotFound)) {
          return NextResponse.json(
            { success: false, error: msg || 'Failed to end YouTube broadcast' },
            { status: 500 }
          );
        }
      }
    }

    // Update the session status in database
    const { error: updateError } = await supabase
      .from('podcast_sessions')
      .update({ 
        status: 'ended',
        is_live: false,
        end_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update session status:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Live stream stopped successfully'
    });

  } catch (error) {
    console.error('Failed to stop live stream:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stop live stream' },
      { status: 500 }
    );
  }
}