"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import toast from "react-hot-toast";

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

  const fetchComments = async () => {
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
  };

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

  if (isLoading) {
    return (
      <div className="mt-10">
        <h3 className="text-xl font-semibold mb-4">Comments</h3>
        <div className="flex justify-center py-10">
          <div className="animate-pulse space-y-4 w-full">
            <div className="h-12 bg-muted rounded w-1/4"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10">
        <h3 className="text-xl font-semibold mb-4">Comments</h3>
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          <p>Error loading comments: {error}</p>
          <Button onClick={fetchComments} className="mt-2">Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <h3 className="text-xl font-semibold mb-4">Comments</h3>
      
      {/* Comment input */}
      {user && (
        <div className="mb-6 space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
          />
          <Button onClick={handleSubmit} disabled={loading || !newComment.trim()}>
            {loading ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      )}

      {/* Display comments */}
      {comments.length === 0 ? (
        <p className="text-gray-500">No comments yet. Be the first to leave a comment!</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="p-4 bg-muted rounded-xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold">{`${comment.user_first_name} ${comment.user_last_name}`}</span>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at))} ago
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    className={`flex items-center space-x-1 ${comment.userReaction === 'like' ? 'text-blue-600' : ''}`}
                    onClick={() => handleReaction(comment.id, "like")}
                    disabled={submittingReaction === comment.id}
                    aria-label="Like comment"
                  >
                    <ThumbsUp size={16} />
                    <span>{comment.likes || 0}</span>
                  </button>
                  <button
                    className={`flex items-center space-x-1 ${comment.userReaction === 'dislike' ? 'text-red-600' : ''}`}
                    onClick={() => handleReaction(comment.id, "dislike")}
                    disabled={submittingReaction === comment.id}
                    aria-label="Dislike comment"
                  >
                    <ThumbsDown size={16} />
                    <span>{comment.dislikes || 0}</span>
                  </button>
                </div>
              </div>
              <p className="mt-3 text-base">{comment.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}