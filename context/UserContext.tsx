// contexts/UserContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  imageUrl?: string;
  email?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

interface UserContextType {
  users: Map<string, UserProfile>;
  getUser: (userId: string) => UserProfile | null;
  getUserImageUrl: (userId: string) => string;
  getUserDisplayName: (userId: string) => string;
  refreshUser: (userId: string) => Promise<void>;
  refreshUsers: (userIds: string[]) => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUsers = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUsers must be used within UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch user data from your backend/database
  const fetchUserData = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      // Replace this with your actual API call to fetch user data
      // This could be a call to your backend API or Supabase query
      const { data, error } = await supabase
        .from('users') // Assuming you have a users table
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.warn(`User data not found for ${userId}`);
        return null;
      }

      return {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        username: data.username,
        imageUrl: data.image_url,
        email: data.email,
        isOnline: data.is_online,
        lastSeen: data.last_seen,
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }, [supabase]);

  // Fetch multiple users at once
  const fetchMultipleUsers = useCallback(async (userIds: string[]): Promise<UserProfile[]> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds);

      if (error || !data) {
        console.warn('Error fetching multiple users:', error);
        return [];
      }

      return data.map(user => ({
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        imageUrl: user.image_url,
        email: user.email,
        isOnline: user.is_online,
        lastSeen: user.last_seen,
      }));
    } catch (error) {
      console.error('Error fetching multiple users:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const getUser = useCallback((userId: string): UserProfile | null => {
    return users.get(userId) || null;
  }, [users]);

  const getUserImageUrl = useCallback((userId: string): string => {
    const user = users.get(userId);
    return user?.imageUrl || '/default-avatar.svg';
  }, [users]);

  const getUserDisplayName = useCallback((userId: string): string => {
    const user = users.get(userId);
    if (!user) return 'Unknown User';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    return user.username || user.firstName || 'Unknown User';
  }, [users]);

  const refreshUser = useCallback(async (userId: string) => {
    const userData = await fetchUserData(userId);
    if (userData) {
      setUsers(prev => new Map(prev).set(userId, userData));
    }
  }, [fetchUserData]);

  const refreshUsers = useCallback(async (userIds: string[]) => {
    // Filter out users we already have to avoid unnecessary API calls
    const missingUserIds = userIds.filter(id => !users.has(id));
    
    if (missingUserIds.length === 0) return;

    const usersData = await fetchMultipleUsers(missingUserIds);
    
    setUsers(prev => {
      const newMap = new Map(prev);
      usersData.forEach(user => {
        newMap.set(user.id, user);
      });
      return newMap;
    });
  }, [users, fetchMultipleUsers]);

  // Subscribe to user updates (online status, profile changes, etc.)
  useEffect(() => {
    const channel = supabase
      .channel('users')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
        },
        (payload) => {
          const updatedUser = payload.new as any;
          if (updatedUser) {
            const userProfile: UserProfile = {
              id: updatedUser.id,
              firstName: updatedUser.first_name,
              lastName: updatedUser.last_name,
              username: updatedUser.username,
              imageUrl: updatedUser.image_url,
              email: updatedUser.email,
              isOnline: updatedUser.is_online,
              lastSeen: updatedUser.last_seen,
            };
            
            setUsers(prev => new Map(prev).set(updatedUser.id, userProfile));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase]);

  const value: UserContextType = {
    users,
    getUser,
    getUserImageUrl,
    getUserDisplayName,
    refreshUser,
    refreshUsers,
    isLoading,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
