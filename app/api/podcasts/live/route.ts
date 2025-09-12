// app/api/podcasts/live/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { YouTubeLiveService } from '@/lib/youtube-live';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, username } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // Get YouTube access token from database
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_youtube_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData?.access_token) {
      return NextResponse.json(
        {
          success: false,
          error: 'YouTube not connected. Please connect your YouTube account first.',
          requiresYouTubeAuth: true
        },
        { status: 400 }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;

    if (expiresAt && now >= expiresAt) {
      // Attempt to refresh token with stored refresh_token
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
            const newExpiry = new Date(Date.now() + 55 * 60 * 1000).toISOString();
            await supabase
              .from('user_youtube_tokens')
              .update({ access_token: newAccessToken, expires_at: newExpiry, updated_at: new Date().toISOString() })
              .eq('user_id', userId);

            // Use refreshed token
            const youtubeService = new YouTubeLiveService(newAccessToken);
            const liveSession = await youtubeService.createLiveBroadcast(
              title,
              description || `Live podcast: ${title}`
            );

            // Save the live session to your database
            const { data: podcastData, error: podcastError } = await supabase
              .from('podcasts') // Adjust table name as needed
              .insert({
                title,
                description,
                user_id: userId,
                username,
                youtube_broadcast_id: liveSession.broadcastId,
                youtube_stream_id: liveSession.streamId,
                rtmp_url: liveSession.rtmpUrl,
                stream_key: liveSession.streamKey,
                watch_url: liveSession.watchUrl,
                embed_url: liveSession.embedUrl,
                status: 'created',
                created_at: new Date().toISOString()
              })
              .select()
              .single();

            if (podcastError) {
              console.error('Database error:', podcastError);
              return NextResponse.json(
                { success: false, error: 'Failed to save podcast data' },
                { status: 500 }
              );
            }

            return NextResponse.json({
              success: true,
              session: {
                id: podcastData.id,
                title: podcastData.title,
                description: podcastData.description,
                youtubeData: {
                  broadcastId: liveSession.broadcastId,
                  streamId: liveSession.streamId,
                  rtmpUrl: liveSession.rtmpUrl,
                  streamKey: liveSession.streamKey,
                  watchUrl: liveSession.watchUrl,
                  embedUrl: liveSession.embedUrl
                },
                status: 'created',
                createdAt: podcastData.created_at
              }
            });
          }
        } catch (e) {
          console.error('Failed to refresh YouTube token during live start:', e);
        }
      }

      // If refresh failed or no refresh token, ask client to reconnect
      return NextResponse.json(
        {
          success: false,
          error: 'YouTube token expired. Please reconnect your account.',
          requiresYouTubeAuth: true
        },
        { status: 400 }
      );
    }

    // Helper to attempt creating a live broadcast with a given access token
    const attemptCreate = async (accessToken: string) => {
      const svc = new YouTubeLiveService(accessToken);
      return svc.createLiveBroadcast(
        title,
        description || `Live podcast: ${title}`
      );
    };

    let liveSession;
    try {
      // First attempt with current token
      liveSession = await attemptCreate(tokenData.access_token);
    } catch (err: unknown) {
      const e = err as {
        status?: number;
        reason?: string;
        response?: {
          status?: number;
          data?: {
            error?: {
              errors?: { reason?: string }[];
            };
          };
        };
      };
      const status = Number(e?.status) || Number(e?.response?.status);
      const reason: string | undefined = e?.reason || e?.response?.data?.error?.errors?.[0]?.reason;
      const authRelated = status === 401 || reason === 'authError' || reason === 'invalidCredentials' || reason === 'invalidGrant';

      // If auth-related error and we have a refresh token, try refresh then retry once
      if (authRelated && tokenData.refresh_token) {
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
            const newExpiryDate = new Date(Date.now() + 55 * 60 * 1000);
            await supabase
              .from('user_youtube_tokens')
              .update({ access_token: newAccessToken, expires_at: newExpiryDate.toISOString(), updated_at: new Date().toISOString() })
              .eq('user_id', userId);
            // Retry once with refreshed token
            liveSession = await attemptCreate(newAccessToken);
          } else {
            return NextResponse.json(
              { success: false, error: 'Failed to refresh YouTube token. Please reconnect.', requiresYouTubeAuth: true },
              { status: 400 }
            );
          }
        } catch (refreshErr) {
          console.error('YouTube token refresh failed during live creation:', refreshErr);
          return NextResponse.json(
            { success: false, error: 'YouTube token expired. Please reconnect your account.', requiresYouTubeAuth: true },
            { status: 400 }
          );
        }
      } else {
        throw err;
      }
    }

    // Save the live session to your database
    const { data: podcastData, error: podcastError } = await supabase
      .from('podcast_sessions')
      .insert({
        title,
        description,
        user_id: userId,
        username,
        is_live: true,
        status: 'live',
        youtube_broadcast_id: liveSession.broadcastId,
        youtube_stream_id: liveSession.streamId,
        rtmp_url: liveSession.rtmpUrl,
        stream_key: liveSession.streamKey,
        youtube_watch_url: liveSession.watchUrl,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (podcastError) {
      console.error('Database error:', podcastError);
      return NextResponse.json(
        { success: false, error: 'Failed to save podcast data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: podcastData.id,
        title: podcastData.title,
        description: podcastData.description,
        youtubeData: {
          broadcastId: liveSession.broadcastId,
          streamId: liveSession.streamId,
          rtmpUrl: liveSession.rtmpUrl,
          streamKey: liveSession.streamKey,
          watchUrl: liveSession.watchUrl,
          embedUrl: liveSession.embedUrl
        },
        status: 'created',
        createdAt: podcastData.created_at
      }
    });

  } catch (error) {
    console.error('Failed to create live session:', error);

    // Inspect enriched error from YouTube service
    const err = error as {
      reason?: string;
      details?: string;
      message?: string;
      status?: number;
      response?: {
        status?: number;
        data?: {
          error?: {
            errors?: { reason?: string }[];
          };
        };
      };
    };
    const reason: string | undefined = err?.reason || err?.response?.data?.error?.errors?.[0]?.reason;
    const message: string = err?.details || err?.message || 'YouTube API error';
    const statusCode: number = Number(err?.status) || Number(err?.response?.status) || 500;

    // Specific handling for live streaming not enabled
    if (reason === 'liveStreamingNotEnabled') {
      return NextResponse.json(
        {
          success: false,
          error: 'Your YouTube channel is not enabled for live streaming.',
          details: message,
          youtubeNotEnabled: true,
          helpUrl: 'https://support.google.com/youtube/answer/2474026',
        },
        { status: 403 }
      );
    }

    // Generic YouTube error surface
    return NextResponse.json(
      {
        success: false,
        error: 'YouTube API error. Please check your connection and try again.',
        details: message,
      },
      { status: statusCode }
    );
  }
}