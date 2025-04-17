// /pages/api/posts/admin/reject-post.ts
// /api/admin/reject-post.ts
import { sanityClient } from '@/lib/sanity/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { postId, reason } = await req.json();

  try {
    const result = await sanityClient.patch(postId)
      .set({ status: 'rejected', rejectionReason: reason || 'No reason provided' })
      .commit();

    return NextResponse.json(result);
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

