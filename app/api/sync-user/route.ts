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
  // Sanitize inputs to prevent issues
  const cleanFirstName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLastName = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanEmail = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

  // Try different username formats
  const baseOptions = [
    `${cleanFirstName}${cleanLastName}`,
    `${cleanFirstName}.${cleanLastName}`,
    `${cleanFirstName}_${cleanLastName}`,
    cleanEmail,
  ].filter(option => option.length >= 3 && option.length <= 30);

  console.log('🔤 Username generation options:', baseOptions);

  for (const base of baseOptions) {
    try {
      // Check if base username is available  
      const { data: existing, error: checkError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('username', base)
        .maybeSingle();

      if (checkError) {
        console.warn('⚠️ Error checking username availability:', checkError);
        continue;
      }

      if (!existing) {
        console.log('✅ Available username found:', base);
        return base;
      }

      // Try with numbers appended
      for (let i = 1; i <= 99; i++) {
        const candidate = `${base}${i}`;
        
        const { data: existingNumbered, error: numberedError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('username', candidate)
          .maybeSingle();

        if (numberedError) {
          console.warn('⚠️ Error checking numbered username:', numberedError);
          continue;
        }

        if (!existingNumbered) {
          console.log('✅ Available numbered username found:', candidate);
          return candidate;
        }
      }
    } catch (error) {
      console.warn('⚠️ Error in username generation loop:', error);
      continue;
    }
  }

  // Fallback to email-based with timestamp
  const fallback = `${cleanEmail}${Date.now().toString().slice(-4)}`;
  console.log('🔄 Using fallback username:', fallback);
  return fallback;
}

// Helper function to check if user exists in database
async function checkExistingUser(userId: string) {
  try {
    const { data: existingUser, error } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, username, profile_completed, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error checking existing user:', error);
      return { user: null, error };
    }

    return { user: existingUser, error: null };
  } catch (error) {
    console.error('❌ Exception checking existing user:', error);
    return { user: null, error };
  }
}

// Helper function to determine if profile needs completion
function determineProfileCompletion(userData: {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
  profile_completed?: boolean | null;
}): { needsCompletion: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  // Check required fields
  if (!userData.first_name || userData.first_name.trim() === '') {
    missingFields.push('first_name');
  }
  if (!userData.last_name || userData.last_name.trim() === '') {
    missingFields.push('last_name');
  }
  if (!userData.username || userData.username.trim() === '') {
    missingFields.push('username');
  }
  if (!userData.email || userData.email.trim() === '') {
    missingFields.push('email');
  }

  const needsCompletion = missingFields.length > 0 || !userData.profile_completed;
  
  console.log('📊 Profile completion check:', {
    needsCompletion,
    missingFields,
    profileCompleted: userData.profile_completed
  });

  return { needsCompletion, missingFields };
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
        { error: 'Unauthorized', code: 'NO_USER_ID' }, 
        { status: 401 }
      );
    }

    // Check if user already exists in database
    const { user: existingUser, error: checkError } = await checkExistingUser(userId);
    
    if (checkError) {
      console.error('❌ Failed to check existing user:', checkError);
      return NextResponse.json(
        { error: 'Database check failed', code: 'DB_CHECK_ERROR', details: checkError }, 
        { status: 500 }
      );
    }

    // Get full user data from Clerk
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      console.log('❌ No Clerk user found for userId:', userId);
      return NextResponse.json(
        { error: 'User not found in Clerk', code: 'CLERK_USER_NOT_FOUND' }, 
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
      const emailParts = email.split('@')[0].split(/[._-]/);
      if (emailParts.length >= 2) {
        resolvedFirstName = emailParts[0];
        resolvedLastName = emailParts[1];
        console.log('✅ Names extracted from email');
      }
    }

    // Validate we have minimum required data
    if (!email) {
      console.error('❌ No email found for user');
      return NextResponse.json(
        { error: 'No email address found', code: 'NO_EMAIL' }, 
        { status: 400 }
      );
    }

    console.log('📋 Resolved user data:', {
      id,
      email,
      firstName: resolvedFirstName || 'empty',
      lastName: resolvedLastName || 'empty',
      hasUsername: !!username,
      hasImage: !!imageUrl_processed
    });

    try {
      if (existingUser) {
        console.log('👤 Existing user found, updating...');
        
        // Prepare update data - only update fields that have values
        const updateData: {
          email: string;
          updated_at: string;
          first_name?: string;
          last_name?: string;
          username?: string;
          image_url?: string;
        } = {
          email,
          updated_at: new Date().toISOString(),
        };

        // Only update names if we have them and they're different
        if (resolvedFirstName && resolvedFirstName !== existingUser.first_name) {
          updateData.first_name = resolvedFirstName;
        }
        if (resolvedLastName && resolvedLastName !== existingUser.last_name) {
          updateData.last_name = resolvedLastName;
        }

        // Handle username - generate if missing
        if (!existingUser.username) {
          if (!username && resolvedFirstName && resolvedLastName) {
            username = await generateUsername(resolvedFirstName, resolvedLastName, email);
            console.log('🔤 Generated username for existing user:', username);
          }
          if (username) {
            updateData.username = username;
          }
        }

        // Add image if available and not set - FIXED: using image_url instead of avatar_url
        if (imageUrl_processed) {
          updateData.image_url = imageUrl_processed;
        }

        console.log('🔄 Updating existing user with:', Object.keys(updateData));

        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('users')
          .update(updateData)
          .eq('id', id)
          .select('*')
          .single();

        if (updateError) {
          console.error('❌ Failed to update existing user:', updateError);
          return NextResponse.json(
            { error: 'Failed to update user', code: 'UPDATE_ERROR', details: updateError }, 
            { status: 500 }
          );
        }

        console.log('✅ User updated successfully');

        // Check if profile completion is needed
        const profileCheck = determineProfileCompletion(updatedUser);

        return NextResponse.json({
          success: true,
          action: 'updated',
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            username: updatedUser.username,
            profileCompleted: updatedUser.profile_completed
          },
          needsProfileCompletion: profileCheck.needsCompletion,
          missingFields: profileCheck.missingFields
        });

      } else {
        console.log('👤 New user, creating...');

        // Generate username if not provided
        if (!username && resolvedFirstName && resolvedLastName) {
          username = await generateUsername(resolvedFirstName, resolvedLastName, email);
          console.log('🔤 Generated username for new user:', username);
        } else if (!username) {
          // Fallback username generation from email
          const emailBase = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
          username = await generateUsername('user', emailBase, email);
          console.log('🔤 Generated fallback username:', username);
        }

        // Prepare new user data - FIXED: using image_url instead of avatar_url
        const newUserData = {
          id,
          email,
          first_name: resolvedFirstName || null,
          last_name: resolvedLastName || null,
          username: username || null,
          image_url: imageUrl_processed,
          profile_completed: false, // Always false for new users
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log('🔄 Creating new user with data:', {
          id: newUserData.id,
          email: newUserData.email,
          hasFirstName: !!newUserData.first_name,
          hasLastName: !!newUserData.last_name,
          hasUsername: !!newUserData.username,
          hasAvatar: !!newUserData.image_url
        });

        const { data: newUser, error: insertError } = await supabaseAdmin
          .from('users')
          .insert([newUserData])
          .select('*')
          .single();

        if (insertError) {
          console.error('❌ Failed to create new user:', insertError);
          
          // Handle specific database errors
          if (insertError.code === '23505') { // Unique constraint violation
            if (insertError.message?.includes('username')) {
              console.log('🔄 Username conflict, retrying with new username...');
              
              // Generate a new username and retry
              const retryUsername = await generateUsername(
                resolvedFirstName || 'user', 
                resolvedLastName || Date.now().toString(), 
                email
              );
              
              newUserData.username = retryUsername;
              
              const { data: retryUser, error: retryError } = await supabaseAdmin
                .from('users')
                .insert([newUserData])
                .select('*')
                .single();

              if (retryError) {
                console.error('❌ Retry failed:', retryError);
                return NextResponse.json(
                  { error: 'Failed to create user after retry', code: 'RETRY_FAILED', details: retryError }, 
                  { status: 500 }
                );
              }

              console.log('✅ User created successfully on retry');
              
              // Check if profile completion is needed for retry user
              const profileCheck = determineProfileCompletion(retryUser);

              return NextResponse.json({
                success: true,
                action: 'created',
                user: {
                  id: retryUser.id,
                  email: retryUser.email,
                  firstName: retryUser.first_name,
                  lastName: retryUser.last_name,
                  username: retryUser.username,
                  profileCompleted: retryUser.profile_completed
                },
                needsProfileCompletion: profileCheck.needsCompletion,
                missingFields: profileCheck.missingFields
              });
            }
          }
          
          return NextResponse.json(
            { error: 'Failed to create user', code: 'INSERT_ERROR', details: insertError }, 
            { status: 500 }
          );
        }

        console.log('✅ New user created successfully');

        // Check if profile completion is needed
        const profileCheck = determineProfileCompletion(newUser);

        return NextResponse.json({
          success: true,
          action: 'created',
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.first_name,
            lastName: newUser.last_name,
            username: newUser.username,
            profileCompleted: newUser.profile_completed
          },
          needsProfileCompletion: profileCheck.needsCompletion,
          missingFields: profileCheck.missingFields
        });
      }

    } catch (dbError) {
      console.error('❌ Database operation failed:', dbError);
      return NextResponse.json(
        { error: 'Database operation failed', code: 'DB_OPERATION_ERROR', details: dbError }, 
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Sync user API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}