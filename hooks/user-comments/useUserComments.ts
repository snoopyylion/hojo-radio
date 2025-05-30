// hooks/user-comments/useUserComments.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface UserComment {
  id: string;
  user_id: string;
  post_id: string;
  comment: string;
  created_at: string;
  post_title?: string;
}

interface CommentStats {
  totalComments: number;
  commentsThisMonth: number;
  commentsToday: number;
  recentComments: UserComment[];
}

export const useUserComments = () => {
  const [commentStats, setCommentStats] = useState<CommentStats>({
    totalComments: 0,
    commentsThisMonth: 0,
    commentsToday: 0,
    recentComments: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken, isLoaded, userId } = useAuth();

  const fetchCommentStats = async () => {
    if (!isLoaded || !userId) {
      console.log("🔄 Hook Debug - Not ready:", { isLoaded, userId });
      return;
    }

    try {
    console.log("🔄 Hook Debug - Fetching comments for user:", userId);
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      console.log("🔑 Hook Debug - Token obtained:", !!token);
      const response = await fetch('/api/user/comments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log("📡 Hook Debug - Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("📡 Hook Debug - Response error:", errorText);
        throw new Error(`Failed to fetch comment stats: ${response.status}`);
      }

      const data: CommentStats = await response.json();
      console.log("📊 Hook Debug - Received data:", data);
      setCommentStats(data);
    } catch (err) {
      console.error('Error fetching comment stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommentStats();
  }, [isLoaded, userId]);

  const refetch = () => {
    fetchCommentStats();
  };

  return {
    ...commentStats,
    loading,
    error,
    refetch: fetchCommentStats
  };
};