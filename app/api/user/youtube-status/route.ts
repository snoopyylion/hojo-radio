// app/api/user/youtube-status/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { auth, getAuth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    const fallback = await auth();
    const resolvedUserId = userId || fallback.userId;

    if (!resolvedUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has YouTube tokens
    const { data: tokenData, error } = await supabase
      .from('user_youtube_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', resolvedUserId)
      .single();

    if (error || !tokenData) {
      return NextResponse.json({
        success: true,
        connected: false,
        accessToken: null
      });
    }

    // Check if token is still valid
    const now = new Date();
    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;
    
    if (expiresAt && now >= expiresAt) {
      // Try to refresh using stored refresh_token
      if (tokenData.refresh_token) {
        try {
          const oauth2 = new google.auth.OAuth2(
            process.env.YOUTUBE_CLIENT_ID,
            process.env.YOUTUBE_CLIENT_SECRET,
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/youtube/callback`
          );
          oauth2.setCredentials({ refresh_token: tokenData.refresh_token });
          const refreshed = await oauth2.getAccessToken();
          const newAccessToken = refreshed?.token || null;

          if (newAccessToken) {
            // Save new token and expiry (set to 55 mins from now if unknown)
            const newExpiry = new Date(Date.now() + 55 * 60 * 1000).toISOString();
            await supabase
              .from('user_youtube_tokens')
              .update({ access_token: newAccessToken, expires_at: newExpiry, updated_at: new Date().toISOString() })
              .eq('user_id', resolvedUserId);

            return NextResponse.json({
              success: true,
              connected: true,
              accessToken: newAccessToken
            });
          }
        } catch (e) {
          console.error('Failed to refresh YouTube token:', e);
        }
      }

      // If refresh failed, indicate reconnect needed
      return NextResponse.json({
        success: true,
        connected: false,
        accessToken: null,
        message: 'Token expired, please reconnect'
      });
    }

    return NextResponse.json({
      success: true,
      connected: true,
      accessToken: tokenData.access_token
    });

  } catch (error) {
    console.error('Failed to check YouTube status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check status' },
      { status: 500 }
    );
  }
}