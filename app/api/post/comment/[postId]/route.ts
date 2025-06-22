// app/api/post/comment/[postId]/route.ts
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from 'next/cache';

interface SupabaseCommentWithUser {
  id: string;
  user_id: string;
  post_id: string;
  comment: string;
  created_at: string;
  users?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}


interface Reaction {
  id: string;
  user_id: string;
  comment_id: string;
  reaction_type: 'like' | 'dislike';
}

interface CommentResponse {
  id: string;
  user_id: string;
  post_id: string;
  comment: string;
  created_at: string;
  user_first_name: string;
  user_last_name: string;
  likes: number;
  dislikes: number;
  userReaction: 'like' | 'dislike' | null;
}

// Cache comments data for 1 minute
const getCachedComments = unstable_cache(
  async (postId: string) => {
    // Single query with JOIN to get comments and users in one request
    const { data: commentsWithUsers, error: commentError } = await supabaseAdmin
      .from("comments")
      .select(`
        *,
        users!inner(id, first_name, last_name)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: false });
      
    if (commentError) {
      throw new Error(commentError.message);
    }
    
    return commentsWithUsers || [];
  },
  ['comments'],
  {
    revalidate: 60, // Cache for 1 minute
    tags: ['comments']
  }
);

// Cache reactions data for 1 minute
const getCachedReactions = unstable_cache(
  async (commentIds: string[]) => {
    if (commentIds.length === 0) return [];
    
    const { data: reactions, error: reactionError } = await supabaseAdmin
      .from("comment_reactions")
      .select("*")
      .in("comment_id", commentIds);
      
    if (reactionError) {
      throw new Error(reactionError.message);
    }
    
    return reactions || [];
  },
  ['reactions'],
  {
    revalidate: 60, // Cache for 1 minute
    tags: ['reactions']
  }
);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await context.params;
    const { userId } = await auth();
    
    console.log('API Route - Processing postId:', postId);
    
    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }
    
    // Get cached comments with user data
    const commentsWithUsers = await getCachedComments(postId);
    
    // Extract comment IDs for reactions query
    const commentIds = commentsWithUsers.map((comment: SupabaseCommentWithUser) => comment.id);
    
    // Get cached reactions
    const reactions = await getCachedReactions(commentIds);
    
    // Process comments with reactions
    const commentsWithUserData: CommentResponse[] = commentsWithUsers.map((comment: SupabaseCommentWithUser) => {
      // Count likes and dislikes for this comment
      const commentReactions = reactions.filter((r: Reaction) => r.comment_id === comment.id);
      const likes = commentReactions.filter((r: Reaction) => r.reaction_type === 'like').length;
      const dislikes = commentReactions.filter((r: Reaction) => r.reaction_type === 'dislike').length;
      
      // Check if current user has reacted to this comment
      let userReaction: 'like' | 'dislike' | null = null;
      if (userId) {
        const userReactionData = commentReactions.find((r: Reaction) => r.user_id === userId);
        if (userReactionData) {
          userReaction = userReactionData.reaction_type;
        }
      }
      
      return {
        id: comment.id,
        user_id: comment.user_id,
        post_id: comment.post_id,
        comment: comment.comment,
        created_at: comment.created_at,
        user_first_name: comment.users?.first_name || 'Anonymous',
        user_last_name: comment.users?.last_name || 'User',
        likes,
        dislikes,
        userReaction
      };
    });
    
    return NextResponse.json({ 
      comments: commentsWithUserData,
      cached: true 
    });
    
  } catch (error) {
    console.error("Error processing comments:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}