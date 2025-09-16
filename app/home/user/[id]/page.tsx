"use client";
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import { useAppContext } from '@/context/AppContext';
import { UserProfile } from '@/types/user';
import { Button } from '@/components/ui/button';
import { ProfileTabs } from '@/components/UserProfile/ProfileTabs';
import { AboutSection } from '@/components/UserProfile/AboutSection';
import { UserActivity } from '@/components/UserProfile/UserActivity';
import { VerifiedNewsList } from '@/components/UserProfile/VerifiedNewsList';
import { AuthorPostsSection } from '@/components/UserProfile/AuthorPostsSection';
import { FollowersFollowingSection } from '@/components/UserProfile/FollowModal';
import { BookOpen, MessageCircle, MapPin, Calendar, Users, FileText } from 'lucide-react';
import { notificationService } from '@/lib/notificationService';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';

interface VerifiedNews {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  published_at: string;
  verified_at: string;
  image_url?: string;
  external_url: string;
  views_count: number;
  credibility_score: number;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ExtendedUserProfile extends UserProfile {
  cover_image_url?: string;
  role: 'user' | 'author';
  sanity_author_id?: string;
}

interface ActivityItem {
  id: string;
  type: 'like' | 'comment' | 'share' | 'bookmark' | 'follow';
  title: string;
  description: string;
  timestamp: string;
  target_id?: string;
  target_type?: 'post' | 'user';
  image_url?: string;
  author_name?: string;
}

const UserProfilePage = () => {
  const { id } = useParams();
  const { user } = useAppContext();
  const router = useRouter();
  const { userId } = useAuth();

  // Profile state
  const [profile, setProfile] = useState<ExtendedUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'verified' | 'custom'>('about');

  // Content state
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [verifiedNews, setVerifiedNews] = useState<VerifiedNews[]>([]);
  const [verifiedNewsLoading, setVerifiedNewsLoading] = useState(false);

  // Modal state
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers');

  const currentUserId = user?.id;
  const isAuthor = profile?.role === 'author';

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);

      // Get user profile
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get followers count
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', id);

      // Get following count  
      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', id);

      const profileData: ExtendedUserProfile = {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        email: data.email,
        bio: data.bio,
        image_url: data.image_url,
        cover_image_url: data.cover_image_url,
        location: data.location,
        role: data.role || 'user',
        sanity_author_id: data.sanity_author_id,
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        posts_count: data.posts_count || 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setProfile(profileData);

      if (profileData.role === 'user') {
        setActiveTab('about');
      } else if (profileData.role === 'author') {
        setActiveTab('posts');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      router.push('/404');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const handlePostsCountUpdate = useCallback((count: number) => {
    setProfile(prev => prev ? { ...prev, posts_count: count } : null);
  }, []);

  const checkFollowStatus = useCallback(async () => {
    if (!user?.id || !id || user.id === id) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
      setIsFollowing(false);
    }
  }, [id, user?.id]);

  const fetchUserVerifiedNews = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setVerifiedNewsLoading(true);

      const response = await fetch(`/api/user-verified-news?userId=${profile.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch verified news');
      }

      const data = await response.json();
      setVerifiedNews(data.verifiedNews || []);
    } catch (error) {
      console.error('Error fetching user verified news:', error);
      setVerifiedNews([]);
    } finally {
      setVerifiedNewsLoading(false);
    }
  }, [profile?.id]);

  const fetchUserActivity = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setActivities([]);
    } catch (error) {
      console.error('Error fetching user activity:', error);
      setActivities([]);
    }
  }, [profile?.id]);

  const handleFollow = async () => {
    if (!user?.id || !profile?.id || followLoading || user.id === profile.id) {
      console.log('Cannot follow: missing user ID, profile ID, or trying to follow self');
      return;
    }

    try {
      setFollowLoading(true);

      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isFollowing ? 'unfollow' : 'follow',
          following_id: profile.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update follow status');
      }

      if (data.success) {
        setIsFollowing(!isFollowing);
        setProfile(prev => prev ? {
          ...prev,
          followers_count: isFollowing
            ? Math.max(0, prev.followers_count - 1)
            : prev.followers_count + 1
        } : null);

        if (userId && profile.id) {
          await notificationService.createUserActivity({
            user_id: userId,
            type: isFollowing ? 'user_unfollowed' : 'user_followed',
            title: isFollowing ? 'User Unfollowed' : 'User Followed',
            description: isFollowing
              ? `You unfollowed ${profile.first_name} ${profile.last_name}`
              : `You followed ${profile.first_name} ${profile.last_name}`,
            category: 'social',
            visibility: 'public',
            data: { target_user_id: profile.id, target_user_name: `${profile.first_name} ${profile.last_name}` }
          });

          if (!isFollowing && userId !== profile.id) {
            await notificationService.createFollowNotification(userId, profile.id, user?.firstName || 'Someone');
          }
        }
        toast.success(isFollowing ? 'Unfollowed!' : 'Followed!');
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      toast.error('Failed to update follow status. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleFollowersClick = () => {
    setFollowModalTab('followers');
    setFollowModalOpen(true);
  };

  const handleFollowingClick = () => {
    setFollowModalTab('following');
    setFollowModalOpen(true);
  };

  const handleMessageClick = async () => {
    if (!currentUserId || !profile || currentUserId === profile.id || messageLoading) return;

    if (!isFollowing) {
      alert('You must follow each other to start a conversation');
      return;
    }

    setMessageLoading(true);

    try {
      const checkResponse = await fetch(`/api/conversations?with_user_id=${profile.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const checkData = await checkResponse.json();

      if (checkResponse.ok && checkData.conversation) {
        router.push(`/home/messaging/${checkData.conversation.conversation_id}`);
        return;
      }

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

      router.push(`/home/messaging/${data.conversation_id}`);

    } catch (error) {
      console.error('Error handling conversation:', error);
      alert('Failed to start conversation. Please try again.');
    } finally {
      setMessageLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchUserProfile();
      if (user?.id) {
        checkFollowStatus();
      }
    }
  }, [id, user?.id, fetchUserProfile, checkFollowStatus]);

  useEffect(() => {
    if (profile?.id) {
      if (activeTab === 'verified') {
        fetchUserVerifiedNews();
      } else if (activeTab === 'custom') {
        fetchUserActivity();
      }
    }
  }, [activeTab, profile?.id, fetchUserVerifiedNews, fetchUserActivity]);

  const renderTabContent = () => {
    if (!profile) return null;

    switch (activeTab) {
      case 'posts':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user?.id === profile.id ? 'Your Posts' : `${profile.first_name}'s Posts`}
              </h2>
            </div>
            {!isAuthor ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Posts Available</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  This user is not an author and doesn&apos;t have any posts to display.
                </p>
              </div>
            ) : (
              <AuthorPostsSection
                userId={profile.id}
                isAuthor={isAuthor}
                userName={`${profile.first_name} ${profile.last_name}`}
                onPostsCountUpdate={handlePostsCountUpdate}
              />
            )}
          </div>
        );

      case 'about':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">About {profile.first_name}</h2>
            </div>
            <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <AboutSection profile={profile} />
            </div>
          </div>
        );

      case 'verified':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user?.id === profile.id ? 'Your Verified News' : `${profile.first_name}'s Verified News`}
              </h2>
            </div>
            <VerifiedNewsList
              news={verifiedNews}
              loading={verifiedNewsLoading}
            />
          </div>
        );

      case 'custom':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user?.id === profile.id ? 'Your Activity' : `${profile.first_name}'s Activity`}
              </h2>
            </div>
            <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <UserActivity activities={activities} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-4 animate-pulse"></div>
          <div className="w-32 h-4 bg-gray-200 dark:bg-gray-800 rounded mx-auto mb-2 animate-pulse"></div>
          <div className="w-24 h-3 bg-gray-200 dark:bg-gray-800 rounded mx-auto animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error === 'User not found' ? 'User Not Found' : 'Error Loading Profile'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {error === 'User not found'
              ? "The user you're looking for doesn't exist or may have been removed from our platform."
              : "We encountered an error loading this profile. Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="relative bg-white dark:bg-black rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden mb-10">
          {/* Cover Image */}
          <div className="relative h-40 sm:h-56 md:h-64 w-full">
            {profile.cover_image_url ? (
              <Image
                src={profile.cover_image_url}
                alt="Cover"
                fill
                priority
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-[#EF3866]/70 via-pink-400/50 to-purple-500/70 dark:from-[#EF3866]/40 dark:via-pink-500/30 dark:to-purple-600/40" />
            )}
            {/* Subtle overlay for readability */}
            <div className="absolute inset-0 bg-black/20 dark:bg-black/30" />
          </div>

          {/* Profile Info */}
          <div className="px-4 sm:px-6 pb-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-16 sm:-mt-20">
              {/* Profile Image overlapping cover */}
              <div className="flex-shrink-0 mb-4 sm:mb-0 relative z-10">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white dark:border-black bg-white dark:bg-black overflow-hidden shadow-xl mx-auto sm:mx-0">
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
                      <span className="text-3xl font-bold text-neutral-500 dark:text-neutral-400">
                        {profile.first_name[0]}
                        {profile.last_name[0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="mb-4 sm:mb-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
                      {profile.first_name} {profile.last_name}
                    </h1>
                    <p className="text-neutral-600 dark:text-neutral-400">@{profile.username}</p>
                    {profile.role === "author" && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#EF3866]/10 text-[#EF3866] mt-4">
                        ✦ Author
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {user?.id && user.id !== profile.id && (
                    <div className="flex gap-3">
                      <Button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`px-6 py-2 rounded-xl font-medium shadow-sm transition-colors ${isFollowing
                            ? "bg-neutral-100 text-black hover:bg-neutral-200 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                            : "bg-[#EF3866] text-white hover:bg-[#d72e59]"
                          }`}
                      >
                        {followLoading
                          ? "Loading..."
                          : isFollowing
                            ? "Following"
                            : "Follow"}
                      </Button>

                      <Button
                        onClick={handleMessageClick}
                        disabled={messageLoading}
                        className="px-4 py-2 rounded-xl shadow-sm bg-neutral-100 text-black hover:bg-neutral-200 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                      >
                        {messageLoading ? "..." : <MessageCircle className="w-5 h-5" />}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Bio and Location */}
                <div className="mt-4 space-y-2">
                  {profile.bio && (
                    <p className="text-black dark:text-white">{profile.bio}</p>
                  )}
                  {profile.location && (
                    <div className="flex items-center text-neutral-600 dark:text-neutral-400 text-sm">
                      <MapPin className="w-4 h-4 mr-1 text-[#EF3866]" />
                      {profile.location}
                    </div>
                  )}
                  <div className="flex items-center text-neutral-600 dark:text-neutral-400 text-sm">
                    <Calendar className="w-4 h-4 mr-1 text-[#EF3866]" />
                    Joined{" "}
                    {new Date(profile.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-6 mt-5">
                  <button
                    onClick={handleFollowersClick}
                    className="hover:text-[#EF3866] transition-colors"
                  >
                    <span className="font-bold text-black dark:text-white">
                      {profile.followers_count || 0}
                    </span>
                    <span className="text-neutral-600 dark:text-neutral-400 ml-1">
                      Followers
                    </span>
                  </button>
                  <button
                    onClick={handleFollowingClick}
                    className="hover:text-[#EF3866] transition-colors"
                  >
                    <span className="font-bold text-black dark:text-white">
                      {profile.following_count || 0}
                    </span>
                    <span className="text-neutral-600 dark:text-neutral-400 ml-1">
                      Following
                    </span>
                  </button>
                  {isAuthor && (
                    <div>
                      <span className="font-bold text-black dark:text-white">
                        {profile.posts_count || 0}
                      </span>
                      <span className="text-neutral-600 dark:text-neutral-400 ml-1">
                        Posts
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Tabs and Content */}
        <div className="space-y-6">
          <ProfileTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            postsCount={profile.posts_count || 0}
            userRole={profile.role || "user"}
          />

          <div className="min-h-[60vh]">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Modals */}
      {followModalOpen && profile && (
        <FollowersFollowingSection
          userId={profile.id}
          isModal={true}
          onClose={() => setFollowModalOpen(false)}
          initialTab={followModalTab}
        />
      )}
    </div>
  );
};

export default UserProfilePage;