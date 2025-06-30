
// app/api/notifications/clear-all/route.ts
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

// DELETE /api/notifications/clear-all - Clear all notifications
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing all notifications:', error);
      return NextResponse.json({ error: 'Failed to clear all notifications' }, { status: 500 });
    }

    // Send WebSocket notification
    await sendWebSocketNotification(userId, {
      type: 'notifications_cleared'
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}