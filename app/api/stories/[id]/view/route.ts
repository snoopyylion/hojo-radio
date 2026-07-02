import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/stories/[id]/view — record that current user viewed this story
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: storyId } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    // upsert — idempotent; no-op if already viewed
    await supabaseAdmin
      .from('story_views')
      .upsert({ story_id: storyId, viewer_id: userId }, { onConflict: 'story_id,viewer_id', ignoreDuplicates: true });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
