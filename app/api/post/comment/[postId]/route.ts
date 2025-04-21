// app/api/post/comment/[postId]/route.ts
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// Define types for your database tables
interface User {
  id: string;
  first_name: string;
  last_name: string;
}

interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  comment: string;
  created_at: string;
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

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ postId: string }> }
  ) {
    const { postId } = await context.params;
    try{
    // Fetch the authenticated user
    const { userId } = await auth();
    
    console.log('API Route - Processing postId:', postId);
    
    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }
    
    // Fetch comments
    const { data: comments, error: commentError } = await supabaseAdmin
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });
      
    if (commentError) {
      console.error("Error fetching comments:", commentError.message);
      return NextResponse.json({
        comments: [],
        error: commentError.message
      }, { status: 500 });
    }
    
    // Get unique user IDs from comments
    const userIds = [...new Set((comments as Comment[] || []).map(comment => comment.user_id))];
    
    // Fetch user data separately
    let users: User[] = [];
    if (userIds.length > 0) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from("users")
        .select("id, first_name, last_name")
        .in("id", userIds);
        
      if (!userError) {
        users = userData as User[] || [];
      }
    }
    
    // Fetch reactions for all comments
    const commentIds = (comments as Comment[] || []).map(comment => comment.id);
    let reactions: Reaction[] = [];
    
    if (commentIds.length > 0) {
      const { data: reactionData, error: reactionError } = await supabaseAdmin
        .from("comment_reactions")
        .select("*")
        .in("comment_id", commentIds);
        
      if (!reactionError) {
        reactions = reactionData as Reaction[] || [];
      }
    }
    
    // Prepare comments with user data and reactions
    const commentsWithUserData: CommentResponse[] = (comments as Comment[] || []).map(comment => {
      const user = users.find(u => u.id === comment.user_id);
      
      // Count likes and dislikes for this comment
      const commentReactions = reactions.filter(r => r.comment_id === comment.id);
      const likes = commentReactions.filter(r => r.reaction_type === 'like').length;
      const dislikes = commentReactions.filter(r => r.reaction_type === 'dislike').length;
      
      // Check if current user has reacted to this comment
      let userReaction: 'like' | 'dislike' | null = null;
      if (userId) {
        const userReactionData = commentReactions.find(r => r.user_id === userId);
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
        user_first_name: user?.first_name || 'Anonymous',
        user_last_name: user?.last_name || 'User',
        likes,
        dislikes,
        userReaction
      };
    });
    
    return NextResponse.json({ comments: commentsWithUserData });
  } catch (error) {
    console.error("Error processing comments:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}