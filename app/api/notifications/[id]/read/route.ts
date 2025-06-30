
// app/api/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// WebSocket notification sender
async function sendWebSocketNotification(userId: string, data: any) {
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

// PATCH /api/notifications/[id]/read - Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ 
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
    }

    // Send WebSocket notification
    await sendWebSocketNotification(userId, {
      type: 'notification_read',
      notificationId: params.id
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
