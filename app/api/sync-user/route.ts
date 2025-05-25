// app/api/sync-user/route.ts
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface ClerkPublicMetadata {
  username?: string;
  [key: string]: unknown;
}

interface ClerkUnsafeMetadata {
  firstName?: string;
  lastName?: string;
  [key: string]: unknown;
}

export async function POST() {
  try {
    console.log('🔄 Sync user API called');
    
    // Get auth from Clerk
    const { userId } = await auth();
    
    console.log('🔍 Sync user API - UserId:', userId || 'none');
    
    if (!userId) {
      console.log('❌ No userId found in sync-user API');
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Get full user data from Clerk
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      console.log('❌ No Clerk user found for userId:', userId);
      return NextResponse.json(
        { error: 'User not found in Clerk' }, 
        { status: 404 }
      );
    }

    console.log('👤 Clerk user data received:', {
      id: clerkUser.id,
      emailCount: clerkUser.emailAddresses?.length || 0,
      hasImage: !!clerkUser.imageUrl,
      firstName: clerkUser.firstName || 'none',
      lastName: clerkUser.lastName || 'none',
      externalAccountsCount: clerkUser.externalAccounts?.length || 0
    });

    const {
      id,
      emailAddresses,
      imageUrl,
      firstName,
      lastName,
      externalAccounts,
      unsafeMetadata,
      publicMetadata,
    } = clerkUser;

    const email = emailAddresses?.[0]?.emailAddress ?? null;
    const imageUrl_processed = imageUrl ?? null;
    const username = (publicMetadata as ClerkPublicMetadata)?.username ?? null;

    // Enhanced name resolution for OAuth providers
    let resolvedFirstName = "";
    let resolvedLastName = "";

    if (firstName && lastName) {
      // Direct from Clerk (most reliable)
      resolvedFirstName = firstName;
      resolvedLastName = lastName;
      console.log('✅ Names from Clerk direct fields');
    } else if (externalAccounts && externalAccounts.length > 0) {
      // From OAuth provider
      const oauthAccount = externalAccounts[0];
      console.log('🔍 OAuth account:', {
        provider: oauthAccount.provider,
        // Log available fields without sensitive data
        hasFirstName: !!(oauthAccount as any).firstName,
        hasLastName: !!(oauthAccount as any).lastName,
        hasGivenName: !!(oauthAccount as any).given_name,
        hasFamilyName: !!(oauthAccount as any).family_name
      });
      
      const oauthData = oauthAccount as unknown as Record<string, unknown>;
      resolvedFirstName = (oauthData.firstName as string) || 
                         (oauthData.given_name as string) || "";
      resolvedLastName = (oauthData.lastName as string) || 
                        (oauthData.family_name as string) || "";
      
      console.log('✅ Names from OAuth account');
    } else if ((unsafeMetadata as ClerkUnsafeMetadata)?.firstName && (unsafeMetadata as ClerkUnsafeMetadata)?.lastName) {
      // From form submission
      const metadata = unsafeMetadata as ClerkUnsafeMetadata;
      resolvedFirstName = metadata.firstName || "";
      resolvedLastName = metadata.lastName || "";
      console.log('✅ Names from unsafe metadata');
    }

    // If we still don't have names, try to extract from email
    if (!resolvedFirstName && !resolvedLastName && email) {
      const emailName = email.split('@')[0];
      if (emailName.includes('.')) {
        const parts = emailName.split('.');
        resolvedFirstName = parts[0];
        resolvedLastName = parts[1] || "";
      } else {
        resolvedFirstName = emailName;
      }
      console.log('✅ Names extracted from email');
    }

    console.log('📝 Final resolved names:', {
      firstName: resolvedFirstName || 'empty',
      lastName: resolvedLastName || 'empty',
      email: email || 'empty'
    });

    if (!email) {
      console.warn("⚠️ Missing email for user:", id);
      return NextResponse.json(
        { error: 'Email required' }, 
        { status: 400 }
      );
    }

    // Determine if user needs to complete profile
    const needsProfileCompletion = !resolvedFirstName.trim() || !resolvedLastName.trim() || !username;

    console.log('🎯 Profile completion analysis:', {
      hasFirstName: !!resolvedFirstName.trim(),
      hasLastName: !!resolvedLastName.trim(),
      hasUsername: !!username,
      needsCompletion: needsProfileCompletion
    });

    const userData = {
      id,
      email,
      first_name: resolvedFirstName.trim() || null,
      last_name: resolvedLastName.trim() || null,
      image_url: imageUrl_processed,
      role: "user",
      username,
      profile_completed: !needsProfileCompletion,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('💾 Attempting to upsert user data:', {
      id: userData.id,
      email: userData.email,
      hasFirstName: !!userData.first_name,
      hasLastName: !!userData.last_name,
      hasImageUrl: !!userData.image_url,
      hasUsername: !!userData.username,
      profileCompleted: userData.profile_completed
    });

    const { error, data } = await supabaseAdmin
      .from("users")
      .upsert([userData], { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase upsert error:", error);
      return NextResponse.json(
        { error: "Failed to sync user to database" }, 
        { status: 500 }
      );
    }

    console.log('✅ User synced successfully to database:', {
      id: data.id,
      email: data.email,
      profileCompleted: data.profile_completed
    });

    return NextResponse.json({
      message: '✅ User synced to database',
      needsProfileCompletion,
      userData: data
    });

  } catch (error) {
    console.error('❌ Sync user API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}