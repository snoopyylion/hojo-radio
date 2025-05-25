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

// We'll use the actual Clerk ExternalAccount type and handle it properly

export async function POST() {
  try {
    const { userId } = await auth();
     
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get full user data from Clerk
    const clerkUser = await currentUser();
     
    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('🔄 Syncing user to database:', clerkUser.id);

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
    } else if (externalAccounts && externalAccounts.length > 0) {
      // From OAuth provider
      const oauthAccount = externalAccounts[0];
      // Safely access potential OAuth fields
      const oauthData = oauthAccount as unknown as Record<string, unknown>;
      resolvedFirstName = (oauthData.firstName as string) || 
                         (oauthData.given_name as string) || "";
      resolvedLastName = (oauthData.lastName as string) || 
                        (oauthData.family_name as string) || "";
             
      console.log(`🔍 OAuth account data:`, oauthAccount);
    } else if ((unsafeMetadata as ClerkUnsafeMetadata)?.firstName && (unsafeMetadata as ClerkUnsafeMetadata)?.lastName) {
      // From form submission
      const metadata = unsafeMetadata as ClerkUnsafeMetadata;
      resolvedFirstName = metadata.firstName || "";
      resolvedLastName = metadata.lastName || "";
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
    }

    console.log(`📝 Resolved names: ${resolvedFirstName} ${resolvedLastName}`);

    if (!email) {
      console.warn("⚠️ Missing email for user:", id);
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Determine if user needs to complete profile
    const needsProfileCompletion = !resolvedFirstName.trim() || !resolvedLastName.trim() || !username;

    console.log(`🎯 Profile completion needed: ${needsProfileCompletion}`);

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

    console.log(`💾 Upserting user data:`, userData);

    const { error } = await supabaseAdmin
      .from("users")
      .upsert([userData], { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error("❌ Supabase upsert error:", error);
      return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
    }

    console.log(`✅ User synced successfully`);

    return NextResponse.json({
      message: '✅ User synced to database',
      needsProfileCompletion,
      userData: { ...userData, password: undefined }
    });

  } catch (error) {
    console.error('Sync user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}