// hooks/usePostsCount.ts
import { useState, useEffect } from 'react';

export const usePostsCount = (userId: string | undefined, userRole: string) => {
  const [postsCount, setPostsCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPostsCount = async () => {
    if (!userId || userRole !== 'author') {
      setPostsCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/post/by-author', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ authorId: userId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.statusText}`);
      }

      const data = await response.json();
      setPostsCount(data.length);
    } catch (err) {
      console.error('Error fetching posts count:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch posts count');
      setPostsCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostsCount();
  }, [userId, userRole]);

  return {
    postsCount,
    loading,
    error,
    refetch: fetchPostsCount
  };
};