// app/api/auth/youtube/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  console.log('🔗 YouTube OAuth callback received');
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    console.log('📋 Callback parameters:', { code: code ? 'present' : 'missing', error });

    // Get the base URL from environment or construct it
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL || 
                   'http://localhost:3000';

    console.log('🌐 Base URL:', baseUrl);

    // If there's an error from Google OAuth
    if (error) {
      console.error('❌ YouTube OAuth error:', error);
      return NextResponse.redirect(`${baseUrl}/home/podcasts?error=oauth_error&message=${error}`);
    }

    // If no authorization code, redirect with error
    if (!code) {
      console.error('❌ No authorization code received from YouTube');
      return NextResponse.redirect(`${baseUrl}/home/podcasts?error=no_code`);
    }

    console.log('✅ Authorization code received, redirecting to frontend');

    // Store the authorization code temporarily (we'll complete the flow on the frontend)
    // For now, just redirect to the frontend with the code
    // The frontend will complete the OAuth flow when the user is authenticated
    return NextResponse.redirect(`${baseUrl}/home/podcasts?oauth_code=${code}&step=complete_auth`);

  } catch (error) {
    console.error('❌ YouTube OAuth callback failed:', error);
    
    // Get the base URL from environment or construct it
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL || 
                   'http://localhost:3000';
    
    return NextResponse.redirect(`${baseUrl}/home/podcasts?error=callback_failed`);
  }
}