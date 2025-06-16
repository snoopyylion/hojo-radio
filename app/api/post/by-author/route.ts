
// api/posts/by-author/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '../../../../lib/sanity/client'; // Adjust import path

export async function POST(request: NextRequest) {
  try {
    const { authorId } = await request.json();

    if (!authorId) {
      return NextResponse.json(
        { error: 'Author ID is required' },
        { status: 400 }
      );
    }

    const POSTS_BY_AUTHOR_QUERY = `
      *[_type == "post" && author._ref == $id] | order(publishedAt desc, _createdAt desc) {
        _id,
        _createdAt,
        _updatedAt,
        title,
        slug,
        description,
        excerpt,
        body,
        mainImage {
          asset -> {
            url,
            metadata {
              dimensions
            }
          }
        },
        author -> {
          _id,
          name,
          slug,
          image {
            asset -> {
              url
            }
          }
        },
        categories[] -> {
          _id,
          title
        },
        publishedAt,
        likes,
        comments
      }
    `;

    const posts = await sanityClient.fetch(POSTS_BY_AUTHOR_QUERY, { id: authorId });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts by author:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

