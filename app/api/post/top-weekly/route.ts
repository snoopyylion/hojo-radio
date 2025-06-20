import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanityClient } from '@/lib/sanity/client';

interface SanityPost {
  _id: string;
  title: string;
  slug: { current: string };
  content?: string;
  publishedAt?: string;
  _createdAt?: string;  // ← Changed from 'createdAt' to '_createdAt'
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TopPost {
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
  likeCount: number;
  weeklyLikes: number;
  stats: {
    total_likes: number;
    weekly_likes: number;
  };
}

function getWeekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function getWeekEnd(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end.toISOString().split('T')[0];
}

async function getTopPostsFromSupabaseAndSanity(
  weekStart: string,
  limit: number,
  offset: number
) {
  try {
    // Calculate week end date
    const weekEnd = getWeekEnd(weekStart);
    
    console.log('🔍 Fetching top posts for week:', weekStart, 'to', weekEnd);

    // Get posts with likes from the current week
    // Since we don't have weekly breakdown, we'll use the total like counts
    // and filter by posts that have likes
    const { data: likeCounts, error } = await supabase
      .from('post_like_counts')
      .select('post_id, like_count')
      .gt('like_count', 0)
      .order('like_count', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Supabase query failed:', error);
      return { posts: [], total: 0 };
    }

    if (!likeCounts || likeCounts.length === 0) {
      console.log('📊 No posts with likes found');
      return { posts: [], total: 0 };
    }

    console.log('📊 Found posts with likes:', likeCounts.length);

    const postIds = likeCounts.map(item => item.post_id);

    // Get corresponding posts from Sanity
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

    // Create a map for like counts
    const likeCountMap = new Map<string, number>(
      likeCounts.map(item => [item.post_id, item.like_count])
    );

    // Transform the data
    const transformedPosts: TopPost[] = likeCounts
      .filter(item => sanityMap.has(item.post_id))
      .map(item => {
        const post = sanityMap.get(item.post_id)!;
        const likeCount = likeCountMap.get(item.post_id) || 0;
        
        return {
          _id: post._id,
          title: post.title || 'Untitled',
          slug: post.slug || { current: post._id },
          description: post.content?.substring(0, 200) || '',
          publishedAt: post.publishedAt || post._createdAt,
          _createdAt: post._createdAt,
          mainImage: post.mainImage?.asset?.url
            ? {
                asset: { url: post.mainImage.asset.url },
                alt: post.title || 'Image',
              }
            : undefined,
          author: {
            name: post.author?.name || 'Anonymous',
            imageUrl: post.author?.image?.asset?.url || '',
          },
          categories: (post.categories || []).map(cat => ({
            title: cat.title,
          })),
          likeCount: likeCount,
          weeklyLikes: likeCount, // Using total likes as weekly likes for now
          stats: {
            total_likes: likeCount,
            weekly_likes: likeCount,
          },
        };
      });

    console.log('✅ Transformed posts:', transformedPosts.length);

    return {
      posts: transformedPosts,
      total: likeCounts.length,
    };
  } catch (error) {
    console.error('❌ Error in getTopPostsFromSupabaseAndSanity:', error);
    return { posts: [], total: 0 };
  }
}

// GET handler
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('week_start') || getWeekStart();
    let limit = parseInt(searchParams.get('limit') || '10');
    let offset = parseInt(searchParams.get('offset') || '0');
    
    // Validate parameters
    if (limit > 100) limit = 100;
    if (offset < 0) offset = 0;

    console.log('🚀 GET top-weekly request:', { weekStart, limit, offset });

    const { posts, total } = await getTopPostsFromSupabaseAndSanity(weekStart, limit, offset);

    return NextResponse.json({
      posts,
      week_info: {
        week_start: weekStart,
        week_end: getWeekEnd(weekStart),
      },
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
      success: true,
    });
  } catch (error) {
    console.error('❌ Error in GET top-weekly:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const weekStart = body.week_start || getWeekStart();
    let limit = body.limit || 10;
    let offset = body.offset || 0;
    
    // Validate parameters
    if (limit > 100) limit = 100;
    if (offset < 0) offset = 0;

    console.log('🚀 POST top-weekly request:', { weekStart, limit, offset });

    const { posts, total } = await getTopPostsFromSupabaseAndSanity(weekStart, limit, offset);

    return NextResponse.json({
      posts,
      week_info: {
        week_start: weekStart,
        week_end: getWeekEnd(weekStart),
      },
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
      success: true,
    });
  } catch (error) {
    console.error('❌ Error in POST top-weekly:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}