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
    const { broadcastId, sessionId } = body;

    if (!broadcastId || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Broadcast ID and Session ID are required' },
        { status: 400 }
      );
    }

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

    // End the YouTube broadcast
    const youtubeService = new YouTubeLiveService(tokenData.access_token);
    await youtubeService.endBroadcast(broadcastId);

    // Update the session status in database
    const { error: updateError } = await supabase
      .from('podcasts')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update session status:', updateError);
      // Don't fail the request if database update fails
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