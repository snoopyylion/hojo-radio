// hooks/likes/useUserLikes.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface UserLikesData {
  totalLikes: number;
  recentLikes: Array<{
    post_id: string;
    created_at: string;
  }>;
}

export function useUserLikes() {
  const [userLikesData, setUserLikesData] = useState<UserLikesData>({
    totalLikes: 0,
    recentLikes: []
  });
  const [loading, setLoading] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();

  // Fetch user's total likes
  useEffect(() => {
    if (!isSignedIn || !isLoaded) return;

    const fetchUserLikes = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/post/user-likes');
        if (response.ok) {
          const data = await response.json();
          setUserLikesData(data);
        } else {
          console.error('Failed to fetch user likes:', response.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch user likes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserLikes();
  }, [isSignedIn, isLoaded]);

  // Function to refresh user likes (call this after liking/unliking a post)
  const refreshUserLikes = async () => {
    if (!isSignedIn) return;

    try {
      const response = await fetch('/api/post/user-likes/');
      if (response.ok) {
        const data = await response.json();
        setUserLikesData(data);
      }
    } catch (error) {
      console.error('Failed to refresh user likes:', error);
    }
  };

  return {
    totalLikes: userLikesData.totalLikes,
    recentLikes: userLikesData.recentLikes,
    loading,
    refreshUserLikes,
    isSignedIn
  };
}