// app/api/notifications/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server'

interface WebSocketNotificationData {
  type: string;
  notificationId?: string;
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

// DELETE /api/notifications/[id] - Delete specific notification
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await the params Promise
    const params = await context.params;

    // First check if notification belongs to user
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting notification:', error);
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
    }

    // Send WebSocket notification
    await sendWebSocketNotification(userId, {
      type: 'notification_removed',
      notificationId: params.id
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}