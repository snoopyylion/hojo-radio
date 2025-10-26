// app/api/podcast/guest-requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, message = 'I would like to speak in this session' } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // For now, we'll assume the user ID is passed in the request body
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Create a guest request in the database
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

    return NextResponse.json({ 
      success: true, 
      request: data,
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

    return NextResponse.json({ requests: requests || [] });
  } catch (error) {
    console.error('Get guest requests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add this to your existing route.ts file
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
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