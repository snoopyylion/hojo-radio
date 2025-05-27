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

interface OAuthAccountData {
  firstName?: string;
  lastName?: string;
  given_name?: string;
  family_name?: string;
  provider?: string;
  [key: string]: unknown;
}

// Helper function to generate username from name/email
async function generateUsername(firstName: string, lastName: string, email: string): Promise<string> {
  // Try different username formats
  const baseOptions = [
    `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
    email.split('@')[0].toLowerCase(),
  ].filter(option => option.length >= 3);

  for (const base of baseOptions) {
    // Check if base username is available
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', base)
      .single();

    if (!existing) {
      return base;
    }

    // Try with numbers appended
    for (let i = 1; i <= 99; i++) {
      const candidate = `${base}${i}`;
      const { data: existingNumbered } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('username', candidate)
        .single();

      if (!existingNumbered) {
        return candidate;
      }
    }
  }

  // Fallback to email-based with timestamp
  return `${email.split('@')[0].toLowerCase()}${Date.now().toString().slice(-4)}`;
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
    let username = (publicMetadata as ClerkPublicMetadata)?.username ?? null;

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
      const oauthData = oauthAccount as unknown as OAuthAccountData;
      
      console.log('🔍 OAuth account:', {
        provider: oauthData.provider,
        hasFirstName: !!oauthData.firstName,
        hasLastName: !!oauthData.lastName,
        hasGivenName: !!oauthData.given_name,
        hasFamilyName: !!oauthData.family_name
      });
      
      resolvedFirstName = oauthData.firstName || 
                         oauthData.given_name || "";
      resolvedLastName = oauthData.lastName || 
                        oauthData.family_name || "";
      
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

    // Generate username if not provided (for OAuth users)
    if (!username && resolvedFirstName.trim() && resolvedLastName.trim()) {
      console.log('🔄 Generating username for OAuth user...');
      try {
        username = await generateUsername(resolvedFirstName.trim(), resolvedLastName.trim(), email);
        console.log('✅ Generated username:', username);
      } catch (error) {
        console.error('❌ Error generating username:', error);
        // Fallback to email-based username
        username = `${email.split('@')[0].toLowerCase()}${Date.now().toString().slice(-4)}`;
      }
    }

    // Determine if user needs to complete profile
    const needsProfileCompletion = 
      !resolvedFirstName.trim() || 
      !resolvedLastName.trim() || 
      !username;

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
      username: username?.toLowerCase() || null,
      profile_completed: !needsProfileCompletion,
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
      profileCompleted: data.profile_completed,
      username: data.username
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