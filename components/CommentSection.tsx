"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, MessageSquare, User, Send, AlertCircle, Loader2 } from "lucide-react";
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
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="inline-block w-8 h-1 bg-[#EF3866] dark:bg-[#ff7a9c]"></span>
          <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-white flex items-center">
            <MessageSquare size={20} className="mr-2" /> 
            Discussion
          </h3>
        </div>
        <div className="flex justify-center py-10">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-[#EF3866] animate-spin" />
            <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">Loading comments...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="inline-block w-8 h-1 bg-[#EF3866] dark:bg-[#ff7a9c]"></span>
          <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">Discussion</h3>
        </div>
        <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg shadow border border-red-100 dark:border-red-800/50">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle size={24} />
            <p className="font-medium">Error loading comments</p>
          </div>
          <p className="mb-4 text-red-600 dark:text-red-300">{error}</p>
          <Button 
            onClick={fetchComments} 
            className="mt-2 bg-red-600 hover:bg-red-700 text-white border-none"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-6">
        <span className="inline-block w-8 h-1 bg-[#EF3866] dark:bg-[#ff7a9c]"></span>
        <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-white flex items-center">
          <MessageSquare size={20} className="mr-2" /> 
          Discussion
        </h3>
      </div>
      
      {/* Comment stats */}
      <div className="flex items-center justify-between mb-6 px-2">
        <p className="text-gray-600 dark:text-gray-400">
          <span className="font-medium text-gray-900 dark:text-white">{comments.length}</span> comments in this discussion
        </p>
        <div className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300">
          Sort by latest
        </div>
      </div>
      
      {/* Comment input */}
      {user ? (
        <div className="mb-8 bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            {user.imageUrl ? (
              <div className="relative h-10 w-10">
                <Image 
                  src={user.imageUrl} 
                  alt={user.fullName || "User"} 
                  width={40} 
                  height={40}
                  className="rounded-full object-cover border-2 border-[#EF3866] dark:border-[#ff7a9c]" 
                />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#EF3866] to-pink-400 flex items-center justify-center text-white font-medium">
                {user.firstName?.charAt(0) || "U"}
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{user.fullName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as {user.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          
          <div className="relative">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts on this article..."
              rows={3}
              className="w-full border-2 dark:border-gray-700 rounded-xl focus:border-[#EF3866] dark:focus:border-[#ff7a9c] focus:ring-1 focus:ring-[#EF3866] dark:focus:ring-[#ff7a9c] transition-colors p-4 resize-none bg-gray-50 dark:bg-gray-900"
            />
            
            <div className="flex justify-end mt-3">
              <Button 
                onClick={handleSubmit} 
                disabled={loading || !newComment.trim()}
                className={`bg-gradient-to-r from-[#EF3866] to-[#F06292] text-white px-5 py-2 rounded-full hover:brightness-110 transition flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Post Comment</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl text-center border border-dashed border-gray-300 dark:border-gray-700">
          <User size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-gray-700 dark:text-gray-300">Sign in to join the discussion and leave a comment.</p>
        </div>
      )}

      {/* Display comments */}
      {comments.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/30 p-10 rounded-xl text-center border border-dashed border-gray-200 dark:border-gray-700">
          <MessageSquare size={40} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-700 dark:text-gray-300 font-serif text-lg">No comments yet.</p>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Be the first to share your thoughts on this article!</p>
        </div>
      ) : (
        <ul className="space-y-6">
          {comments.map((comment) => (
            <li key={comment.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all hover:shadow-lg border border-gray-100 dark:border-gray-700">
              {/* Comment header with user info */}
              <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#EF3866] to-pink-400 flex items-center justify-center text-white font-bold">
                    {getInitials(comment.user_first_name, comment.user_last_name)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {`${comment.user_first_name} ${comment.user_last_name}`}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatTimeAgo(comment.created_at)} ago</span>
                      <span className="inline-block h-1 w-1 rounded-full bg-gray-400 mx-2"></span>
                      <span>Reader</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Comment body */}
              <div className="p-4 md:p-6">
                <p className="text-gray-800 dark:text-gray-200 font-serif leading-relaxed">
                  {comment.comment}
                </p>
              </div>
              
              {/* Comment footer with reactions */}
              <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                <div className="flex gap-4">
                  <button
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                      comment.userReaction === 'like' 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                    onClick={() => handleReaction(comment.id, "like")}
                    disabled={submittingReaction === comment.id}
                    aria-label="Like comment"
                  >
                    <ThumbsUp size={16} className={comment.userReaction === 'like' ? "fill-current" : ""} />
                    <span className="text-sm font-medium">{comment.likes || 0}</span>
                  </button>
                  
                  <button
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                      comment.userReaction === 'dislike'
                        ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                    onClick={() => handleReaction(comment.id, "dislike")}
                    disabled={submittingReaction === comment.id}
                    aria-label="Dislike comment"
                  >
                    <ThumbsDown size={16} className={comment.userReaction === 'dislike' ? "fill-current" : ""} />
                    <span className="text-sm font-medium">{comment.dislikes || 0}</span>
                  </button>
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {submittingReaction === comment.id && (
                    <span className="flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      Processing...
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      
      {/* Load more comments button (if needed) */}
      {comments.length > 5 && (
        <div className="mt-8 text-center">
          <button className="inline-flex items-center gap-2 text-[#EF3866] dark:text-[#ff7a9c] font-medium hover:underline">
            Load more comments
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}