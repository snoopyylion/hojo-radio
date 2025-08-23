// hooks/usePostView.ts
import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export const usePostView = (postId: string) => {
  const { isSignedIn } = useAuth();

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
};

// Example usage in a Post component