// hooks/usePostView.ts
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

interface PostStats {
  totalViews: number;
  uniqueViewers: number;
  weeklyViews: number;
}

export const usePostView = (postId: string) => {
  const { isSignedIn } = useAuth();
  const [stats, setStats] = useState<PostStats | null>(null);

  useEffect(() => {
    if (!isSignedIn || !postId) return;

    const recordView = async () => {
      try {
        await fetch(`/api/post/${postId}/view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Failed to record post view:', error);
      }
    };

    // Record view after 3 seconds to ensure it's a meaningful view
    const timer = setTimeout(recordView, 3000);

    return () => clearTimeout(timer);
  }, [postId, isSignedIn]);

  // Fetch post stats
  useEffect(() => {
    if (!postId) return;

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/post/${postId}/stats`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch post stats:', error);
      }
    };

    fetchStats();
  }, [postId]);

  return stats;
};

// Example usage in a Post component