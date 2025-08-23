import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sanityClient } from '@/lib/sanity/server';

interface SanityPost {
  _id: string;
  title: string;
  slug: { current: string };
  content?: string;
  publishedAt?: string;
  _createdAt?: string;
  mainImage?: {
    asset?: { url: string };
  };
  author?: {
    name: string;
    image?: {
      asset?: { url: string };
    };
  };
  categories?: { title: string }[];
}

interface TrendingPost {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  publishedAt?: string;
  _createdAt?: string;
  mainImage?: {
    asset: { url: string };
    alt?: string;
  };
  author?: {
    name: string;
    imageUrl?: string;
  };
  categories?: { title: string }[];
  viewCount: number;
}

interface ViewCount {
  post_id: string;
  post_title: string;
  post_slug: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let limit = parseInt(searchParams.get('limit') || '10');
    let offset = parseInt(searchParams.get('offset') || '0');
    
    // Validate parameters
    if (limit > 100) limit = 100;
    if (offset < 0) offset = 0;

    console.log('🚀 GET trending posts request:', { limit, offset });

    // Get posts with highest view counts from post_views table
    // First, get all view records
    const { data: allViews, error: viewsError } = await supabaseAdmin
      .from('post_views')
      .select('post_id, post_title, post_slug');

    if (viewsError) {
      console.error('❌ Supabase query failed:', viewsError);
      return NextResponse.json({ error: 'Failed to fetch trending posts' }, { status: 500 });
    }

    if (!allViews || allViews.length === 0) {
      console.log('📊 No posts with views found');
      return NextResponse.json({
        posts: [],
        pagination: {
          total: 0,
          limit,
          offset,
          has_more: false,
        },
        success: true,
      });
    }

    // Count views per post
    const viewCounts = allViews.reduce((acc: Record<string, ViewCount>, view) => {
      const postId = view.post_id;
      if (!acc[postId]) {
        acc[postId] = {
          post_id: postId,
          post_title: view.post_title,
          post_slug: view.post_slug,
          count: 0
        };
      }
      acc[postId].count++;
      return acc;
    }, {});

    // Convert to array and sort by count
    const sortedViewCounts = Object.values(viewCounts)
      .sort((a: ViewCount, b: ViewCount) => b.count - a.count)
      .slice(offset, offset + limit);

    console.log('📊 Found posts with views:', sortedViewCounts.length);

    const postIds = sortedViewCounts.map((item: ViewCount) => item.post_id);

    // Get corresponding posts from Sanity for additional details
    const sanityQuery = `*[_type == "post" && _id in $ids]{
      _id, title, slug, content, publishedAt, _createdAt,
      mainImage{asset->{url}}, 
      author->{name, image{asset->{url}}}, 
      categories[]->{title}
    }`;

    const sanityPosts: SanityPost[] = await sanityClient.fetch(sanityQuery, { ids: postIds });

    console.log('📚 Found Sanity posts:', sanityPosts.length);

    // Create a map for quick lookup
    const sanityMap = new Map<string, SanityPost>(
      sanityPosts.map(p => [p._id, p])
    );

    // Transform the data
    const transformedPosts: TrendingPost[] = sortedViewCounts
      .map((item: ViewCount) => {
        const post = sanityMap.get(item.post_id);
        const viewCount = item.count || 0;
        
        return {
          _id: item.post_id,
          title: post?.title || item.post_title || 'Untitled',
          slug: post?.slug || { current: item.post_slug || item.post_id },
          description: post?.content?.substring(0, 200) || '',
          publishedAt: post?.publishedAt || post?._createdAt,
          _createdAt: post?._createdAt,
          mainImage: post?.mainImage?.asset?.url
            ? {
                asset: { url: post.mainImage.asset.url },
                alt: post.title || 'Image',
              }
            : undefined,
          author: {
            name: post?.author?.name || 'Anonymous',
            imageUrl: post?.author?.image?.asset?.url || '',
          },
          categories: (post?.categories || []).map(cat => ({
            title: cat.title,
          })),
          viewCount: viewCount,
        };
      });

    console.log('✅ Transformed trending posts:', transformedPosts.length);

    return NextResponse.json({
      posts: transformedPosts,
      pagination: {
        total: Object.keys(viewCounts).length,
        limit,
        offset,
        has_more: offset + limit < Object.keys(viewCounts).length,
      },
      success: true,
    });
  } catch (error) {
    console.error('❌ Error in GET trending:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
