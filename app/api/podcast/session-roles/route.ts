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
    interface UserProfile {
      first_name: string | null;
      last_name: string | null;
      username: string | null;
      avatar_url: string | null;
    }

    const { data: roles, error } = await supabase
      .from('session_roles')
      .select('*')
      .eq('session_id', sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const uniqueUserIds = Array.from(new Set((roles || []).map((role) => role.user_id))).filter(Boolean);
    let userProfiles: Record<string, UserProfile> = {};

    if (uniqueUserIds.length > 0) {
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, avatar_url')
        .in('id', uniqueUserIds);

      if (!userError && users) {
        userProfiles = users.reduce((acc, user) => {
          acc[user.id] = {
            first_name: user.first_name ?? null,
            last_name: user.last_name ?? null,
            username: user.username ?? null,
            avatar_url: user.avatar_url ?? null,
          };
          return acc;
        }, {} as Record<string, UserProfile>);
      }
    }

    const rolesWithProfiles = (roles || []).map((role) => ({
      ...role,
      profile: userProfiles[role.user_id] ?? null,
    }));

    // Group by role type
    const rolesByType = {
      host: rolesWithProfiles.filter(r => r.role === 'host'),
      guests: rolesWithProfiles.filter(r => r.role === 'guest'),
      listeners: rolesWithProfiles.filter(r => r.role === 'listener')
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