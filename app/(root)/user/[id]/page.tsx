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
import { BookOpen, MessageCircle } from 'lucide-react';


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

  // Profile state
  const [profile, setProfile] = useState<ExtendedUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, ] = useState<string | null>(null);
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

  const styles = {
    container: "min-h-screen bg-gray-50/50 dark:bg-gray-900/20 pt-[100px]",
    profileContainer: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8",
    profileCard: "bg-white/80 dark:bg-black/80 backdrop-blur-lg rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-6 w-full lg:max-w-md h-fit shadow-sm",
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
    contentArea: "flex-1 flex flex-col gap-6",
    tabContainer: "bg-white/80 dark:bg-black/80 backdrop-blur-lg rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-2 shadow-sm",
    tabContent: "min-h-[60vh]",
    sectionTitle: "text-3xl font-bold dark:text-white",
    aboutCard: "bg-white/70 dark:bg-black/70 backdrop-blur-md rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-8",
    cardGrid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
    emptyStateContainer: "flex flex-col items-center justify-center py-20 px-4",
    emptyStateIcon: "w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-8",
    emptyStateDivider: "w-16 h-0.5 bg-[#EF3866] mx-auto mb-6",
    emptyStateTitle: "text-2xl font-light text-gray-900 dark:text-white mb-4 tracking-tight",
    emptyStateText: "text-gray-600 dark:text-gray-400 text-center max-w-md leading-relaxed font-light",
    loadingContainer: "min-h-screen bg-gray-50/50 dark:bg-gray-900/20 flex items-center justify-center px-4",
    loadingCircle: "w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full mx-auto animate-pulse relative",
    loadingAccent: "absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/20 to-transparent animate-pulse",
    loadingDivider: "w-16 h-0.5 bg-[#EF3866] mx-auto mb-6 animate-pulse",
    loadingText: "w-48 h-6 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto animate-pulse",
    errorContainer: "min-h-screen bg-gray-50/50 dark:bg-gray-900/20 flex items-center justify-center px-4",
    errorIcon: "w-24 h-24 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-full flex items-center justify-center mx-auto mb-8",
    errorTitle: "text-3xl font-light text-gray-900 dark:text-white mb-4 tracking-tight",
    errorText: "text-gray-600 dark:text-gray-400 leading-relaxed font-light"
  };

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

      // Remove the posts count fetching from here - let ProfileHeader handle it

      // Transform the data to match ExtendedUserProfile interface
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
        posts_count: data.posts_count || 0, // Use existing count from database as fallback
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setProfile(profileData);

      // Set default tab based on user role
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
    // Update the profile with the new posts count
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

  // New function to fetch verified news for the profile user
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
      // This would depend on if you have user activities in Supabase
      // For now, returning empty array
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
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      alert('Failed to update follow status. Please try again.');
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

  // Fixed renderTabContent function for UserProfilePage
const renderTabContent = () => {
  if (!profile) return null;

  switch (activeTab) {
    case 'posts':
      return (
        <div className="space-y-6">
          <h2 className={styles.sectionTitle}>
            {user?.id === profile.id ? 'Your' : `${profile.first_name}'s`} Posts
          </h2>
          {!isAuthor ? (
            <div className={styles.emptyStateContainer}>
              <div className={styles.emptyStateIcon}>
                <BookOpen className="w-8 h-8 text-black dark:text-white" />
              </div>
              <div className={styles.emptyStateDivider}></div>
              <h3 className={styles.emptyStateTitle}>No Posts Available</h3>
              <p className={styles.emptyStateText}>
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
          <h2 className={styles.sectionTitle}>About {profile.first_name}</h2>
          <div className={styles.aboutCard}>
            <AboutSection profile={profile} />
          </div>
        </div>
      );

    case 'verified':
      return (
        <div className="space-y-6">
          <h2 className={styles.sectionTitle}>
            {user?.id === profile.id ? 'Your' : `${profile.first_name}'s`} Verified News
          </h2>
          {/* Removed cardGrid wrapper to allow full width */}
          <VerifiedNewsList
            news={verifiedNews}
            loading={verifiedNewsLoading}
          />
        </div>
      );

    case 'custom':
      return (
        <div className="space-y-6">
          <h2 className={styles.sectionTitle}>
            {user?.id === profile.id ? 'Your' : `${profile.first_name}'s`} Activity
          </h2>
          <div className={styles.aboutCard}>
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
      <div className={styles.loadingContainer}>
        <div className="text-center">
          <div className="relative mb-8">
            <div className={styles.loadingCircle}></div>
            <div className={styles.loadingAccent}></div>
          </div>
          <div className={styles.loadingDivider}></div>
          <div className="space-y-4">
            <div className={styles.loadingText}></div>
            <div className="w-32 h-4 bg-black/20 dark:bg-white/20 rounded-full mx-auto animate-pulse"></div>
            <div className="w-40 h-4 bg-black/20 dark:bg-white/20 rounded-full mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className="text-center max-w-md">
          <div className={styles.errorIcon}>
            <svg className="w-10 h-10 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className={styles.loadingDivider}></div>
          <h1 className={styles.errorTitle}>
            {error === 'User not found' ? 'User Not Found' : 'Error Loading Profile'}
          </h1>
          <p className={styles.errorText}>
            {error === 'User not found' 
              ? "The user you're looking for doesn't exist or may have been removed from our platform."
              : "We encountered an error loading this profile. Please try again later."}
          </p>
        </div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className={styles.errorContainer}>
        <div className="text-center max-w-md">
          <div className={styles.errorIcon}>
            <svg className="w-10 h-10 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          <div className={styles.loadingDivider}></div>

          <h1 className={styles.errorTitle}>
            User Not Found
          </h1>
          <p className={styles.errorText}>
            The user you&apos;re looking for doesn&apos;t exist or may have been removed from our platform.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Profile Section */}
      <section className={styles.profileContainer}>
        <div className={styles.profileCard}>
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

          {profile.bio && (
            <p className={styles.bio}>{profile.bio}</p>
          )}

          {profile.location && (
            <p className={styles.location}>
              <span>📍</span> {profile.location}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6">
            {user?.id && user.id !== profile.id && (
              <>
                <Button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`${styles.actionButton} ${isFollowing
                      ? 'bg-white text-[#EF3866] border-2 border-[#EF3866] hover:bg-[#EF3866] hover:text-white dark:bg-black dark:text-[#EF3866] dark:border-[#EF3866] dark:hover:bg-[#EF3866] dark:hover:text-white'
                      : 'bg-[#EF3866] text-white border-2 border-[#EF3866] hover:bg-white hover:text-[#EF3866] dark:bg-[#EF3866] dark:text-white dark:hover:bg-white dark:hover:text-[#EF3866]'
                    }`}
                >
                  {followLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
                </Button>

                <Button
                  onClick={handleMessageClick}
                  disabled={messageLoading}
                  className="bg-white text-[#EF3866] border-2 border-[#EF3866] hover:bg-[#EF3866]  dark:text-white hover:text-white  dark:bg-[#EF3866] dark:border-[#EF3866] dark:hover:bg-[#EF3866] dark:hover:text-white"
                >
                  {messageLoading ? 'Loading...' : <MessageCircle className="w-4 h-4" />}
                </Button>
              </>
            )}
          </div>

          {/* Stats */}
          <div className={styles.statsContainer}>
            <button onClick={handleFollowersClick} className={styles.statItem}>
              <p className={styles.statValue}>{profile.followers_count || 0}</p>
              <p className={styles.statLabel}>Followers</p>
            </button>
            <button onClick={handleFollowingClick} className={styles.statItem}>
              <p className={styles.statValue}>{profile.following_count || 0}</p>
              <p className={styles.statLabel}>Following</p>
            </button>
            <div className={styles.statItem}>
              <p className={styles.statValue}>{profile.posts_count || 0}</p>
              <p className={styles.statLabel}>Posts</p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className={styles.contentArea}>
          {/* Tab Navigation */}
          <div>
            <ProfileTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              postsCount={profile.posts_count || 0}
              userRole={profile.role || 'user'}
            />
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {renderTabContent()}
          </div>
        </div>
      </section>

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