import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity/server';
import { POSTS_BY_AUTHOR_QUERY } from '@/sanity/lib/queries';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { authorId } = body;

    if (!authorId) {
      return NextResponse.json({ message: 'Missing author ID' }, { status: 400 });
    }

    const posts = await sanityClient.fetch(POSTS_BY_AUTHOR_QUERY, { id: authorId });
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts by author:', error);
    return NextResponse.json({ message: 'Error fetching posts' }, { status: 500 });
  }
}
