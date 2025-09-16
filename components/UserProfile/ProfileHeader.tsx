'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  MessageCircle,
  UserPlus,
  UserMinus,
  MapPin,
  Calendar,
  Shield,
  Verified,
  Crown
} from 'lucide-react';
import { UserProfile } from '@/types/user';
import { usePostsCount } from '@/hooks/usePostsCount';

interface ProfileHeaderProps {
  profile: UserProfile;
  currentUserId?: string;
  isFollowing: boolean;
  followLoading: boolean;
  onFollow: () => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
  onPostsCountUpdate?: (count: number) => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  currentUserId,
  isFollowing,
  followLoading,
  onFollow,
  onOpenFollowers,
  onOpenFollowing,
  onPostsCountUpdate
}) => {
  const router = useRouter();
  const headerRef = useRef<HTMLDivElement>(null);
  const [messageLoading, setMessageLoading] = useState(false);

  // Keep a ref to the callback to avoid dependency issues
  const onPostsCountUpdateRef = useRef(onPostsCountUpdate);

  // Use custom hook for posts count
  const { postsCount, loading: postsCountLoading } = usePostsCount(profile.id, profile.role);

  // Update the ref when the callback changes
  useEffect(() => {
    onPostsCountUpdateRef.current = onPostsCountUpdate;
  });

  // Update parent component when posts count changes
  useEffect(() => {
    if (onPostsCountUpdateRef.current && postsCount !== undefined) {
      onPostsCountUpdateRef.current(postsCount);
    }
  }, [postsCount]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'author':
        return <Crown size={14} className="text-white" />;
      case 'user':
        return <Shield size={14} className="text-white" />;
      default:
        return <Shield size={14} className="text-white" />;
    }
  };

  const handleFollowClick = () => {
    if (!currentUserId || currentUserId === profile.id || followLoading) return;
    onFollow();
  };

  const handleMessageClick = async () => {
    if (!currentUserId || currentUserId === profile.id || messageLoading) return;

    // Check if users follow each other before allowing messaging
    if (!isFollowing) {
      alert('You must follow each other to start a conversation');
      return;
    }

    setMessageLoading(true);

    try {
      // First, check if conversation already exists
      const checkResponse = await fetch(`/api/conversations?with_user_id=${profile.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const checkData = await checkResponse.json();

      if (checkResponse.ok && checkData.conversation) {
        // Existing conversation found, navigate to it
        router.push(`/messages/${checkData.conversation.conversation_id}`);
        return;
      }

      // No existing conversation, create a new one
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_ids: [profile.id],
          type: 'direct'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create conversation');
      }

      // Navigate to the conversation (existing or new)
      router.push(`/messages/${data.conversation_id}`);

    } catch (error) {
      console.error('Error handling conversation:', error);
      alert('Failed to start conversation. Please try again.');
    } finally {
      setMessageLoading(false);
    }
  };

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="w-full" ref={headerRef}>
      <div className="relative bg-white dark:bg-black rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden mb-8 sm:mb-10 mx-auto max-w-7xl">
        {/* Cover Image */}
        <div className="relative h-28 sm:h-40 md:h-52 lg:h-64 w-full">
          {profile.cover_image_url ? (
            <Image
              src={profile.cover_image_url}
              alt="Cover"
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-[#EF3866]/70 via-pink-400/50 to-purple-500/70 dark:from-[#EF3866]/40 dark:via-pink-500/30 dark:to-purple-600/40" />
          )}
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/20 dark:bg-black/30" />
        </div>

        {/* Profile Info */}
        <div className="px-4 sm:px-6 lg:px-8 pb-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-14 sm:-mt-20 lg:-mt-24">
            {/* Profile Image */}
            <div className="flex-shrink-0 mb-4 sm:mb-0 relative z-10">
              <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full border-4 border-white dark:border-black bg-white dark:bg-black overflow-hidden shadow-xl mx-auto sm:mx-0">
                {profile.image_url ? (
                  <Image
                    src={profile.image_url}
                    alt={`${profile.first_name} ${profile.last_name}`}
                    width={144}
                    height={144}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-200 dark:bg-neutral-800">
                    <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-500 dark:text-neutral-400">
                      {profile.first_name[0]}
                      {profile.last_name[0]}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Details */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">@{profile.username}</p>

                  {profile.role && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-[#EF3866]/50 text-gray-800 dark:text-gray-200 mt-12 sm:mt-12">
                      {getRoleIcon(profile.role)}
                      <span className="ml-1 capitalize">{profile.role}</span>
                      {profile.role === 'author' && (
                        <Verified size={14} className="ml-1 text-yellow-400" />
                      )}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                {currentUserId && currentUserId !== profile.id && (
                  <div className="flex gap-2 sm:gap-3 flex-wrap">
                    <button
                      onClick={handleFollowClick}
                      disabled={followLoading}
                      className={`py-2 px-4 rounded-full text-sm sm:text-base font-semibold transition-colors ${isFollowing
                        ? 'bg-white text-[#EF3866] border border-[#EF3866] hover:bg-[#EF3866] hover:text-white'
                        : 'bg-[#EF3866] text-white border border-[#EF3866] hover:bg-[#EF3866]/90'
                        }`}
                    >
                      {followLoading ? (
                        <span className="flex items-center gap-1">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          Loading...
                        </span>
                      ) : isFollowing ? (
                        <span className="flex items-center gap-1">
                          <UserMinus size={16} />
                          Following
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <UserPlus size={16} />
                          Follow
                        </span>
                      )}
                    </button>

                    <button
                      onClick={handleMessageClick}
                      disabled={messageLoading || !isFollowing}
                      className={`py-2 px-4 rounded-full text-sm sm:text-base font-semibold transition-colors bg-white text-[#EF3866] border border-[#EF3866] hover:bg-[#EF3866] hover:text-white ${(!isFollowing || messageLoading) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      title={!isFollowing ? 'You must follow each other to message' : 'Send message'}
                    >
                      {messageLoading ? (
                        <span className="flex items-center gap-1">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          Loading...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <MessageCircle size={16} />
                          Message
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Bio & Location */}
              <div className="mt-4 space-y-2 text-sm sm:text-base">
                {profile.bio && (
                  <p className="text-black dark:text-white">{profile.bio}</p>
                )}
                {profile.location && (
                  <div className="flex items-center text-neutral-600 dark:text-neutral-400">
                    <MapPin className="w-4 h-4 mr-1 text-[#EF3866]" />
                    {profile.location}
                  </div>
                )}
                <div className="flex items-center text-neutral-600 dark:text-neutral-400">
                  <Calendar className="w-4 h-4 mr-1 text-[#EF3866]" />
                  Joined{' '}
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 sm:gap-6 mt-5 text-sm sm:text-base">
                <button onClick={onOpenFollowers} className="hover:text-[#EF3866] transition-colors">
                  <span className="font-bold text-black dark:text-white">
                    {formatNumber(profile.followers_count || 0)}
                  </span>
                  <span className="ml-1 text-neutral-600 dark:text-neutral-400">
                    Followers
                  </span>
                </button>
                <button onClick={onOpenFollowing} className="hover:text-[#EF3866] transition-colors">
                  <span className="font-bold text-black dark:text-white">
                    {formatNumber(profile.following_count || 0)}
                  </span>
                  <span className="ml-1 text-neutral-600 dark:text-neutral-400">
                    Following
                  </span>
                </button>
                {profile.role === 'author' && (
                  <div>
                    <span className="font-bold text-black dark:text-white">
                      {postsCountLoading ? '...' : formatNumber(postsCount || 0)}
                    </span>
                    <span className="ml-1 text-neutral-600 dark:text-neutral-400">
                      Posts
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};