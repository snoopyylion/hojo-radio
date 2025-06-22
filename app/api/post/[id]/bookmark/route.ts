// app/api/post/[id]/bookmark/route.ts
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

interface BookmarkResponse {
  success: boolean;
  bookmarked: boolean;
  bookmarkCount: number;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

interface BookmarkStatusResponse {
  bookmarkCount: number;
  hasBookmarked: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<BookmarkResponse | ErrorResponse>> {
  try {
    const resolvedParams = await params;
    
    if (!resolvedParams?.id) {
      console.error('❌ No post ID provided');
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const { id: postId } = resolvedParams;
    
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('🔖 Processing bookmark for post:', postId, 'by user:', userId);

    // Check if bookmark already exists
    const { data: existingBookmark, error: checkError } = await supabaseAdmin
      .from('post_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking existing bookmark:', checkError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const hasBookmarked = !!existingBookmark;
    let newBookmarkCount = 0;

    if (hasBookmarked) {
      console.log('➖ Removing bookmark...');
      
      // Remove bookmark and get updated count
      const [deleteResult, countResult] = await Promise.all([
        supabaseAdmin
          .from('post_bookmarks')
          .delete()
          .eq('user_id', userId)
          .eq('post_id', postId),
        supabaseAdmin
          .from('post_bookmarks')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)
      ]);

      if (deleteResult.error) {
        console.error('❌ Error removing bookmark:', deleteResult.error);
        return NextResponse.json({ error: 'Failed to remove bookmark' }, { status: 500 });
      }

      // Adjust count since we just deleted one
      newBookmarkCount = Math.max(0, (countResult.count || 1) - 1);

      console.log('✅ Bookmark removed, new count:', newBookmarkCount);
      
      return NextResponse.json({
        success: true,
        bookmarked: false,
        bookmarkCount: newBookmarkCount
      });
    } else {
      console.log('➕ Adding bookmark...');
      
      // Add bookmark using upsert to handle race conditions
      const { error: insertError } = await supabaseAdmin
        .from('post_bookmarks')
        .upsert({
          user_id: userId,
          post_id: postId,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,post_id',
          ignoreDuplicates: true
        });

      if (insertError) {
        console.error('❌ Error adding bookmark:', insertError);
        return NextResponse.json({ error: 'Failed to add bookmark' }, { status: 500 });
      }

      // Get updated bookmark count
      const { count } = await supabaseAdmin
        .from('post_bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      newBookmarkCount = count || 1;

      console.log('✅ Bookmark added, new count:', newBookmarkCount);
      
      return NextResponse.json({
        success: true,
        bookmarked: true,
        bookmarkCount: newBookmarkCount
      });
    }
  } catch (error) {
    console.error('❌ Bookmark error details:', error);
    return NextResponse.json({ 
      error: 'Failed to process bookmark request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<BookmarkStatusResponse | ErrorResponse>> {
  try {
    const resolvedParams = await params;
    
    if (!resolvedParams?.id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const { id: postId } = resolvedParams;
    
    // Get authenticated user (optional for GET)
    const { userId } = await auth();

    console.log('📊 Fetching bookmark status for post:', postId);

    // Run queries in parallel when user is authenticated
    if (userId) {
      const [bookmarkCountResult, userBookmarkResult] = await Promise.all([
        supabaseAdmin
          .from('post_bookmarks')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId),
        supabaseAdmin
          .from('post_bookmarks')
          .select('id')
          .eq('user_id', userId)
          .eq('post_id', postId)
          .maybeSingle()
      ]);

      if (userBookmarkResult.error && userBookmarkResult.error.code !== 'PGRST116') {
        console.error('❌ Error checking user bookmark:', userBookmarkResult.error);
      }

      return NextResponse.json({
        bookmarkCount: bookmarkCountResult.count || 0,
        hasBookmarked: !!userBookmarkResult.data
      });
    } else {
      // If no user, just get the count
      const { count: bookmarkCount } = await supabaseAdmin
        .from('post_bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      return NextResponse.json({
        bookmarkCount: bookmarkCount || 0,
        hasBookmarked: false
      });
    }
  } catch (error) {
    console.error('❌ Get bookmark status error:', error);
    return NextResponse.json({ 
      error: 'Failed to get bookmark status' 
    }, { status: 500 });
  }
}