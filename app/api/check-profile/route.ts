// app/api/check-profile/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // Get auth from Clerk
    const { userId } = await auth();
    
    console.log('🔍 Check profile API - UserId:', userId || 'none');
    
    if (!userId) {
      console.log('❌ No userId found in check-profile API');
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Check user in database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, username, profile_completed, image_url')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found - needs to be created
        console.log('📝 User not found in database:', userId);
        return NextResponse.json({
          needsCompletion: true,
          reason: 'user_not_found',
          userData: null,
          missingFields: ['first_name', 'last_name', 'username']
        });
      }
      
      console.error('❌ Database error in check-profile:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    // Check what fields are missing
    const missingFields = [];
    if (!user.first_name?.trim()) missingFields.push('first_name');
    if (!user.last_name?.trim()) missingFields.push('last_name');
    if (!user.username?.trim()) missingFields.push('username');

    const needsCompletion = !user.profile_completed || missingFields.length > 0;

    console.log('📊 Profile check result:', {
      userId,
      needsCompletion,
      missingFields,
      profileCompleted: user.profile_completed
    });

    return NextResponse.json({
      needsCompletion,
      userData: user,
      missingFields,
      reason: needsCompletion ? 'incomplete_profile' : 'profile_complete'
    });

  } catch (error) {
    console.error('❌ Check profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}