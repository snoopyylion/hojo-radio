// app/api/user-activity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { UserActivity, ActivityType, ActivityCategory } from '@/types/notifications';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/user-activity - Fetch user activity feed
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId') || userId;
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const category = url.searchParams.get('category');
    const type = url.searchParams.get('type');
    const visibility = url.searchParams.get('visibility');

    let query = supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', targetUserId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (visibility) {
      query = query.eq('visibility', visibility);
    }

    const { data: activities, error } = await query;

    if (error) {
      console.error('Error fetching user activities:', error);
      
      // Check if the error is due to table not existing
      if (error.message && error.message.includes('relation "user_activities" does not exist')) {
        console.log('User activities table does not exist, returning empty array');
        return NextResponse.json({
          activities: [],
          hasMore: false,
          message: 'User activities table not set up yet'
        });
      }
      
      return NextResponse.json({ error: 'Failed to fetch user activities' }, { status: 500 });
    }

    return NextResponse.json({
      activities: activities || [],
      hasMore: (activities?.length || 0) === limit
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/user-activity - Create new user activity
export async function POST(request: NextRequest) {
  try {
    // Check if this is a server call
    const isServerCall = request.headers.get('x-server-call') === 'true';
    
    let userId: string | undefined;

    if (!isServerCall) {
      const authResult = await auth();
      userId = authResult.userId ?? undefined;
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const activity: Omit<UserActivity, 'id' | 'timestamp'> = await request.json();

    // For server calls, use activity.user_id
    if (isServerCall) {
      userId = activity.user_id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate required fields
    if (!activity.user_id || !activity.type || !activity.title || !activity.description || !activity.category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate activity type
    const validTypes: ActivityType[] = [
      'post_created', 'post_liked', 'post_commented', 'post_shared', 'post_bookmarked',
      'user_followed', 'user_unfollowed', 'comment_liked', 'comment_replied',
      'message_sent', 'message_received',
      'profile_updated', 'login', 'achievement_earned', 'milestone_reached',
      'verification_submitted', 'verification_approved'
    ];

    if (!validTypes.includes(activity.type)) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
    }

    // Validate category
    const validCategories: ActivityCategory[] = ['content', 'social', 'achievement', 'system'];
    if (!validCategories.includes(activity.category)) {
      return NextResponse.json({ error: 'Invalid activity category' }, { status: 400 });
    }

    // Add timestamp
    const activityData: UserActivity = {
      ...activity,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_activities')
      .insert([activityData])
      .select()
      .single();

    if (error) {
      console.error('Error creating user activity:', error);
      return NextResponse.json({ error: 'Failed to create user activity' }, { status: 500 });
    }

    return NextResponse.json({ activity: data });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/user-activity - Delete user activities
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activity_ids } = await request.json();

    if (!activity_ids || !Array.isArray(activity_ids)) {
      return NextResponse.json({ error: 'Invalid activity IDs' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_activities')
      .delete()
      .eq('user_id', userId)
      .in('id', activity_ids);

    if (error) {
      console.error('Error deleting user activities:', error);
      return NextResponse.json({ error: 'Failed to delete user activities' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 