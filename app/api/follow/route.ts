import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notificationService } from '@/lib/notificationService';
import { auth } from '@clerk/nextjs/server';
import WebSocket from 'ws';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// WebSocket client for sending notifications
let wsClient: WebSocket | null = null;

// Initialize WebSocket client connection to your WebSocket server
function initializeWSClient() {
    if (!process.env.WS_SERVER_URL) {
        console.warn('WS_SERVER_URL not configured for follow notifications');
        return;
    }

    try {
        wsClient = new WebSocket(process.env.WS_SERVER_URL);

        wsClient.onopen = () => {
            console.log('✅ Follow API WebSocket client connected');
        };

        wsClient.onclose = () => {
            console.log('❌ Follow API WebSocket client disconnected');
            wsClient = null;
            // Attempt reconnection after 5 seconds
            setTimeout(initializeWSClient, 5000);
        };

        wsClient.onerror = (error) => {
            console.error('Follow API WebSocket error:', error);
        };
    } catch (error) {
        console.error('Failed to initialize WebSocket client:', error);
    }
}

// Initialize WebSocket client on module load
initializeWSClient();

// Function to send follow notification via WebSocket
function sendFollowNotification(followerId: string, followedId: string, action: 'follow' | 'unfollow', followerName: string) {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket client not available for follow notification');
        return;
    }

    try {
        const notification = {
            type: 'follow',
            followerId: followerId,
            followedId: followedId,
            followerName: followerName,
            action: action,
            timestamp: Date.now()
        };

        wsClient.send(JSON.stringify(notification));
        console.log('📤 Sent follow notification:', notification);
    } catch (error) {
        console.error('Error sending follow notification:', error);
    }
}

export async function POST(request: NextRequest) {
    try {
        // Get the authenticated user
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { action, following_id } = await request.json();

        if (!following_id || typeof following_id !== 'string') {
            return NextResponse.json(
                { error: 'Invalid user ID provided' },
                { status: 400 }
            );
        }

        console.log('📝 Processing follow request:', {
            action,
            follower_id: userId,
            following_id: following_id
        });

        if (!action || !following_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (userId === following_id) {
            return NextResponse.json(
                { error: 'Cannot follow yourself' },
                { status: 400 }
            );
        }

        // Clean the user IDs to ensure they match what's in the database
        const followerId = userId;
        const followingId = following_id;

        console.log('🔍 Follow operation:', {
            action,
            followerId,
            followingId
        });

        // Verify both users exist in the database
        const { data: followerExists } = await supabase
            .from('users')
            .select('id')
            .eq('id', followerId)
            .single();

        const { data: followingExists } = await supabase
            .from('users')
            .select('id')
            .eq('id', followingId)
            .single();

        if (!followerExists) {
            console.error('❌ Follower not found:', followerId);
            return NextResponse.json(
                { error: 'Follower user not found' },
                { status: 404 }
            );
        }

        if (!followingExists) {
            console.error('❌ Following user not found:', followingId);
            return NextResponse.json(
                { error: 'User to follow not found' },
                { status: 404 }
            );
        }

        if (action === 'follow') {
            // Check if already following
            const { data: existingFollow } = await supabase
                .from('follows')
                .select('id')
                .eq('follower_id', followerId)
                .eq('following_id', followingId)
                .single();

            if (existingFollow) {
                return NextResponse.json(
                    { error: 'Already following this user' },
                    { status: 400 }
                );
            }

            // Create follow relationship
            const { error } = await supabase
                .from('follows')
                .insert({
                    follower_id: followerId,
                    following_id: followingId,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error('Error creating follow:', error);
                return NextResponse.json(
                    { error: 'Failed to follow user' },
                    { status: 500 }
                );
            }

            // Fetch the follower's profile to get their name
            const { data: followerProfile } = await supabase
                .from('users')
                .select('username, first_name')
                .eq('id', followerId)
                .single();

            // Send WebSocket notification for new follow
            const followerName = followerProfile?.username || followerProfile?.first_name || 'Someone';
            sendFollowNotification(followerId, followingId, 'follow', followerName);
            
            // Also create notification in database
            await notificationService.createFollowNotification(followerId, followingId, followerName);

            return NextResponse.json({
                success: true,
                message: 'Successfully followed user',
                action: 'followed'
            });

        } else if (action === 'unfollow') {
            // Remove follow relationship
            const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', followerId)
                .eq('following_id', followingId);

            if (error) {
                console.error('Error removing follow:', error);
                return NextResponse.json(
                    { error: 'Failed to unfollow user' },
                    { status: 500 }
                );
            }

            // No notification for unfollow - only follow notifications
            return NextResponse.json({
                success: true,
                message: 'Successfully unfollowed user',
                action: 'unfollowed'
            });

        } else {
            return NextResponse.json(
                { error: 'Invalid action. Use "follow" or "unfollow"' },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('Follow API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Checking auth...');
        const { userId } = await auth();
        console.log('👤 User ID:', userId);

        if (!userId) {
            console.log('❌ No userId found in auth');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'followers' or 'following'
        const targetUserId = searchParams.get('userId') || userId;

        if (!type || !['followers', 'following'].includes(type)) {
            return NextResponse.json(
                { error: 'Invalid type. Use "followers" or "following"' },
                { status: 400 }
            );
        }

        let query;
        if (type === 'followers') {
            // Get users who follow the target user
            query = supabase
                .from('follows')
                .select(`
          follower_id,
          created_at,
          follower:users!follows_follower_id_fkey(
            id,
            first_name,
            last_name,
            image_url,
            role
          )
        `)
                .eq('following_id', targetUserId);
        } else {
            // Get users the target user is following
            query = supabase
                .from('follows')
                .select(`
          following_id,
          created_at,
          following:users!follows_following_id_fkey(
            id,
            first_name,
            last_name,
            image_url,
            role
          )
        `)
                .eq('follower_id', targetUserId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching follows:', error);
            return NextResponse.json(
                { error: 'Failed to fetch follows' },
                { status: 500 }
            );
        }

        // Format the response
        const formattedData = data?.map(item => {
            if ('follower' in item) {
                // This is a follower item
                return {
                    id: item.follower_id,
                    ...item.follower,
                    followed_at: item.created_at
                };
            } else {
                // This is a following item
                return {
                    id: item.following_id,
                    ...item.following,
                    followed_at: item.created_at
                };
            }
        }) || [];

        return NextResponse.json({
            type,
            users: formattedData,
            count: formattedData.length
        });

    } catch (error) {
        console.error('Follow GET API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}