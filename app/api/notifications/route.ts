// app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define notification types
interface NotificationData {
  type: string;
  notification?: unknown;
  [key: string]: unknown;
}

interface NotificationPayload {
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read?: boolean;
  created_at?: string;
  updated_at?: string;
}

// WebSocket notification sender (implement your WebSocket server)
async function sendWebSocketNotification(userId: string, data: NotificationData): Promise<void> {
  // This is where you'd send to your WebSocket server
  // For now, we'll just log it
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

// GET /api/notifications - Fetch user notifications
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const type = url.searchParams.get('type');

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
      hasMore: (notifications?.length || 0) === limit
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notifications - Create new notification
export async function POST(request: NextRequest) {

  // Add this at the top of the POST function, before the auth check:
  const isServerCall = request.headers.get('x-server-call') === 'true';

  let userId: string | undefined;

  if (!isServerCall) {
    const authResult = await auth();
    userId = authResult.userId ?? undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // If not a server call, userId is set above. If server call, get user_id from the request body.
    const notification: NotificationPayload = await request.json();

    // For server calls, use notification.user_id
    if (isServerCall) {
      userId = notification.user_id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate required fields
    if (!notification.user_id || !notification.type || !notification.title || !notification.message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate notification type
    const validTypes = [
      'message', 'typing', 'follow', 'like', 'comment',
      'post_published', 'mention', 'application_approved', 'application_rejected'
    ];

    if (!validTypes.includes(notification.type)) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    // Add timestamps
    const notificationData: NotificationPayload = {
      ...notification,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      read: false
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    // Send WebSocket notification to user
    await sendWebSocketNotification(notification.user_id, {
      type: 'new_notification',
      notification: data
    });

    return NextResponse.json({ notification: data });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}