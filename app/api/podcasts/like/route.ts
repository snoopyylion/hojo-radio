// app/api/podcasts/like/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PodcastDatabase } from '@/lib/supabase-helpers';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Toggle like (add if doesn't exist, remove if exists)
    const isLiked = await PodcastDatabase.toggleSessionLike(sessionId, userId);

    return NextResponse.json({
      success: true,
      isLiked,
      message: isLiked ? 'Liked' : 'Unliked'
    });

  } catch (error) {
    console.error('Failed to toggle like:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process like' },
      { status: 500 }
    );
  }
}