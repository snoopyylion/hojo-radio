// app/api/podcasts/live/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Start a live stream session
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { title, description, username } = await request.json();
    
    // In production, you would:
    // 1. Create YouTube Live broadcast
    // 2. Get RTMP endpoint
    // 3. Store session in Supabase database
    
    const liveSession = {
      id: `live_${Date.now()}`,
      title,
      description,
      streamUrl: 'rtmp://a.rtmp.youtube.com/live2',
      streamKey: 'your-youtube-stream-key', // From YouTube API
      chatId: `chat_${Date.now()}`,
      startTime: new Date().toISOString(),
      status: 'live',
      userId, // Clerk user ID as text
      username
    };
    
    // Store in Supabase
    // await supabase.from('podcast_sessions').insert([liveSession]);
    
    return NextResponse.json({ 
      success: true, 
      session: liveSession 
    });
    
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create live session' },
      { status: 500 }
    );
  }
}

// Get active live sessions
export async function GET() {
  try {
    // In production: fetch from database
    const mockSessions = [
      {
        id: 'live_123',
        title: 'Tech Talk Tuesday',
        listeners: 45,
        startTime: new Date().toISOString()
      }
    ];
    
    return NextResponse.json({ 
      success: true, 
      sessions: mockSessions 
    });
    
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}