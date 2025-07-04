// Enhanced FollowersFollowingSection with improved loading states
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, UserMinus, X, Loader2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import Image from 'next/image';

interface FollowUser {
  id: string;
  first_name: string;
  last_name: string;
  username?: string;
  image_url?: string;
  bio?: string;
  role: 'user' | 'author';
  followed_at: string;
  is_following_back?: boolean;
}

interface FollowersFollowingSectionProps {
  userId: string;
  className?: string;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  isModal?: boolean;
  onClose?: () => void;
  initialTab?: 'followers' | 'following';
  showCounts?: boolean;
}

interface FollowStatusResponse {
  statuses: { [userId: string]: boolean };
}

// Request cache to prevent duplicate requests
const requestCache = new Map<string, Promise<FollowStatusResponse>>();

export const FollowersFollowingSection: React.FC<FollowersFollowingSectionProps> = ({
  userId,
  className = '',
  onFollowersClick,
  onFollowingClick,
  isModal = false,
  onClose,
  initialTab = 'followers',
  showCounts = false
}) => {
  const { user: currentUser } = useAppContext();
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [followOperations, setFollowOperations] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Enhanced checkCurrentUserFollowStatus with request deduplication
  const checkCurrentUserFollowStatus = useCallback(async (users: FollowUser[]): Promise<FollowUser[]> => {
  if (!currentUser?.id || users.length === 0) return users;

  const userIds = users.map(u => u.id);
  const cacheKey = `follow-status-${currentUser.id}-${userIds.sort().join(',')}`;

  // Check if we already have a pending request for this
  if (requestCache.has(cacheKey)) {
    try {
      const cachedResult = await requestCache.get(cacheKey)!;
      return users.map(user => ({
        ...user,
        is_following_back: cachedResult.statuses[user.id] || false
      }));
    } catch (error) {
      console.error('Cached request failed:', error);
      return users;
    }
  }

  // Create new request
  const requestPromise = fetch('/api/follow/check-batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_ids: userIds,
      check_type: 'am_following'
    }),
    signal: abortControllerRef.current?.signal
  }).then(async (response): Promise<FollowStatusResponse> => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  });

  // Cache the request
  requestCache.set(cacheKey, requestPromise);

  try {
    const followStatusData = await requestPromise;

    return users.map(user => ({
      ...user,
      is_following_back: followStatusData.statuses[user.id] || false
    }));
  } catch (error) {
    console.error('Error checking follow back status:', error);
    return users; // Return users without follow status
  } finally {
    // Clean up cache after some time
    setTimeout(() => {
      requestCache.delete(cacheKey);
    }, 30000); // Cache for 30 seconds
  }
}, [currentUser?.id]);

  const fetchFollowersAndFollowing = useCallback(async () => {
    if (!userId) return;

    // Cancel any existing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const [followersResponse, followingResponse] = await Promise.all([
        fetch(`/api/follow?type=followers&userId=${userId}`, {
          signal: abortControllerRef.current.signal
        }),
        fetch(`/api/follow?type=following&userId=${userId}`, {
          signal: abortControllerRef.current.signal
        })
      ]);

      if (!followersResponse.ok || !followingResponse.ok) {
        throw new Error('Failed to fetch follow data');
      }

      const followersData = await followersResponse.json();
      const followingData = await followingResponse.json();

      let followersWithStatus = followersData.users;
      let followingWithStatus = followingData.users;

      // Only check follow status if we have a current user and there are users to check
      if (currentUser?.id && (followersData.users.length > 0 || followingData.users.length > 0)) {
        const [followersWithFollowStatus, followingWithFollowStatus] = await Promise.all([
          followersData.users.length > 0 ? checkCurrentUserFollowStatus(followersData.users) : Promise.resolve([]),
          followingData.users.length > 0 ? checkCurrentUserFollowStatus(followingData.users) : Promise.resolve([])
        ]);

        followersWithStatus = followersWithFollowStatus;
        followingWithStatus = followingWithFollowStatus;
      }

      setFollowers(followersWithStatus);
      setFollowing(followingWithStatus);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error fetching followers/following:', error);
      setError('Failed to load followers and following data');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [userId, currentUser?.id, checkCurrentUserFollowStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleFollowToggle = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    if (!currentUser?.id || followOperations.has(targetUserId)) return;

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
        setFollowers(prev => prev.map(follower =>
          follower.id === targetUserId
            ? { ...follower, is_following_back: !isCurrentlyFollowing }
            : follower
        ));
        setFollowing(prev => prev.map(followedUser =>
          followedUser.id === targetUserId
            ? { ...followedUser, is_following_back: !isCurrentlyFollowing }
            : followedUser
        ));
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

  const handleUserClick = (clickedUserId: string) => {
    if (isModal && onClose) {
      onClose();
    }
    router.push(`/user/${clickedUserId}`);
  };

  useEffect(() => {
    if (userId) {
      fetchFollowersAndFollowing();
    }
  }, [userId, fetchFollowersAndFollowing]);

  const renderUserCard = (followUser: FollowUser) => {
    const isOperationInProgress = followOperations.has(followUser.id);
    const isCurrentUser = currentUser?.id === followUser.id;

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
          {isCurrentUser && (
            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
              You
            </span>
          )}

          {!isCurrentUser && currentUser?.id && (
            <button
              onClick={() => handleFollowToggle(followUser.id, followUser.is_following_back || false)}
              disabled={isOperationInProgress}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${followUser.is_following_back
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                : 'bg-[#EF3866] text-white hover:bg-[#d7325a]'
                } ${isOperationInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isOperationInProgress ? (
                <Loader2 size={12} className="animate-spin" />
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
        </div>
      </div>
    );
  };

  const renderLoadingState = () => (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          <div className="flex-1">
            <div className="w-24 h-3 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
            <div className="w-16 h-2 bg-gray-300 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="w-16 h-6 bg-gray-300 dark:bg-gray-700 rounded"></div>
        </div>
      ))}
    </div>
  );

  const renderEmptyState = (type: 'followers' | 'following') => (
    <div className="text-center py-8">
      <Users size={48} className="mx-auto text-gray-400 mb-4" />
      <p className="text-gray-600 dark:text-gray-400 text-sm">
        {type === 'followers'
          ? "No followers yet."
          : "Not following anyone yet."
        }
      </p>
    </div>
  );

  const renderErrorState = () => (
    <div className="text-center py-8">
      <div className="text-red-500 mb-4">
        <X size={48} className="mx-auto" />
      </div>
      <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
      <button
        onClick={fetchFollowersAndFollowing}
        className="px-4 py-2 bg-[#EF3866] text-white rounded-lg text-sm hover:bg-[#d7325a] transition-colors"
      >
        Try Again
      </button>
    </div>
  );

  const renderCountLoader = () => (
    <div className="flex items-center justify-center">
      <Loader2 size={14} className="animate-spin text-gray-400" />
    </div>
  );

  // Show counts view
  if (showCounts && !isModal) {
    return (
      <div className={`bg-white dark:bg-black rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Network</h3>
          {loading && (
            <Loader2 size={16} className="animate-spin text-gray-400" />
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={onFollowersClick}
            className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex-1"
          >
            <span className="text-lg font-bold text-gray-900 dark:text-white font-sora min-h-[28px] flex items-center">
              {initialLoad || loading ? renderCountLoader() : followers.length}
            </span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 font-sora transition-colors">Followers</span>
          </button>

          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>

          <button
            onClick={onFollowingClick}
            className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex-1"
          >
            <span className="text-lg font-bold text-gray-900 dark:text-white font-sora min-h-[28px] flex items-center">
              {initialLoad || loading ? renderCountLoader() : following.length}
            </span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 font-sora transition-colors">Following</span>
          </button>
        </div>
      </div>
    );
  }

  if (!isModal) {
    return null;
  }

  const currentData = activeTab === 'followers' ? followers : following;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-black rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Network
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex bg-gray-100 dark:bg-black rounded-lg m-4 mb-2 p-1">
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'followers'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            Followers ({initialLoad || loading ? (
              <Loader2 className="w-3 h-3 animate-spin inline ml-1" />
            ) : (
              followers.length
            )})
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'following'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            Following ({initialLoad || loading ? (
              <Loader2 className="w-3 h-3 animate-spin inline ml-1" />
            ) : (
              following.length
            )})
          </button>
        </div>

        <div className="flex-1 px-4 pb-4 overflow-y-auto max-h-[60vh]">
          {initialLoad || loading ? (
            renderLoadingState()
          ) : error ? (
            renderErrorState()
          ) : currentData.length === 0 ? (
            renderEmptyState(activeTab)
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