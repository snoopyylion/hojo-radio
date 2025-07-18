// components/Dashboard/FollowersFollowingSection.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, UserMinus, X } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import Image from 'next/image';

interface FollowUser {
  id: string;
  first_name: string;
  last_name: string;
  username?: string;
  image_url?: string;
  role: 'user' | 'author';
  followed_at: string;
  is_following_back?: boolean;
}

interface FollowersFollowingSectionProps {
  className?: string;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  isModal?: boolean;
  onClose?: () => void;
  initialTab?: 'followers' | 'following';
  targetUserId?: string; // Add this prop to specify which user's followers/following to show
}

export const FollowersFollowingSection: React.FC<FollowersFollowingSectionProps> = ({ 
  className = '', 
  onFollowersClick,
  onFollowingClick,
  isModal = false,
  onClose,
  initialTab = 'followers',
  targetUserId // New prop
}) => {
  const { user } = useAppContext();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [followOperations, setFollowOperations] = useState<Set<string>>(new Set());

  // Use targetUserId if provided, otherwise use current user's ID
  const displayUserId = targetUserId || user?.id;

  

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const checkFollowBackStatus = useCallback(async (users: FollowUser[]) => {
    if (!user?.id || users.length === 0) return users;

    try {
      const userIds = users.map(u => u.id);
      
      const response = await fetch('/api/follow/check-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_ids: userIds,
          check_type: 'am_following'
        })
      });

      if (!response.ok) {
        console.error('Failed to check follow status');
        return users;
      }

      const followStatusData = await response.json();
      
      return users.map(followUser => ({
        ...followUser,
        is_following_back: followStatusData.statuses[followUser.id] || false
      }));
    } catch (error) {
      console.error('Error checking follow back status:', error);
      return users;
    }
  }, [user?.id]);

  const checkFollowingStatus = useCallback(async (users: FollowUser[]) => {
    if (!user?.id || users.length === 0) return users;

    try {
      // For following list, check if they are following the current user back
      const followingStatusPromises = users.map(async (followedUser) => {
        const response = await fetch(`/api/follow/check?userId=${followedUser.id}`);
        if (response.ok) {
          await response.json();
          return {
            ...followedUser,
            is_following_back: true // Current user is following them
          };
        }
        return {
          ...followedUser,
          is_following_back: true // Current user is following them
        };
      });

      return await Promise.all(followingStatusPromises);
    } catch (error) {
      console.error('Error checking following status:', error);
      return users.map(user => ({ ...user, is_following_back: true }));
    }
  }, [user?.id]);
  
  const fetchFollowersAndFollowing = useCallback(async () => {
    if (!displayUserId) return;

    setLoading(true);
    try {
      const [followersResponse, followingResponse] = await Promise.all([
        fetch(`/api/follow?type=followers&userId=${displayUserId}`),
        fetch(`/api/follow?type=following&userId=${displayUserId}`)
      ]);

      if (!followersResponse.ok || !followingResponse.ok) {
        throw new Error('Failed to fetch follow data');
      }

      const followersData = await followersResponse.json();
      const followingData = await followingResponse.json();

      // Only check follow status if we're the current user viewing our own profile
      // or if we're viewing someone else's profile (to see if we follow them back)
      const followersWithStatus = await checkFollowBackStatus(followersData.users);
      const followingWithStatus = await checkFollowingStatus(followingData.users);

      setFollowers(followersWithStatus);
      setFollowing(followingWithStatus);
    } catch (error) {
      console.error('Error fetching followers/following:', error);
    } finally {
      setLoading(false);
    }
  }, [displayUserId, checkFollowBackStatus, checkFollowingStatus]);

  const handleFollowToggle = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    if (!user?.id || followOperations.has(targetUserId)) return;

    setFollowOperations(prev => new Set(prev).add(targetUserId));

    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isCurrentlyFollowing ? 'unfollow' : 'follow',
          following_id: targetUserId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update follow status');
      }

      if (data.success) {
        if (activeTab === 'followers') {
          setFollowers(prev => prev.map(follower => 
            follower.id === targetUserId 
              ? { ...follower, is_following_back: !isCurrentlyFollowing }
              : follower
          ));
        } else {
          // For following tab, if we unfollow, remove from the list
          if (isCurrentlyFollowing) {
            setFollowing(prev => prev.filter(followedUser => followedUser.id !== targetUserId));
          }
        }
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      alert('Failed to update follow status. Please try again.');
    } finally {
      setFollowOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  const handleUserClick = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const renderUserCard = (followUser: FollowUser) => {
    const isOperationInProgress = followOperations.has(followUser.id);
    const isCurrentUser = user?.id === followUser.id;
    const isViewingOwnProfile = user?.id === displayUserId;
    
    return (
      <div key={followUser.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-black/50 rounded-lg transition-colors">
        <div 
          className="flex items-center gap-3 cursor-pointer flex-1"
          onClick={() => handleUserClick(followUser.id)}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#EF3866] to-gray-700 flex-shrink-0">
            {followUser.image_url ? (
              <Image
                src={followUser.image_url}
                alt={`${followUser.first_name} ${followUser.last_name}`}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Users size={16} className="text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 dark:text-white truncate text-sm">
                {followUser.first_name} {followUser.last_name}
              </h3>
              {followUser.role === 'author' && (
                <span className="px-1.5 py-0.5 text-xs bg-[#EF3866] text-white rounded">
                  Author
                </span>
              )}
            </div>
            {followUser.username && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                @{followUser.username}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Show mutual badge only if viewing own profile */}
          {isViewingOwnProfile && activeTab === 'followers' && followUser.is_following_back && (
            <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
              Mutual
            </span>
          )}
          
          {/* Show follow/unfollow buttons only if:
              1. User is logged in
              2. Not viewing own card
              3. Either viewing own profile or viewing someone else's profile */}
          {user?.id && !isCurrentUser && (
            <>
              {((isViewingOwnProfile && activeTab === 'followers' && !followUser.is_following_back) || 
                (isViewingOwnProfile && activeTab === 'following') ||
                (!isViewingOwnProfile)) && (
                <button
                  onClick={() => handleFollowToggle(followUser.id, followUser.is_following_back || false)}
                  disabled={isOperationInProgress}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    followUser.is_following_back
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      : 'bg-[#EF3866] text-white hover:bg-[#d7325a]'
                  } ${isOperationInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isOperationInProgress ? (
                    <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
                  ) : followUser.is_following_back ? (
                    <>
                      <UserMinus size={12} />
                      <span>Unfollow</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={12} />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (displayUserId) {
      fetchFollowersAndFollowing();
    }
  }, [displayUserId, fetchFollowersAndFollowing]);

  if (!displayUserId) {
    return null;
  }

  // If this is just for stats display (not modal)
  if (!isModal) {
    return (
      <div className={`bg-white dark:bg-black rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Network</h3>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            onClick={onFollowersClick}
            className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex-1"
          >
            <span className="text-lg font-bold text-gray-900 dark:text-white font-sora">
              {loading ? '...' : followers.length}
            </span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 font-sora transition-colors">Followers</span>
          </button>
          
          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
          
          <button
            onClick={onFollowingClick}
            className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex-1"
          >
            <span className="text-lg font-bold text-gray-900 dark:text-white font-sora">
              {loading ? '...' : following.length}
            </span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 font-sora transition-colors">Following</span>
          </button>
        </div>
      </div>
    );
  }

  const currentData = activeTab === 'followers' ? followers : following;
  const isViewingOwnProfile = user?.id === displayUserId;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-black rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isViewingOwnProfile ? 'Your Network' : 'Network'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-gray-100 dark:bg-black rounded-lg m-4 mb-2 p-1">
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'followers'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Followers ({followers.length})
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'following'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Following ({following.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 pb-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                  <div className="flex-1">
                    <div className="w-24 h-3 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="w-16 h-2 bg-gray-300 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : currentData.length === 0 ? (
            <div className="text-center py-8">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {activeTab === 'followers' 
                  ? (isViewingOwnProfile ? "You don't have any followers yet." : "This user doesn't have any followers yet.")
                  : (isViewingOwnProfile ? "You're not following anyone yet." : "This user isn't following anyone yet.")
                }
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-full">
              {currentData.map(renderUserCard)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};