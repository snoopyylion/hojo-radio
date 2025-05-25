// app/api/check-profile/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Checking profile for user:', userId);

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('profile_completed, first_name, last_name, username, email, image_url')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      
      // If user doesn't exist yet, they definitely need to complete profile
      if (error.code === 'PGRST116') { // Row not found
        console.log('User not found in database, needs profile completion');
        return NextResponse.json({ 
          needsCompletion: true,
          reason: 'user_not_found'
        });
      }
      
      // For other errors, assume they need profile completion to be safe
      return NextResponse.json({ 
        needsCompletion: true,
        reason: 'database_error'
      });
    }

    // Check all required fields
    const missingFields = [];
    
    if (!user.first_name?.trim()) missingFields.push('first_name');
    if (!user.last_name?.trim()) missingFields.push('last_name');
    if (!user.username?.trim()) missingFields.push('username');

    const needsCompletion = !user.profile_completed || missingFields.length > 0;

    console.log('Profile check result:', {
      profile_completed: user.profile_completed,
      missingFields,
      needsCompletion
    });

    return NextResponse.json({ 
      needsCompletion,
      userData: user,
      missingFields: needsCompletion ? missingFields : []
    });

  } catch (error) {
    console.error('Profile check error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        needsCompletion: true,
        reason: 'server_error'
      }, 
      { status: 500 }
    );
  }
}