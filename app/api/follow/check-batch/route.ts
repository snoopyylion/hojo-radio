// app/api/follow/check-batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

type FollowRecord = {
    follower_id?: string;
    following_id?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { user_ids, check_type } = await request.json();

        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            return NextResponse.json(
                { error: 'Invalid user_ids array' },
                { status: 400 }
            );
        }

        if (!check_type || !['am_following', 'is_following_me'].includes(check_type)) {
            return NextResponse.json(
                { error: 'Invalid check_type. Use "am_following" or "is_following_me"' },
                { status: 400 }
            );
        }

        let query;
        let targetField: string;

        if (check_type === 'am_following') {
            // Check if current user is following the specified users
            query = supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', userId)
                .in('following_id', user_ids);
            targetField = 'following_id';
        } else {
            // Check if specified users are following the current user
            query = supabase
                .from('follows')
                .select('follower_id')
                .eq('following_id', userId)
                .in('follower_id', user_ids);
            targetField = 'follower_id';
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error checking follow statuses:', error);
            return NextResponse.json(
                { error: 'Failed to check follow statuses' },
                { status: 500 }
            );
        }

        // Create a map of user_id -> boolean indicating follow status
        const followStatuses: Record<string, boolean> = {};

        // Initialize all users as not following
        user_ids.forEach(id => {
            followStatuses[id] = false;
        });

        // Mark users that are actually following as true
        data?.forEach((follow: FollowRecord) => {
            const targetId = follow[targetField as keyof FollowRecord];
            if (typeof targetId === 'string') {
                followStatuses[targetId] = true;
            }
        });


        return NextResponse.json({
            success: true,
            statuses: followStatuses,
            check_type
        });

    } catch (error) {
        console.error('Batch follow check API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}