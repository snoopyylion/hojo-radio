// hooks/useUserProfile.ts
'use client';

import { useEffect } from 'react';
import { useUsers } from '../context/UserContext';

/**
 * Custom hook to automatically fetch and cache user profiles
 * @param userIds - Array of user IDs to fetch
 * @returns Object with user utilities
 */
export const useUserProfiles = (userIds: string[]) => {
  const { refreshUsers, getUser, getUserImageUrl, getUserDisplayName, isLoading } = useUsers();

  useEffect(() => {
    if (userIds.length > 0) {
      refreshUsers(userIds);
    }
  }, [userIds, refreshUsers]);

  return {
    getUser,
    getUserImageUrl,
    getUserDisplayName,
    isLoading,
  };
};

/**
 * Custom hook for a single user profile
 * @param userId - User ID to fetch
 * @returns Object with user data and utilities
 */
export const useUserProfile = (userId: string) => {
  const { refreshUser, getUser, getUserImageUrl, getUserDisplayName, isLoading } = useUsers();

  useEffect(() => {
    if (userId) {
      refreshUser(userId);
    }
  }, [userId, refreshUser]);

  const user = getUser(userId);

  return {
    user,
    imageUrl: getUserImageUrl(userId),
    displayName: getUserDisplayName(userId),
    isLoading,
  };
};