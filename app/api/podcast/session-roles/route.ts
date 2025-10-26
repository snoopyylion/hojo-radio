import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  try {
    const { data: roles, error } = await supabase
      .from('session_roles')
      .select('*')
      .eq('session_id', sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by role type
    const rolesByType = {
      host: roles?.filter(r => r.role === 'host') || [],
      guests: roles?.filter(r => r.role === 'guest') || [],
      listeners: roles?.filter(r => r.role === 'listener') || []
    };

    return NextResponse.json({ roles: rolesByType });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, targetUserId, newRole } = body;

    if (!sessionId || !targetUserId || !newRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update the role
    const { data, error } = await supabase
      .from('session_roles')
      .update({ 
        role: newRole,
        promoted_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .eq('user_id', targetUserId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, role: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, targetUserId } = body;

    if (!sessionId || !targetUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabase
      .from('session_roles')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}