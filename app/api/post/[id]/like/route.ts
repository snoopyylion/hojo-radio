// app/api/post/[id]/like/route.ts
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

interface LikeResponse {
  success: boolean;
  liked: boolean;
  likeCount: number;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

interface LikeStatusResponse {
  likeCount: number;
  hasLiked: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<LikeResponse | ErrorResponse>> {
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

    console.log('🔄 Processing like for post:', postId, 'by user:', userId);

    // Use a transaction-like approach with upsert for better performance
    const { data: existingLike, error: checkError } = await supabaseAdmin
      .from('post_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no row exists

    if (checkError) {
      console.error('❌ Error checking existing like:', checkError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const hasLiked = !!existingLike;
    let newLikeCount = 0;

    if (hasLiked) {
      console.log('➖ Removing like...');
      
      // Use a single query to delete and get count
      const [deleteResult, countResult] = await Promise.all([
        supabaseAdmin
          .from('post_likes')
          .delete()
          .eq('user_id', userId)
          .eq('post_id', postId),
        supabaseAdmin
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)
      ]);

      if (deleteResult.error) {
        console.error('❌ Error removing like:', deleteResult.error);
        return NextResponse.json({ error: 'Failed to remove like' }, { status: 500 });
      }

      // Adjust count since we just deleted one
      newLikeCount = Math.max(0, (countResult.count || 1) - 1);

      console.log('✅ Like removed, new count:', newLikeCount);
      
      return NextResponse.json({
        success: true,
        liked: false,
        likeCount: newLikeCount
      });
    } else {
      console.log('➕ Adding like...');
      
      // Use upsert to handle potential race conditions
      const { error: insertError } = await supabaseAdmin
        .from('post_likes')
        .upsert({
          user_id: userId,
          post_id: postId,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,post_id',
          ignoreDuplicates: true
        });

      if (insertError) {
        console.error('❌ Error adding like:', insertError);
        return NextResponse.json({ error: 'Failed to add like' }, { status: 500 });
      }

      // Get updated like count
      const { count } = await supabaseAdmin
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      newLikeCount = count || 1;

      console.log('✅ Like added, new count:', newLikeCount);
      
      return NextResponse.json({
        success: true,
        liked: true,
        likeCount: newLikeCount
      });
    }
  } catch (error) {
    console.error('❌ Like error details:', error);
    return NextResponse.json({ 
      error: 'Failed to process like request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<LikeStatusResponse | ErrorResponse>> {
  try {
    const resolvedParams = await params;
    
    if (!resolvedParams?.id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const { id: postId } = resolvedParams;
    
    // Get authenticated user (optional for GET)
    const { userId } = await auth();

    console.log('📊 Fetching like status for post:', postId);

    // Optimize by running both queries in parallel when user is authenticated
    if (userId) {
      const [likeCountResult, userLikeResult] = await Promise.all([
        supabaseAdmin
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId),
        supabaseAdmin
          .from('post_likes')
          .select('id')
          .eq('user_id', userId)
          .eq('post_id', postId)
          .maybeSingle()
      ]);

      if (userLikeResult.error && userLikeResult.error.code !== 'PGRST116') {
        console.error('❌ Error checking user like:', userLikeResult.error);
      }

      return NextResponse.json({
        likeCount: likeCountResult.count || 0,
        hasLiked: !!userLikeResult.data
      });
    } else {
      // If no user, just get the count
      const { count: likeCount } = await supabaseAdmin
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      return NextResponse.json({
        likeCount: likeCount || 0,
        hasLiked: false
      });
    }
  } catch (error) {
    console.error('❌ Get like status error:', error);
    return NextResponse.json({ 
      error: 'Failed to get like status' 
    }, { status: 500 });
  }
}