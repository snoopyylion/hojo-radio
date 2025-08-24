// app/api/podcasts/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// For real-time chat during live streams
// In production, you'd use WebSockets or Supabase Realtime

type ChatMessage = {
  id: string;
  sessionId: string;
  message: string;
  userId: string;
  username: string;
  timestamp: string;
};

const chatMessages: ChatMessage[] = [];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  
  // Filter messages by session
  const sessionMessages = chatMessages.filter(msg => msg.sessionId === sessionId);
  
  return NextResponse.json({ 
    success: true, 
    messages: sessionMessages 
  });
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
    
    const newMessage = {
      id: `msg_${Date.now()}`,
      sessionId,
      message,
      userId, // Clerk user ID as text
      username,
      timestamp: new Date().toISOString()
    };
    
    chatMessages.push(newMessage);
    
    // In production: store in Supabase and broadcast via Realtime
    // await supabase.from('chat_messages').insert([newMessage]);
    
    return NextResponse.json({ 
      success: true, 
      message: newMessage 
    });
    
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}