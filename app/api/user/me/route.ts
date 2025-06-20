// app/api/user/me/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { userId } = await auth();

    console.log('👤 /api/user/me - UserId:', userId || 'none');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, username, profile_completed, image_url, role, created_at') // ← added created_at here
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('❌ Error fetching user in /api/user/me:', error);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('❌ /api/user/me - Internal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
