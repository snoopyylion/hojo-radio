// app/api/user/update-profile/route.ts
import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'NO_USER_ID' }, 
        { status: 401 }
      );
    }

    const { firstName, lastName, username, bio, location } = await req.json();
    
    // Validate input
    if (!firstName || !lastName || !username) {
      return NextResponse.json(
        { error: 'First name, last name, and username are required' },
        { status: 400 }
      );
    }

    // Check if username is already taken by another user
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, username')
      .eq('username', username.toLowerCase())
      .neq('id', userId)
      .maybeSingle();
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    // Update the user profile while preserving the role and author status
    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.toLowerCase(),
        bio: bio || null,
        location: location || null,
        profile_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedUser
    });

  } catch (error) {
    console.error('Error in update profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}