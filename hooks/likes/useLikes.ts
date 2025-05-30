// hooks/likes/useLikes.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface LikeData {
  likeCount: number;
  hasLiked: boolean;
}

export function useLikes(postId: string) {
  const [likeData, setLikeData] = useState<LikeData>({ likeCount: 0, hasLiked: false });
  const [loading, setLoading] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();

  // Fetch initial like status
  useEffect(() => {
    if (!postId || !isLoaded) return;

    const fetchLikeStatus = async () => {
      try {
        const response = await fetch(`/api/post/${postId}/like`);
        if (response.ok) {
          const data = await response.json();
          setLikeData(data);
        }
      } catch (error) {
        console.error('Failed to fetch like status:', error);
      }
    };

    fetchLikeStatus();
  }, [postId, isLoaded]);

  const toggleLike = async () => {
    if (loading) return;
    
    // Check if user is signed in
    if (!isSignedIn) {
      alert('Please sign in to like posts');
      return;
    }

    setLoading(true);

    // Store current state for potential rollback
    const previousState = { ...likeData };

    // Optimistic update
    const optimisticUpdate = {
      likeCount: likeData.hasLiked ? likeData.likeCount - 1 : likeData.likeCount + 1,
      hasLiked: !likeData.hasLiked
    };
    setLikeData(optimisticUpdate);

    try {
      const response = await fetch(`/api/post/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        setLikeData({
          likeCount: data.likeCount,
          hasLiked: data.liked
        });
      } else {
        // Revert optimistic update on error
        setLikeData(previousState);

        const errorData = await response.json();
        console.error('Failed to toggle like:', {
          status: response.status,
          error: errorData.error
        });

        // Show user-friendly error messages
        if (response.status === 401) {
          alert('Please sign in to like posts');
        } else if (response.status === 503) {
          alert('Temporary network issue. Please try again in a moment.');
        } else {
          alert('Failed to update like. Please try again.');
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Revert optimistic update on error
      setLikeData(previousState);

      if (error instanceof DOMException && error.name === 'AbortError') {
        alert('Request timed out. Please check your connection and try again.');
      } else {
        alert('Unable to connect. Please check your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    likeCount: likeData.likeCount,
    hasLiked: likeData.hasLiked,
    toggleLike,
    loading,
    isSignedIn
  };
}