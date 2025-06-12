'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import { X, User, UserPlus, UserMinus } from 'lucide-react';
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
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  const [followOperations, setFollowOperations] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && modalRef.current && contentRef.current) {
      gsap.set(modalRef.current, { opacity: 0 });
      gsap.set(contentRef.current, { scale: 0.9, opacity: 0 });
      
      const tl = gsap.timeline();
      tl.to(modalRef.current, { opacity: 1, duration: 0.3 })
        .to(contentRef.current, { 
          scale: 1, 
          opacity: 1, 
          duration: 0.4, 
          ease: "back.out(1.2)" 
        }, "-=0.1");
    }
  }, [isOpen]);

  const handleClose = () => {
    if (modalRef.current && contentRef.current) {
      const tl = gsap.timeline();
      tl.to(contentRef.current, { 
        scale: 0.9, 
        opacity: 0, 
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
    } catch (error) {
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
    
    try {
      const followStatus: Record<string, boolean> = {};
      
      await Promise.all(
        users.map(async (user) => {
          if (user.id !== currentUserId) {
            const response = await fetch(`/api/follow/check?userId=${user.id}`);
            if (response.ok) {
              const data = await response.json();
              followStatus[user.id] = data.isFollowing;
            }
          }
        })
      );
      
      setFollowingStates(followStatus);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        ref={contentRef}
        className="bg-white dark:bg-black rounded-3xl border border-gray-100 dark:border-gray-800 w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <User size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-center">No users found</p>
            </div>
          ) : (
            <div className="p-4 space-y-1">
              {users.map((user) => {
                const isFollowing = followingStates[user.id] || false;
                const isOperationInProgress = followOperations.has(user.id);

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors"
                  >
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => handleUserClick(user.id)}
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-[#EF3866] to-gray-700 rounded-xl overflow-hidden flex-shrink-0">
                        {user.image_url ? (
                          <Image
                            src={user.image_url}
                            alt={`${user.first_name} ${user.last_name}`}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User size={20} className="text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {user.first_name} {user.last_name}
                          </h3>
                          {user.role === 'author' && (
                            <span className="px-1.5 py-0.5 text-xs bg-[#EF3866] text-white rounded font-medium">
                              Author
                            </span>
                          )}
                        </div>
                        {user.username && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            @{user.username}
                          </p>
                        )}
                        {user.bio && (
                          <p className="text-sm text-gray-500 dark:text-gray-500 truncate max-w-xs mt-1">
                            {user.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    {currentUserId && currentUserId !== user.id && (
                      <button
                        onClick={() => handleFollow(user.id)}
                        disabled={isOperationInProgress}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-sm transition-all ${
                          isFollowing
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            : 'bg-gradient-to-r from-[#EF3866] to-[#d7325a] text-white hover:shadow-lg hover:scale-105'
                        } ${isOperationInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isOperationInProgress ? (
                          <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
                        ) : isFollowing ? (
                          <>
                            <UserMinus size={14} />
                            <span>Unfollow</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} />
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
        </div>
      </div>
    </div>
  );
};