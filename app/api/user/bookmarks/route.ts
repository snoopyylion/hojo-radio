// app/api/user/bookmarks/route.ts
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";

interface SanityPost {
  _id: string;
  title: string;
  description: string;
  slug: { current: string };
  mainImage?: {
    asset: {
      _ref: string;
      _type: string;
    };
  };
  publishedAt: string;
  author: {
    name: string;
    image?: {
      asset: {
        _ref: string;
        _type: string;
      };
    };
  };
  categories: { title: string }[];
}

interface BookmarkedPost {
  id: string;
  post_id: string;
  created_at: string;
  post?: {
    _id: string;
    title: string;
    description: string;
    slug: { current: string };
    mainImage?: {
      asset: {
        _ref: string;
        _type: string;
      };
    };
    publishedAt: string;
    author: {
      name: string;
      image?: {
        asset: {
          _ref: string;
          _type: string;
        };
      };
    };
    categories: { title: string }[];
  };
}

interface UserBookmarksResponse {
  bookmarks: BookmarkedPost[];
  count: number;
  totalPages: number;
  currentPage: number;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<UserBookmarksResponse | ErrorResponse>> {
  try {
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Cap at 50
    const offset = (page - 1) * limit;

    console.log('📚 Fetching bookmarks for user:', userId, `(page ${page}, limit ${limit})`);

    // Get bookmarks with pagination
    const { data: bookmarks, error: bookmarksError, count } = await supabaseAdmin
      .from('post_bookmarks')
      .select('id, post_id, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (bookmarksError) {
      console.error('❌ Error fetching bookmarks:', bookmarksError);
      return NextResponse.json({ 
        error: 'Failed to fetch bookmarks',
        details: bookmarksError.message 
      }, { status: 500 });
    }

    if (!bookmarks || bookmarks.length === 0) {
      console.log('📭 No bookmarks found for user');
      return NextResponse.json({
        bookmarks: [],
        count: 0,
        totalPages: 0,
        currentPage: page
      });
    }

    // Extract post IDs to fetch from Sanity
    const postIds = bookmarks.map(bookmark => bookmark.post_id);
    console.log('🔍 Fetching post details for IDs:', postIds);

    // FIXED: Corrected Sanity query with proper asset reference resolution
    const sanityQuery = `
      *[_type == "post" && _id in $postIds] {
        _id,
        title,
        description,
        slug,
        mainImage {
          asset -> {
            _id,
            _ref,
            _type,
            url
          }
        },
        publishedAt,
        author -> {
          name,
          image {
            asset -> {
              _id,
              _ref,
              _type,
              url
            }
          }
        },
        categories[] -> {
          title
        }
      }
    `;

    const sanityPosts = await client.fetch(sanityQuery, { postIds }) as SanityPost[];
    console.log('✅ Retrieved', sanityPosts?.length || 0, 'posts from Sanity');

    // Debug log to check the structure of returned posts
    if (sanityPosts.length > 0) {
      console.log('🔍 Sample post structure:', JSON.stringify(sanityPosts[0], null, 2));
    }

    // Create a map for quick lookup
    const postMap = new Map<string, SanityPost>(sanityPosts.map(post => [post._id, post]));

    // Combine bookmark data with post details
    const bookmarksWithPosts: BookmarkedPost[] = bookmarks
      .map(bookmark => ({
        ...bookmark,
        post: postMap.get(bookmark.post_id) || undefined
      }))
      .filter(bookmark => bookmark.post !== undefined);

    const totalPages = Math.ceil((count || 0) / limit);

    console.log('✅ Retrieved', bookmarksWithPosts.length, 'bookmarks with post details');

    return NextResponse.json({
      bookmarks: bookmarksWithPosts,
      count: count || 0,
      totalPages,
      currentPage: page
    });

  } catch (error) {
    console.error('❌ Bookmarks fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch bookmarks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Optional: DELETE endpoint to remove all bookmarks for a user
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<{ success: boolean; deletedCount: number } | ErrorResponse>> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('🗑️ Deleting all bookmarks for user:', userId);

    const { data, error } = await supabaseAdmin
      .from('post_bookmarks')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (error) {
      console.error('❌ Error deleting bookmarks:', error);
      return NextResponse.json({ 
        error: 'Failed to delete bookmarks',
        details: error.message 
      }, { status: 500 });
    }

    const deletedCount = data?.length || 0;
    console.log('✅ Deleted', deletedCount, 'bookmarks');

    return NextResponse.json({
      success: true,
      deletedCount
    });

  } catch (error) {
    console.error('❌ Delete bookmarks error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete bookmarks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}