// app/api/post/[id]/like/route.ts
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

interface LikeData {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check if user already liked this post
    const { data: existingLike, error: checkError } = await supabaseAdmin
      .from('post_likes')
      .select('*')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error checking existing like:', checkError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const hasLiked = !!existingLike;

    if (hasLiked) {
      // Remove like
      console.log('➖ Removing like...');
      
      const { error: deleteError } = await supabaseAdmin
        .from('post_likes')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);

      if (deleteError) {
        console.error('❌ Error removing like:', deleteError);
        return NextResponse.json({ error: 'Failed to remove like' }, { status: 500 });
      }

      // Get updated like count
      const { count: newCount } = await supabaseAdmin
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      console.log('✅ Like removed, new count:', newCount || 0);
      
      return NextResponse.json({
        success: true,
        liked: false,
        likeCount: newCount || 0
      });
    } else {
      // Add like
      console.log('➕ Adding like...');
      
      const { error: insertError } = await supabaseAdmin
        .from('post_likes')
        .insert({
          user_id: userId,
          post_id: postId
        });

      if (insertError) {
        console.error('❌ Error adding like:', insertError);
        return NextResponse.json({ error: 'Failed to add like' }, { status: 500 });
      }

      // Get updated like count
      const { count: newCount } = await supabaseAdmin
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      console.log('✅ Like added, new count:', newCount || 0);
      
      return NextResponse.json({
        success: true,
        liked: true,
        likeCount: newCount || 0
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
) {
  try {
    const resolvedParams = await params;
    
    if (!resolvedParams?.id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const { id: postId } = resolvedParams;
    
    // Get authenticated user (optional for GET)
    const { userId } = await auth();

    console.log('📊 Fetching like status for post:', postId);

    // Get total like count for the post
    const { count: likeCount } = await supabaseAdmin
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    let hasLiked = false;

    // Check if current user liked this post (if authenticated)
    if (userId) {
      const { data: userLike, error } = await supabaseAdmin
        .from('post_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .single();

      if (!error) {
        hasLiked = !!userLike;
      }
    }

    return NextResponse.json({
      likeCount: likeCount || 0,
      hasLiked
    });
  } catch (error) {
    console.error('❌ Get like status error:', error);
    return NextResponse.json({ 
      error: 'Failed to get like status' 
    }, { status: 500 });
  }
}