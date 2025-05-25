// app/api/check-username/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { username } = await req.json();
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }
    
    // Check if username is already taken
    const { data: existingUser, error } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is what we want
      console.error('Error checking username:', error);
      return NextResponse.json(
        { error: 'Failed to check username' },
        { status: 500 }
      );
    }
    
    const available = !existingUser;
    
    return NextResponse.json({
      available,
      username: username.toLowerCase()
    });
    
  } catch (error) {
    console.error('Check username error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}