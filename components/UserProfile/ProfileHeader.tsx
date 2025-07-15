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
  Verified
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
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'author':
        return <BookOpen size={14} className="text-white" />;
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

  const styles = {
    profileCard: "bg-white/80 dark:bg-black/80 backdrop-blur-lg rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-6 w-full shadow-sm",
    profileTitle: "text-2xl font-black uppercase text-center truncate dark:text-white",
    profileImage: "rounded-full object-cover mx-auto border-4 border-[#EF3866] my-6",
    username: "text-3xl font-extrabold mt-7 text-center dark:text-white",
    bio: "mt-1 text-center text-sm font-normal dark:text-gray-300",
    location: "mt-2 text-center text-sm flex items-center justify-center gap-1 dark:text-gray-400",
    actionButton: "flex-1 transition-colors",
    statsContainer: "flex justify-center gap-8 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700",
    statItem: "text-center hover:opacity-75 transition-opacity cursor-pointer",
    statValue: "text-xl font-medium text-[#EF3866]",
    statLabel: "text-sm font-normal dark:text-gray-400",
  };

  return (
    <div className={styles.profileCard} ref={headerRef}>
      <div className="mb-4">
        <h3 className={styles.profileTitle}>
          {`${profile.first_name} ${profile.last_name}`}
        </h3>
      </div>

      {profile.image_url && (
        <Image
          src={profile.image_url}
          alt={`${profile.first_name} ${profile.last_name}`}
          width={220}
          height={220}
          className={styles.profileImage}
          priority
        />
      )}

      <p className={styles.username}>@{profile.username}</p>

      {profile.bio && profile.bio.trim() !== '' && (
        <p className={styles.bio}>{profile.bio}</p>
      )}

      {profile.location && profile.location.trim() !== '' && (
        <p className={styles.location}>
          <MapPin size={14} className="text-[#EF3866]" />
          <span>{profile.location}</span>
        </p>
      )}

      {/* Joined Date */}
      <div className="flex items-center justify-center gap-1 mt-2 text-sm text-gray-500 dark:text-gray-400">
        <Calendar size={14} className="text-[#EF3866]" />
        <span>Joined {formatDate(profile.created_at)}</span>
      </div>

      {/* Role Badge */}
      {profile.role && (
        <div className="flex items-center justify-center gap-1 mt-2 text-sm">
          <div className="bg-[#EF3866] text-white px-2 py-1 rounded-full flex items-center gap-1">
            {getRoleIcon(profile.role)}
            <span className="capitalize">{profile.role}</span>
            {profile.role === 'author' && (
              <Verified size={14} className="text-white" />
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 mt-6">
        {currentUserId && currentUserId !== profile.id && (
          <>
            <button
              onClick={handleFollowClick}
              disabled={followLoading}
              className={`${styles.actionButton} py-2 rounded-lg ${isFollowing
                ? 'bg-white text-[#EF3866] border-2 border-[#EF3866] hover:bg-[#EF3866] hover:text-white dark:bg-black dark:text-[#EF3866] dark:border-[#EF3866] dark:hover:bg-[#EF3866] dark:hover:text-white'
                : 'bg-[#EF3866] text-white border-2 border-[#EF3866] hover:bg-white hover:text-[#EF3866] dark:bg-[#EF3866] dark:text-white dark:hover:bg-white dark:hover:text-[#EF3866]'
                }`}
            >
              {followLoading ? (
                <span>Loading...</span>
              ) : isFollowing ? (
                <span className="flex items-center justify-center gap-1">
                  <UserMinus size={16} />
                  Following
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1">
                  <UserPlus size={16} />
                  Follow
                </span>
              )}
            </button>

            <button
              onClick={handleMessageClick}
              disabled={messageLoading || !isFollowing}
              className={`${styles.actionButton} py-2 bg-white text-[#EF3866] border-2 border-[#EF3866] hover:bg-[#EF3866] hover:text-white dark:bg-black dark:text-[#EF3866] dark:border-[#EF3866] dark:hover:bg-[#EF3866] dark:hover:text-white ${(!isFollowing || messageLoading) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              title={!isFollowing ? 'You must follow each other to message' : 'Send message'}
            >
              {messageLoading ? (
                <span>Loading...</span>
              ) : (
                <span className="flex items-center justify-center gap-1">
                  <MessageCircle size={16} />
                  Message
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Stats */}
      <div className={styles.statsContainer}>
        <button onClick={onOpenFollowers} className={styles.statItem}>
          <p className={styles.statValue}>{profile.followers_count || 0}</p>
          <p className={styles.statLabel}>Followers</p>
        </button>
        <button onClick={onOpenFollowing} className={styles.statItem}>
          <p className={styles.statValue}>{profile.following_count || 0}</p>
          <p className={styles.statLabel}>Following</p>
        </button>
        {profile.role === 'author' && (
          <div className={styles.statItem}>
            <p className={styles.statValue}>
              {postsCountLoading ? '...' : postsCount || 0}
            </p>
            <p className={styles.statLabel}>Posts</p>
          </div>
        )}
      </div>
    </div>
  );
};