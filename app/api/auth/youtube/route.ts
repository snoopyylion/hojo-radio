// app/api/auth/youtube/route.ts
import {  NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { YouTubeAuth } from '@/lib/youtube-live';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the base URL from environment or construct it
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL || 
                   'http://localhost:3000';
    
    const youtubeAuth = new YouTubeAuth(baseUrl);
    const authUrl = youtubeAuth.getAuthUrl();

    return NextResponse.json({
      success: true,
      authUrl
    });

  } catch (error) {
    console.error('YouTube auth URL generation failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}