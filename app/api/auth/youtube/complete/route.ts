// app/api/auth/youtube/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { YouTubeAuth } from '@/lib/youtube-live';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  console.log('🔄 YouTube OAuth completion route called');
  console.log('📋 Request headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    console.log('🔐 Attempting to get user from Clerk auth...');
    const { userId } = await auth();
    console.log('👤 User ID from auth:', userId);
    
    if (!userId) {
      console.log('❌ No user ID found, returning unauthorized');
      console.log('🔍 This might indicate a Clerk authentication issue');
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No user ID found' },
        { status: 401 }
      );
    }

    const { code } = await request.json();
    console.log('📋 Authorization code received:', code ? 'present' : 'missing');

    if (!code) {
      console.log('❌ No authorization code provided');
      return NextResponse.json(
        { success: false, error: 'Authorization code required' },
        { status: 400 }
      );
    }

    // Get the base URL from environment or construct it
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL || 
                   'http://localhost:3000';

    console.log('🌐 Base URL for YouTube auth:', baseUrl);

    const youtubeAuth = new YouTubeAuth(baseUrl);
    console.log('🔐 YouTube auth instance created, exchanging code for tokens...');
    
    const tokens = await youtubeAuth.getTokenFromCode(code);
    console.log('✅ Tokens received from YouTube');

    // Preserve existing refresh token if Google didn't return a new one
    const { data: existingToken } = await supabase
      .from('user_youtube_tokens')
      .select('refresh_token')
      .eq('user_id', userId)
      .single();

    const refreshTokenToStore = tokens.refresh_token || existingToken?.refresh_token || null;

    // Store tokens in Supabase for this user
    console.log('💾 Storing tokens in Supabase for user:', userId);
    await supabase
      .from('user_youtube_tokens')
      .upsert([{
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: refreshTokenToStore,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        updated_at: new Date().toISOString()
      }]);

    console.log('✅ YouTube OAuth completed successfully');
    return NextResponse.json({
      success: true,
      message: 'YouTube account connected successfully'
    });

  } catch (error) {
    console.error('❌ Failed to complete YouTube OAuth:', error);
    
    // More detailed error information
    if (error instanceof Error) {
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to complete OAuth flow' },
      { status: 500 }
    );
  }
}
