// /pages/api/posts/admin/approve-post.ts
import { sanityClient } from '@/lib/sanity/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { postId } = await req.json();

  try {
    const result = await sanityClient.patch(postId)
      .set({ status: 'approved', rejectionReason: '' })
      .commit();

    return NextResponse.json(result);
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

