// hooks/useUserActivity.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { UserActivity, ActivityType, ActivityCategory } from '@/types/notifications';
import { notificationService } from '@/lib/notificationService';

interface UseUserActivityOptions {
  userId?: string;
  limit?: number;
  autoFetch?: boolean;
  category?: ActivityCategory;
  type?: ActivityType;
}

interface UseUserActivityReturn {
  activities: UserActivity[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  fetchActivities: (reset?: boolean) => Promise<void>;
  addActivity: (activity: Omit<UserActivity, 'id' | 'timestamp'>) => Promise<void>;
  refreshActivities: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export const useUserActivity = (options: UseUserActivityOptions = {}): UseUserActivityReturn => {
  const { userId: currentUserId } = useAuth();
  const {
    userId,
    limit = 20,
    autoFetch = true,
    category,
    type
  } = options;

  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const targetUserId = userId || currentUserId;

  const fetchActivities = useCallback(async (reset = false) => {
    if (!targetUserId) return;

    try {
      setLoading(true);
      setError(null);

      const newOffset = reset ? 0 : offset;
      const newActivities = await notificationService.getUserActivityFeed(
        targetUserId,
        limit,
        newOffset
      );

      if (reset) {
        setActivities(newActivities);
        setOffset(limit);
      } else {
        setActivities(prev => [...prev, ...newActivities]);
        setOffset(prev => prev + limit);
      }

      setHasMore(newActivities.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
      console.error('Error fetching user activities:', err);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, limit, offset]);

  const addActivity = useCallback(async (activity: Omit<UserActivity, 'id' | 'timestamp'>) => {
    try {
      const newActivity = await notificationService.createUserActivity(activity);
      setActivities(prev => [newActivity, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add activity');
      console.error('Error adding user activity:', err);
    }
  }, []);

  const refreshActivities = useCallback(async () => {
    await fetchActivities(true);
  }, [fetchActivities]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchActivities(false);
    }
  }, [loading, hasMore, fetchActivities]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch && targetUserId) {
      fetchActivities(true);
    }
  }, [targetUserId, autoFetch, fetchActivities]);

  // Filter activities based on category and type
  const filteredActivities = activities.filter(activity => {
    if (category && activity.category !== category) {
      return false;
    }
    if (type && activity.type !== type) {
      return false;
    }
    return true;
  });

  return {
    activities: filteredActivities,
    loading,
    error,
    hasMore,
    fetchActivities,
    addActivity,
    refreshActivities,
    loadMore
  };
};

// Specialized hooks for different activity types
export const useUserContentActivity = (userId?: string) => {
  return useUserActivity({ userId, category: 'content' });
};

export const useUserSocialActivity = (userId?: string) => {
  return useUserActivity({ userId, category: 'social' });
};

export const useUserAchievementActivity = (userId?: string) => {
  return useUserActivity({ userId, category: 'achievement' });
};

export const useUserSystemActivity = (userId?: string) => {
  return useUserActivity({ userId, category: 'system' });
};

// Hook for tracking specific activity types
export const useActivityTracker = () => {
  const { addActivity } = useUserActivity({ autoFetch: false });

  const trackPostCreated = useCallback(async (
    userId: string,
    postId: string,
    postTitle: string
  ) => {
    await addActivity({
      user_id: userId,
      type: 'post_created',
      title: 'Post Created',
      description: `You created a new post: "${postTitle}"`,
      category: 'content',
      visibility: 'public',
      data: { post_id: postId, post_title: postTitle }
    });
  }, [addActivity]);

  const trackPostLiked = useCallback(async (
    userId: string,
    postId: string,
    postTitle: string
  ) => {
    await addActivity({
      user_id: userId,
      type: 'post_liked',
      title: 'Post Liked',
      description: `You liked a post: "${postTitle}"`,
      category: 'content',
      visibility: 'public',
      data: { post_id: postId, post_title: postTitle }
    });
  }, [addActivity]);

  const trackPostCommented = useCallback(async (
    userId: string,
    postId: string,
    postTitle: string,
    commentContent: string
  ) => {
    await addActivity({
      user_id: userId,
      type: 'post_commented',
      title: 'Comment Added',
      description: `You commented on: "${postTitle}"`,
      category: 'content',
      visibility: 'public',
      data: { 
        post_id: postId, 
        post_title: postTitle,
        comment_preview: commentContent.substring(0, 100)
      }
    });
  }, [addActivity]);

  const trackUserFollowed = useCallback(async (
    userId: string,
    followedUserId: string,
    followedUserName: string
  ) => {
    await addActivity({
      user_id: userId,
      type: 'user_followed',
      title: 'User Followed',
      description: `You started following ${followedUserName}`,
      category: 'social',
      visibility: 'public',
      data: { 
        followed_user_id: followedUserId, 
        followed_user_name: followedUserName 
      }
    });
  }, [addActivity]);

  const trackUserUnfollowed = useCallback(async (
    userId: string,
    unfollowedUserId: string,
    unfollowedUserName: string
  ) => {
    await addActivity({
      user_id: userId,
      type: 'user_unfollowed',
      title: 'User Unfollowed',
      description: `You unfollowed ${unfollowedUserName}`,
      category: 'social',
      visibility: 'private',
      data: { 
        unfollowed_user_id: unfollowedUserId, 
        unfollowed_user_name: unfollowedUserName 
      }
    });
  }, [addActivity]);

  const trackLogin = useCallback(async (
    userId: string,
    deviceInfo: string,
    location?: string
  ) => {
    await addActivity({
      user_id: userId,
      type: 'login',
      title: 'Login',
      description: `You logged in from ${deviceInfo}${location ? ` in ${location}` : ''}`,
      category: 'system',
      visibility: 'private',
      data: { device_info: deviceInfo, location }
    });
  }, [addActivity]);

  const trackAchievement = useCallback(async (
    userId: string,
    achievementType: string,
    achievementTitle: string,
    achievementDescription: string
  ) => {
    await addActivity({
      user_id: userId,
      type: 'achievement_earned',
      title: 'Achievement Earned',
      description: `You earned: ${achievementTitle}`,
      category: 'achievement',
      visibility: 'public',
      data: { 
        achievement_type: achievementType,
        achievement_title: achievementTitle,
        achievement_description: achievementDescription
      }
    });
  }, [addActivity]);

  const trackMilestone = useCallback(async (
    userId: string,
    milestoneType: string,
    milestoneTitle: string,
    milestoneDescription: string
  ) => {
    await addActivity({
      user_id: userId,
      type: 'milestone_reached',
      title: 'Milestone Reached',
      description: `You reached: ${milestoneTitle}`,
      category: 'achievement',
      visibility: 'public',
      data: { 
        milestone_type: milestoneType,
        milestone_title: milestoneTitle,
        milestone_description: milestoneDescription
      }
    });
  }, [addActivity]);

  const trackVerificationSubmitted = useCallback(async (
    userId: string,
    verificationId: string,
    verificationTitle: string
  ) => {
    await addActivity({
      user_id: userId,
      type: 'verification_submitted',
      title: 'Verification Submitted',
      description: `You submitted: "${verificationTitle}" for verification`,
      category: 'content',
      visibility: 'public',
      data: { 
        verification_id: verificationId,
        verification_title: verificationTitle
      }
    });
  }, [addActivity]);

  const trackVerificationApproved = useCallback(async (
    userId: string,
    verificationId: string,
    verificationTitle: string
  ) => {
    await addActivity({
      user_id: userId,
      type: 'verification_approved',
      title: 'Verification Approved',
      description: `Your verification "${verificationTitle}" was approved!`,
      category: 'achievement',
      visibility: 'public',
      data: { 
        verification_id: verificationId,
        verification_title: verificationTitle
      }
    });
  }, [addActivity]);

  return {
    trackPostCreated,
    trackPostLiked,
    trackPostCommented,
    trackUserFollowed,
    trackUserUnfollowed,
    trackLogin,
    trackAchievement,
    trackMilestone,
    trackVerificationSubmitted,
    trackVerificationApproved
  };
}; 