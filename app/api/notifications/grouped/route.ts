// app/api/notifications/grouped/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { BaseNotification, NotificationGroup } from '@/types/notifications';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/notifications/grouped - Fetch grouped notifications
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId') || userId;
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const category = url.searchParams.get('category');
    const type = url.searchParams.get('type');

    // Fetch notifications
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Group notifications
    const groupedNotifications = groupNotifications(notifications || []);

    return NextResponse.json(groupedNotifications);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function groupNotifications(notifications: BaseNotification[]): NotificationGroup[] {
  const groups = new Map<string, BaseNotification[]>();

  notifications.forEach(notification => {
    const groupKey = getGroupKey(notification);
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(notification);
  });

  return Array.from(groups.entries()).map(([groupKey, groupNotifications]) => {
    const sortedNotifications = groupNotifications.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const latestNotification = sortedNotifications[0];
    const unreadCount = sortedNotifications.filter(n => !n.read).length;

    return {
      id: groupKey,
      user_id: latestNotification.user_id,
      type: latestNotification.type,
      category: latestNotification.category || 'system',
      notifications: sortedNotifications,
      unread_count: unreadCount,
      latest_notification: latestNotification,
      created_at: latestNotification.created_at,
      updated_at: latestNotification.created_at
    };
  }).sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

function getGroupKey(notification: BaseNotification): string {
  if (notification.type === 'message') {
    return `message_${notification.data?.conversation_id || 'unknown'}`;
  }
  if (notification.type === 'like' || notification.type === 'comment') {
    return `${notification.type}_${notification.data?.target_id || 'unknown'}`;
  }
  if (notification.type === 'follow') {
    return `follow_${notification.data?.actor_id || 'unknown'}`;
  }
  if (notification.type === 'login') {
    return `login_${notification.data?.device_info || 'unknown'}`;
  }
  if (notification.type === 'achievement') {
    return `achievement_${notification.data?.achievement_type || 'unknown'}`;
  }
  return notification.type;
} 