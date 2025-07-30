'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  BookOpen,
  MessageCircle,
  UserPlus,
  UserMinus,
  MapPin,
  Calendar,
  Shield,
  Verified,
  Edit3,
  Crown,
  Star,
  Heart,
  Users
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl lg:rounded-3xl border border-gray-200/70 dark:border-gray-700/70 shadow-2xl shadow-gray-200/30 dark:shadow-gray-900/30 p-3 md:p-4 lg:p-5 w-[30%] min-w-[280px] max-w-[400px] mx-auto" ref={headerRef}>
      
      {/* Profile Image and Basic Info Section */}
      <div className="flex flex-col items-center text-center mb-4 md:mb-6">
        {/* Profile Image with Enhanced Styling */}
        {profile.image_url && (
          <div className="relative mb-3 md:mb-4">
            <div className="relative">
              <Image
                src={profile.image_url}
                alt={`${profile.first_name} ${profile.last_name}`}
                width={120}
                height={120}
                className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 rounded-2xl object-cover border-4 border-white dark:border-gray-800 shadow-2xl shadow-gray-300/40 dark:shadow-gray-900/60"
                priority
              />
              {/* Status Indicator */}
              <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 w-4 h-4 md:w-5 md:h-5 bg-emerald-500 border-3 border-white dark:border-gray-900 rounded-full shadow-lg flex items-center justify-center">
                <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        )}

        {/* Name and Username */}
        <div className="mb-2 md:mb-3">
          <h1 className="text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
            {profile.first_name} {profile.last_name}
          </h1>
          <p className="text-xs md:text-sm lg:text-base text-gray-600 dark:text-gray-400 font-medium">
            @{profile.username}
          </p>
        </div>

        {/* Role Badge with Enhanced Styling */}
        {profile.role && (
          <div className="mb-2 md:mb-3">
            <div className={`inline-flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs font-semibold shadow-lg ${
              profile.role === 'author' 
                ? 'bg-gradient-to-r from-[#EF3866] to-[#EF3866]/90 text-white shadow-[#EF3866]/25' 
                : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white'
            }`}>
              {getRoleIcon(profile.role)}
              <span className="capitalize">{profile.role}</span>
              {profile.role === 'author' && (
                <Verified size={10} className="text-yellow-300" />
              )}
            </div>
          </div>
        )}

        {/* Bio Section */}
        {profile.bio && profile.bio.trim() !== '' && (
          <div className="mb-3 md:mb-4 w-full">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-xs md:text-sm text-center">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Location and Join Date */}
        <div className="flex flex-col gap-1 md:gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3 md:mb-4">
          {profile.location && profile.location.trim() !== '' && (
            <div className="flex items-center justify-center gap-1">
              <MapPin size={12} className="text-[#EF3866] flex-shrink-0" />
              <span className="truncate">{profile.location}</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-1">
            <Calendar size={12} className="text-[#EF3866] flex-shrink-0" />
            <span>Joined {formatDate(profile.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons Section */}
      {currentUserId && currentUserId !== profile.id && (
        <div className="space-y-2 mb-4 md:mb-6">
          <button
            onClick={handleFollowClick}
            disabled={followLoading}
            className={`w-full py-2.5 md:py-3 px-3 md:px-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] text-xs md:text-sm shadow-lg hover:shadow-xl ${
              isFollowing
                ? 'bg-white text-[#EF3866] border-2 border-[#EF3866] hover:bg-[#EF3866] hover:text-white'
                : 'bg-gradient-to-r from-[#EF3866] to-[#EF3866]/90 text-white border-2 border-[#EF3866] hover:from-[#EF3866]/90 hover:to-[#EF3866]'
            }`}
          >
            {followLoading ? (
              <span className="flex items-center justify-center gap-1">
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </span>
            ) : isFollowing ? (
              <span className="flex items-center justify-center gap-1">
                <UserMinus size={14} />
                Following
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1">
                <UserPlus size={14} />
                Follow
              </span>
            )}
          </button>

          <button
            onClick={handleMessageClick}
            disabled={messageLoading || !isFollowing}
            className={`w-full py-2.5 md:py-3 px-3 md:px-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] bg-white text-[#EF3866] border-2 border-[#EF3866] hover:bg-[#EF3866] hover:text-white shadow-lg hover:shadow-xl text-xs md:text-sm ${
              (!isFollowing || messageLoading) ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
            }`}
            title={!isFollowing ? 'You must follow each other to message' : 'Send message'}
          >
            {messageLoading ? (
              <span className="flex items-center justify-center gap-1">
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1">
                <MessageCircle size={14} />
                Message
              </span>
            )}
          </button>
        </div>
      )}

      {/* Enhanced Stats Section */}
      <div className="space-y-3">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div>
        
        {/* Stats Row */}
        <div className={`grid gap-1 sm:gap-2 ${profile.role === 'author' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {/* Followers */}
          <button 
            onClick={onOpenFollowers} 
            className="group p-2 sm:p-3 rounded-lg bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 transform hover:scale-[1.02]"
          >
            <div className="text-center">
              <div className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 dark:text-white group-hover:text-[#EF3866] transition-colors">
                {formatNumber(profile.followers_count || 0)}
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors leading-tight">
                Followers
              </div>
            </div>
          </button>
          
          {/* Following */}
          <button 
            onClick={onOpenFollowing} 
            className="group p-2 sm:p-3 rounded-lg bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 transform hover:scale-[1.02]"
          >
            <div className="text-center">
              <div className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 dark:text-white group-hover:text-[#EF3866] transition-colors">
                {formatNumber(profile.following_count || 0)}
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors leading-tight">
                Following
              </div>
            </div>
          </button>
          
          {/* Posts (for authors only) */}
          {profile.role === 'author' && (
            <div className="p-2 sm:p-3 rounded-lg bg-gray-50/50 dark:bg-gray-800/30 border border-gray-200/50 dark:border-gray-700/50">
              <div className="text-center">
                <div className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-1">
                  {postsCountLoading ? (
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    formatNumber(postsCount || 0)
                  )}
                </div>
                <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 leading-tight">
                  Posts
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};