
// app/api/notifications/clear-all/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server'

interface WebSocketNotificationData {
  type: string;
  [key: string]: unknown;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// WebSocket notification sender
async function sendWebSocketNotification(userId: string, data: WebSocketNotificationData) {
  console.log(`Sending WebSocket notification to ${userId}:`, data);
  
  // Example implementation with your WebSocket server:
  /*
  try {
    const response = await fetch(`${process.env.WEBSOCKET_SERVER_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...data })
    });
  } catch (error) {
    console.error('Error sending WebSocket notification:', error);
  }
  */
}

// DELETE /api/notifications/clear-all - Clear all notifications or all messages for a conversation
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse conversationId from query
    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId');

    let query = supabase.from('notifications').delete().eq('user_id', userId);
    if (conversationId) {
      query = query.eq('type', 'message').eq('data->>conversation_id', conversationId);
    }

    const { error } = await query;
    if (error) {
      console.error('Error clearing notifications:', error);
      return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 });
    }

    // Send WebSocket notification
    await sendWebSocketNotification(userId, {
      type: conversationId ? 'conversation_notifications_cleared' : 'notifications_cleared',
      conversationId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}