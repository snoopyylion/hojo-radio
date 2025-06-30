
// app/api/notifications/mark-all-read/route.ts
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

// PATCH /api/notifications/mark-all-read - Mark all notifications as read
export async function PATCH(request: NextRequest) {
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
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return NextResponse.json({ error: 'Failed to mark all notifications as read' }, { status: 500 });
    }

    // Get updated unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    return NextResponse.json({
      success: true,
      unreadCount: unreadCount || 0
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}