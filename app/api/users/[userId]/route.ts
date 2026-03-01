// app/api/users/[userId]/route.ts
//
// Returns a single user's profile from Supabase including is_admin.
// Used by the Settings page to determine role, author_request status, and admin flag.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// ✅ CORRECT Next.js 15+ App Router signature with Promise params
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: requestingUserId } = await auth();

    if (!requestingUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Await the params Promise (Next.js 15+ requirement)
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select(
        'id, email, role, author_request, first_name, last_name, username, image_url, is_admin'
      )
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Error fetching user:', error);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user information' },
      { status: 500 }
    );
  }
}