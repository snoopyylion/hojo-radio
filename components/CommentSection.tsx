"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Send, MoreHorizontal, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

type Comment = {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_first_name: string;
  user_last_name: string;
  likes: number;
  dislikes: number;
  userReaction?: "like" | "dislike" | null;
};

type Props = {
  postId: string;
  onCommentCountChange?: (count: number) => void;
};

export default function CommentSection({ postId, onCommentCountChange }: Props) {
  const { user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittingReaction, setSubmittingReaction] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    if (!postId) {
      console.error("Missing postId in CommentSection");
      setError("Missing post ID");
      setIsLoading(false);
      return;
    }
    
    try {
      const res = await fetch(`/api/post/comment/${postId}`);
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to parse response" }));
        throw new Error(data.error || `Failed to fetch comments: ${res.status}`);
      }
      
      const data = await res.json();
      setComments(data.comments || []);
    } catch (error: unknown) {
      console.error("Fetch error:", error);
      setError(error instanceof Error ? error.message : "Failed to load comments");
      toast.error("Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !postId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/post/comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ postId, comment: newComment }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to post comment.");
      }

      toast.success("Comment posted!");
      setNewComment("");
      await fetchComments();

      // Update comment count after successful fetch
      if (onCommentCountChange) {
        onCommentCountChange(comments.length); // This will be updated after fetchComments
      }
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to post comment";
      toast.error(message);
    } finally {
      setLoading(false); 
    }
  };

  const handleReaction = async (commentId: string, reactionType: "like" | "dislike") => {
    if (!user) {
      toast.error("You must be logged in to react to comments");
      return;
    }

    setSubmittingReaction(commentId);
    try {
      const res = await fetch("/api/post/comment/reaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ commentId, reactionType }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to react to comment");
      }

      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment.id === commentId) {
            if (comment.userReaction === reactionType) {
              return {
                ...comment,
                userReaction: null,
                [reactionType + 's']: Math.max(0, comment[reactionType + 's' as keyof Comment] as number - 1)
              };
            } else if (comment.userReaction) {
              const oldReactionType = comment.userReaction;
              return {
                ...comment,
                userReaction: reactionType,
                [oldReactionType + 's']: Math.max(0, comment[oldReactionType + 's' as keyof Comment] as number - 1),
                [reactionType + 's']: (comment[reactionType + 's' as keyof Comment] as number) + 1
              };
            } else {
              return {
                ...comment,
                userReaction: reactionType,
                [reactionType + 's']: (comment[reactionType + 's' as keyof Comment] as number) + 1
              };
            }
          }
          return comment;
        })
      );

      toast.success(`${reactionType === "like" ? "Liked" : "Disliked"} comment`);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to process reaction");
      toast.error("Failed to process reaction")
      fetchComments();
    } finally {
      setSubmittingReaction(null);
    }
  };

  // Only fetch comments when postId changes
useEffect(() => {
  if (postId) {
    fetchComments();
  }
}, [postId, fetchComments]);

// Notify parent when comments length changes
useEffect(() => {
  if (onCommentCountChange && comments) {
    onCommentCountChange(comments.length);
  }
}, [comments, onCommentCountChange]);


  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatTimeAgo = (date: string) => {
    const timeAgo = formatDistanceToNow(new Date(date));
    return timeAgo;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-6 h-6 border-2 border-gray-200 dark:border-gray-700 border-t-[#EF3866] rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading comments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400 mb-3">Failed to load comments</p>
        <Button 
          onClick={fetchComments}
          variant="outline"
          size="sm"
          className="text-[#EF3866] border-[#EF3866] hover:bg-pink-50"
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Comments
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
          {comments.length}
        </span>
      </div>
      
      {/* Comment input */}
      {user ? (
        <div className="mb-8">
          <div className="flex items-start space-x-3">
            {user.imageUrl ? (
              <Image 
                src={user.imageUrl} 
                alt={user.fullName || "User"} 
                width={32} 
                height={32}
                className="rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800 flex-shrink-0" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EF3866] to-purple-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {user.firstName?.charAt(0) || "U"}
              </div>
            )}
            
            <div className="flex-1">
              <div className="relative">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={1}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-[#EF3866] focus:ring-1 focus:ring-[#EF3866] bg-white dark:bg-gray-800 resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-4 py-3 pr-12 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={loading || !newComment.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-[#EF3866] hover:bg-pink-50 dark:hover:bg-pink-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 text-center py-6 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-200 dark:border-gray-700">
          <MessageCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">Sign in to join the conversation</p>
        </div>
      )}

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-1">No comments yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Be the first to share your thoughts</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="group">
              <div className="flex items-start space-x-3">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                  {getInitials(comment.user_first_name, comment.user_last_name)}
                </div>
                
                {/* Comment content */}
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {`${comment.user_first_name} ${comment.user_last_name}`}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimeAgo(comment.created_at)} ago
                      </span>
                    </div>
                    
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                      {comment.comment}
                    </p>
                  </div>
                  
                  {/* Reaction buttons */}
                  <div className="flex items-center space-x-4 mt-2 ml-1">
                    <button
                      className={`flex items-center space-x-1 text-xs transition-colors ${
                        comment.userReaction === 'like' 
                          ? 'text-red-500 font-medium'
                          : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
                      }`}
                      onClick={() => handleReaction(comment.id, "like")}
                      disabled={submittingReaction === comment.id}
                    >
                      <Heart className={`w-3 h-3 ${comment.userReaction === 'like' ? 'fill-current' : ''}`} />
                      <span>{comment.likes || 0}</span>
                    </button>
                    
                    <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                      Reply
                    </button>
                    
                    <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Load more */}
      {comments.length > 5 && (
        <div className="mt-8 text-center">
          <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#EF3866] dark:hover:text-pink-400 transition-colors font-medium">
            View more comments
          </button>
        </div>
      )}
    </div>
  );
}