// app/api/podcast/guest-requests/route.ts - UPDATED
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define TypeScript interfaces
interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface GuestRequest {
  id: string;
  session_id: string;
  user_id: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  profile?: UserProfile | null;
}

interface GuestRequestResponse {
  id: string;
  session_id: string;
  user_id: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  responded_at?: string;
  responded_by?: string;
}

interface WebSocketRequest {
  type: string;
  request: GuestRequestResponse;
  timestamp: number;
}

// Function to notify WebSocket server about new guest request
async function notifyWebSocketServer(sessionId: string, request: GuestRequestResponse) {
  try {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001';
    
    // Connect to WebSocket server
    const ws = new WebSocket(`${wsUrl}/podcast/${sessionId}?role=api&userId=system`);
    
    return new Promise<boolean>((resolve, reject) => {
      ws.onopen = () => {
        const message: WebSocketRequest = {
          type: 'new_guest_request',
          request: request,
          timestamp: Date.now()
        };
        ws.send(JSON.stringify(message));
        ws.close();
        resolve(true);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket notification failed:', error);
        reject(error);
      };
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (ws.readyState !== WebSocket.CLOSED) {
          ws.close();
        }
        resolve(false); // Don't reject on timeout
      }, 5000);
    });
  } catch (error) {
    console.error('Failed to notify WebSocket:', error);
    return false;
  }
}

interface PostRequestBody {
  sessionId: string;
  message?: string;
  userId: string;
}

interface PutRequestBody {
  requestId: string;
  status: 'pending' | 'approved' | 'rejected';
  respondedBy?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PostRequestBody = await request.json();
    const { sessionId, message = 'I would like to speak in this session', userId } = body;

    if (!sessionId || !userId) {
      return NextResponse.json({ error: 'Session ID and User ID required' }, { status: 400 });
    }

    // First, fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, first_name, last_name, username, avatar_url')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Failed to fetch user profile:', profileError);
    }

    // Create guest request
    const { data, error } = await supabase
      .from('guest_requests')
      .insert({
        session_id: sessionId,
        user_id: userId,
        message: message,
        status: 'pending',
        requested_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create guest request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich request with profile data
    const enrichedRequest: GuestRequest = {
      ...data,
      profile: userProfile || null
    };

    // Notify WebSocket server (fire and forget)
    notifyWebSocketServer(sessionId, enrichedRequest).catch(console.error);

    return NextResponse.json({ 
      success: true, 
      request: enrichedRequest,
      message: 'Request sent to host successfully'
    });
  } catch (error) {
    console.error('Guest request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  try {
    // Get all pending guest requests for this session
    const { data: requests, error } = await supabase
      .from('guest_requests')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = Array.from(new Set((requests || []).map(request => request.user_id))).filter(Boolean);
    let userProfiles: Record<string, UserProfile> = {};

    if (userIds.length > 0) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, avatar_url')
        .in('id', userIds);

      if (!userError && userData) {
        userProfiles = userData.reduce((acc, user) => {
          acc[user.id] = {
            id: user.id,
            first_name: user.first_name ?? null,
            last_name: user.last_name ?? null,
            username: user.username ?? null,
            avatar_url: user.avatar_url ?? null,
          };
          return acc;
        }, {} as Record<string, UserProfile>);
      }
    }

    const enrichedRequests: GuestRequest[] = (requests || []).map(request => ({
      ...request,
      profile: userProfiles[request.user_id] ?? null,
    }));

    return NextResponse.json({ requests: enrichedRequests });
  } catch (error) {
    console.error('Get guest requests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: PutRequestBody = await request.json();
    const { requestId, status, respondedBy } = body;

    if (!requestId || !status) {
      return NextResponse.json({ error: 'Request ID and status required' }, { status: 400 });
    }

    // Update the guest request status
    const { data, error } = await supabase
      .from('guest_requests')
      .update({ 
        status: status,
        responded_at: new Date().toISOString(),
        responded_by: respondedBy
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update guest request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      request: data 
    });
  } catch (error) {
    console.error('Update guest request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}