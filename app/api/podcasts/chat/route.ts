// app/api/podcasts/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PodcastDatabase } from '@/lib/supabase-helpers';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      );
    }

    const messages = await PodcastDatabase.getChatMessages(sessionId);
    
    return NextResponse.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sessionId, message, username } = await request.json();

    if (!sessionId || !message || !username) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user is the host of this session
    const { data: session } = await supabase
      .from('podcast_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    const isHost = session?.user_id === userId;

    const newMessage = await PodcastDatabase.saveChatMessage({
      sessionId,
      userId,
      username,
      message,
      isHost
    });

    return NextResponse.json({
      success: true,
      message: newMessage
    });

  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}