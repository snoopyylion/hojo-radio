// components/UserProfile/FollowModal.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import { X, User, UserPlus, UserMinus } from 'lucide-react';
import { FollowUser } from '@/types/user';

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
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && modalRef.current && contentRef.current) {
      gsap.set(modalRef.current, { opacity: 0 });
      gsap.set(contentRef.current, { scale: 0.8, opacity: 0 });
      
      const tl = gsap.timeline();
      tl.to(modalRef.current, { opacity: 1, duration: 0.3 })
        .to(contentRef.current, { 
          scale: 1, 
          opacity: 1, 
          duration: 0.4, 
          ease: "back.out(1.7)" 
        }, "-=0.1");
    }
  }, [isOpen]);

  const handleClose = () => {
    if (modalRef.current && contentRef.current) {
      const tl = gsap.timeline();
      tl.to(contentRef.current, { 
        scale: 0.8, 
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

  const handleFollow = (userId: string) => {
    const isCurrentlyFollowing = followingStates[userId] || false;
    setFollowingStates(prev => ({
      ...prev,
      [userId]: !isCurrentlyFollowing
    }));
    onFollow(userId, isCurrentlyFollowing);
  };

  // Check follow status for all users when modal opens
useEffect(() => {
  if (isOpen && currentUserId && users.length > 0) {
    checkFollowStatus();
  }
}, [isOpen, users, currentUserId]);

const checkFollowStatus = async () => {
  if (!currentUserId) return;
  
  try {
    const followStatus: Record<string, boolean> = {};
    
    // Check follow status for each user
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        ref={contentRef}
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96">
          {users.length === 0 ? (
            <div className="p-8 text-center">
              <User size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No users found</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#EF3866] to-gray-700 rounded-xl overflow-hidden">
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
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {user.first_name} {user.last_name}
                      </h3>
                      {user.username && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          @{user.username}
                        </p>
                      )}
                      {user.bio && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 truncate max-w-xs">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {currentUserId && currentUserId !== user.id && (
                    <button
                      onClick={() => handleFollow(user.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                        followingStates[user.id]
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          : 'bg-[#EF3866] text-white hover:bg-[#d7325a]'
                      }`}
                    >
                      {followingStates[user.id] ? (
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}