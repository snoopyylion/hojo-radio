"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, MessageSquare, User, AlertCircle, Loader2, MoreHorizontal } from "lucide-react";
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
};

export default function CommentSection({ postId }: Props) {
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
      fetchComments();
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

      // Update the local state to show the reaction immediately
      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment.id === commentId) {
            // Check if user is changing their reaction
            if (comment.userReaction === reactionType) {
              // User is removing their reaction
              return {
                ...comment,
                userReaction: null,
                [reactionType + 's']: Math.max(0, comment[reactionType + 's' as keyof Comment] as number - 1)
              };
            } else if (comment.userReaction) {
              // User is changing from like to dislike or vice versa
              const oldReactionType = comment.userReaction;
              return {
                ...comment,
                userReaction: reactionType,
                [oldReactionType + 's']: Math.max(0, comment[oldReactionType + 's' as keyof Comment] as number - 1),
                [reactionType + 's']: (comment[reactionType + 's' as keyof Comment] as number) + 1
              };
            } else {
              // User is adding a new reaction
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
      // If there was an error, refetch to ensure state is correct
      fetchComments();
    } finally {
      setSubmittingReaction(null);
    }
  };

  useEffect(() => {
    if (postId) {
      fetchComments();
    }
  }, [postId, fetchComments]);

  // Generate avatar initials from user name
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Format the timestamp in a more readable format
  const formatTimeAgo = (date: string) => {
    const timeAgo = formatDistanceToNow(new Date(date));
    return timeAgo;
  };

  if (isLoading) {
    return (
      <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-8">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-[#EF3866] rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading comments...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">Failed to load comments</p>
            <Button 
              onClick={fetchComments}
              variant="outline"
              size="sm"
              className="text-[#EF3866] border-[#EF3866] hover:bg-[#EF3866] hover:text-white"
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <h3 className="text-xl font-light text-gray-900 dark:text-white">
            Comments
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
            {comments.length}
          </span>
        </div>
      </div>
      
      {/* Comment input */}
      {user ? (
        <div className="mb-12">
          <div className="flex items-start space-x-3">
            {user.imageUrl ? (
              <Image 
                src={user.imageUrl} 
                alt={user.fullName || "User"} 
                width={40} 
                height={40}
                className="rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800" 
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-medium">
                {user.firstName?.charAt(0) || "U"}
              </div>
            )}
            
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Join the discussion..."
                rows={3}
                className="w-full text-center border-0 border-gray-200 dark:border-gray-700 rounded-none focus:border-[#EF3866]  bg-transparent resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-0 py-3"
              />
              
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Commenting as <span className="font-medium">{user.fullName}</span>
                </p>
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading || !newComment.trim()}
                  size="sm"
                  className="bg-[#EF3866] hover:bg-[#EF3866]/90 text-white px-4 py-2 h-8 text-sm disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Post"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-12 text-center py-8 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
          <User className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">Join the conversation</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Sign in to leave a comment</p>
        </div>
      )}

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">No comments yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Be the first to share your thoughts</p>
        </div>
      ) : (
        <div className="space-y-8">
          {comments.map((comment, index) => (
            <article key={comment.id} className="group">
              <div className="flex items-start space-x-3">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-medium flex-shrink-0">
                  {getInitials(comment.user_first_name, comment.user_last_name)}
                </div>
                
                {/* Comment content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {`${comment.user_first_name} ${comment.user_last_name}`}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(comment.created_at)} ago
                    </span>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">
                    {comment.comment}
                  </p>
                  
                  {/* Reaction buttons */}
                  <div className="flex items-center space-x-1">
                    <button
                      className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs transition-colors ${
                        comment.userReaction === 'like' 
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleReaction(comment.id, "like")}
                      disabled={submittingReaction === comment.id}
                    >
                      <ThumbsUp className={`w-3 h-3 ${comment.userReaction === 'like' ? 'fill-current' : ''}`} />
                      <span>{comment.likes || 0}</span>
                    </button>
                    
                    <button
                      className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs transition-colors ${
                        comment.userReaction === 'dislike'
                          ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleReaction(comment.id, "dislike")}
                      disabled={submittingReaction === comment.id}
                    >
                      <ThumbsDown className={`w-3 h-3 ${comment.userReaction === 'dislike' ? 'fill-current' : ''}`} />
                      <span>{comment.dislikes || 0}</span>
                    </button>
                    
                    <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Divider (except for last comment) */}
              {index < comments.length - 1 && (
                <div className="mt-8 border-b border-gray-100 dark:border-gray-800"></div>
              )}
            </article>
          ))}
        </div>
      )}
      
      {/* Load more (if needed) */}
      {comments.length > 10 && (
        <div className="mt-12 text-center">
          <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#EF3866] dark:hover:text-[#ff7a9c] transition-colors">
            Show more comments
          </button>
        </div>
      )}
    </div>
  );
}