'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import { X, User, UserPlus, UserMinus, Verified, Loader2 } from 'lucide-react';
import { FollowUser } from '@/types/user';
import { useRouter } from 'next/navigation';

interface FollowModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: FollowUser[];
  currentUserId?: string;
  onFollow: (userId: string, isFollowing: boolean) => void;
}

export const FollowModal: React.FC<FollowModalProps> = ({
  isOpen,
  onClose,
  title,
  users,
  currentUserId,
  onFollow
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  const [followOperations, setFollowOperations] = useState<Set<string>>(new Set());
  const [isLoadingFollowStatus, setIsLoadingFollowStatus] = useState(false);

  useEffect(() => {
    if (isOpen && modalRef.current && contentRef.current) {
      gsap.set(modalRef.current, { opacity: 0 });
      gsap.set(contentRef.current, { scale: 0.9, opacity: 0, y: 20 });

      const tl = gsap.timeline();
      tl.to(modalRef.current, { opacity: 1, duration: 0.4 })
        .to(contentRef.current, {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "back.out(1.2)"
        }, "-=0.2");
    }
  }, [isOpen]);

  const handleClose = () => {
    if (modalRef.current && contentRef.current) {
      const tl = gsap.timeline();
      tl.to(contentRef.current, {
        scale: 0.9,
        opacity: 0,
        y: 20,
        duration: 0.3
      })
        .to(modalRef.current, {
          opacity: 0,
          duration: 0.2
        }, "-=0.1")
        .call(() => onClose());
    }
  };

  const handleUserClick = (userId: string) => {
    router.push(`/user/${userId}`);
    onClose();
  };

  const handleFollow = async (userId: string) => {
    if (followOperations.has(userId)) return;

    const isCurrentlyFollowing = followingStates[userId] || false;
    setFollowOperations(prev => new Set(prev).add(userId));

    try {
      // Optimistically update UI
      setFollowingStates(prev => ({
        ...prev,
        [userId]: !isCurrentlyFollowing
      }));

      await onFollow(userId, isCurrentlyFollowing);
    } catch {
      // Revert on error
      setFollowingStates(prev => ({
        ...prev,
        [userId]: isCurrentlyFollowing
      }));
    } finally {
      setFollowOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Check follow status when modal opens
  useEffect(() => {
    if (isOpen && currentUserId && users.length > 0) {
      checkFollowStatus();
    }
  }, [isOpen, users, currentUserId]);

  const checkFollowStatus = async () => {
    if (!currentUserId) return;

    setIsLoadingFollowStatus(true);

    try {
      const followStatus: Record<string, boolean> = {};

      await Promise.all(
        users.map(async (user) => {
          if (user.id !== currentUserId) {
            try {
              const response = await fetch(`/api/follow/check?userId=${user.id}`);
              if (response.ok) {
                const data = await response.json();
                followStatus[user.id] = data.isFollowing;
              }
            } catch (error) {
              console.error(`Error checking follow status for user ${user.id}:`, error);
              followStatus[user.id] = false; // Default to not following on error
            }
          }
        })
      );

      setFollowingStates(followStatus);
      setIsLoadingFollowStatus(false);
      setHasLoadedOnce(true);

    } catch (error) {
      console.error('Error checking follow status:', error);
    } finally {
      setIsLoadingFollowStatus(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        ref={contentRef}
        className="bg-white/70 dark:bg-black/70 backdrop-blur-md rounded-2xl border border-gray-200/50 dark:border-gray-800/50 w-full max-w-lg max-h-[85vh] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle gradient background */}
        <div className="h-16 bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-900/30 dark:to-gray-800/30"></div>

        {/* Header */}
        <div className="px-8 pb-6 -mt-8 relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-light text-gray-900 dark:text-white tracking-tight mb-2">
                {title}
              </h2>
              <div className="w-12 h-0.5 bg-[#EF3866]"></div>
            </div>
            <button
              onClick={handleClose}
              className="p-2.5 hover:bg-white/50 dark:hover:bg-black/50 rounded-xl transition-all duration-300 hover:scale-105"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {/* Loading State */}
            {isLoadingFollowStatus && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="font-light">Loading follow status...</span>
                </div>
              </div>
            )}

            {/* Users List */}
            {!isLoadingFollowStatus && users.length > 0 && (
              <div className="space-y-3">
                {users.map((user, index) => {
                  const isFollowing = followingStates[user.id] || false;
                  const isOperationInProgress = followOperations.has(user.id);

                  return (
                    <div
                      key={user.id}
                      className="group flex items-center justify-between p-4 hover:bg-white/40 dark:hover:bg-black/40 rounded-xl transition-all duration-300 hover:shadow-sm"
                      style={{
                        animationDelay: `${index * 50}ms`
                      }}
                    >
                      <div
                        className="flex items-center gap-4 cursor-pointer flex-1 group-hover:scale-[1.02] transition-transform duration-300"
                        onClick={() => handleUserClick(user.id)}
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="w-16 h-16 bg-gradient-to-br from-[#EF3866] to-gray-700 rounded-2xl overflow-hidden border-2 border-white dark:border-black shadow-lg hover:shadow-xl transition-all duration-300">
                            {user.image_url ? (
                              <Image
                                src={user.image_url}
                                alt={`${user.first_name} ${user.last_name}`}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                                unoptimized // Add this to handle external URLs better
                                onError={(e) => {
                                  // Fallback to default avatar if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) {
                                    fallback.classList.remove('hidden');
                                  }
                                }}
                              />
                            ) : null}

                            {/* Fallback avatar - shown when no image_url or image fails to load */}
                            <div className={`w-full h-full flex items-center justify-center ${user.image_url ? 'hidden' : ''}`}>
                              <User size={24} className="text-white" />
                            </div>
                          </div>

                          {/* Role Badge */}
                          {user.role === 'author' && (
                            <div className="absolute -bottom-1 -right-1">
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shadow-lg bg-[#EF3866] text-white">
                                <Verified size={12} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-light text-lg text-gray-900 dark:text-white truncate tracking-tight">
                              {user.first_name} {user.last_name}
                            </h3>
                          </div>
                          {user.username && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
                              @{user.username}
                            </p>
                          )}
                          {user.bio && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs font-light leading-relaxed">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Follow Button */}
                      {currentUserId && currentUserId !== user.id && (
                        <button
                          onClick={() => handleFollow(user.id)}
                          disabled={isOperationInProgress}
                          className={`group inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 transform hover:scale-105 ${isFollowing
                            ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 hover:shadow-lg'
                            : 'border border-[#EF3866] bg-[#EF3866] text-white hover:bg-[#d7325a] hover:shadow-lg'
                            } ${isOperationInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isOperationInProgress ? (
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-current border-t-transparent"></div>
                          ) : isFollowing ? (
                            <>
                              <UserMinus size={16} />
                              <span>Unfollow</span>
                            </>
                          ) : (
                            <>
                              <UserPlus size={16} />
                              <span>Follow</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {hasLoadedOnce && users.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  <User size={28} className="text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-center font-light text-lg">
                  No users found
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};