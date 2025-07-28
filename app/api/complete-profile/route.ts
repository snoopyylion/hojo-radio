// app/api/complete-profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
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

    // Check if username is already taken by another user
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, username')
      .eq('username', username.toLowerCase())
      .maybeSingle();
    
    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    // First, try to update the existing user record
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        username: username.toLowerCase(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        profile_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    // If update was successful, return the result
    if (!updateError) {
      console.log('✅ User profile updated successfully:', updatedUser.id);
      return NextResponse.json({
        success: true,
        user: updatedUser
      });
    }

    // If user doesn't exist (PGRST116), create them
    if (updateError.code === 'PGRST116') {
      console.log('👤 User not found in database, creating new record for:', userId);
      
      // Get user info from Clerk to create complete record with retry logic
      let clerkUser = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!clerkUser && retryCount < maxRetries) {
        try {
          clerkUser = await currentUser();
          
          if (!clerkUser) {
            console.log(`⚠️ No Clerk user found on attempt ${retryCount + 1}/${maxRetries}, retrying...`);
            retryCount++;
            
            if (retryCount < maxRetries) {
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }
        } catch (error) {
          console.log(`⚠️ Error getting Clerk user on attempt ${retryCount + 1}/${maxRetries}:`, error);
          retryCount++;
          
          if (retryCount < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }
      
      if (!clerkUser) {
        console.log('❌ No Clerk user found after all retries for userId:', userId);
        return NextResponse.json(
          { 
            error: 'User session not ready. Please try again.', 
            code: 'CLERK_USER_NOT_FOUND',
            details: 'User session may still be initializing'
          }, 
          { status: 503 }
        );
      }

      const email = clerkUser.emailAddresses?.[0]?.emailAddress;
      if (!email) {
        return NextResponse.json(
          { error: 'Email is required but not found' },
          { status: 400 }
        );
      }

      // Create new user record
      const userData = {
        id: userId,
        email,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.toLowerCase(),
        image_url: clerkUser.imageUrl || null,
        role: 'user',
        profile_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create user record:', createError);
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        );
      }

      console.log('✅ New user record created successfully:', newUser.id);
      return NextResponse.json({
        success: true,
        user: newUser
      });
    }

    // Handle other database errors
    console.error('❌ Database error in complete-profile:', updateError);
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    );

  } catch (error) {
    console.error('❌ Complete profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}