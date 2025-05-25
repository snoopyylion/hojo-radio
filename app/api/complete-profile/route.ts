// app/api/complete-profile/route.ts
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
    
    const { username, firstName, lastName } = await req.json();
    
    // Validate input
    if (!username || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }
    
    // Check if username is already taken (double-check)
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }
    
    // Upsert user data (removed updated_at field)
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        username: username.toLowerCase(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        profile_completed: true
      }, {
        onConflict: 'id'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error completing profile:', error);
      return NextResponse.json(
        { error: 'Failed to save profile' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      user: data
    });
    
  } catch (error) {
    console.error('Complete profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}