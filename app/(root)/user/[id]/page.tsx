"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useAppContext } from '@/context/AppContext';
import { UserProfile, FollowUser, UserPost } from '@/types/user';
// Import your components
import { ProfileHeader } from '@/components/UserProfile/ProfileHeader';
import { ProfileTabs } from '@/components/UserProfile/ProfileTabs';
import { AboutSection } from '@/components/UserProfile/AboutSection';
import { UserActivity } from '@/components/UserProfile/UserActivity';
import { FollowModal } from '@/components/UserProfile/FollowModal';
import { VerifiedNewsList } from '@/components/UserProfile/VerifiedNewsList';
import  { AuthorPostsSection }  from '@/components/UserProfile/AuthorPostsSection';

// Add VerifiedNews interface
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

interface SanityPost {
  _id: string;
  title?: string;
  body?: PortableTextBlock[];
  description?: string;
  excerpt?: string;
  mainImage?: {
    asset?: {
      url: string;
    };
  };
  likes?: unknown[];
  comments?: unknown[];
  publishedAt?: string;
  _createdAt: string;
  _updatedAt: string;
  slug?: {
    current: string;
  };
}

interface PortableTextBlock {
  children?: PortableTextChild[];
}

interface PortableTextChild {
  text?: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Extended UserProfile interface to include cover_image_url
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'verified' | 'custom'>('about');

  // Content state
  const [, setPosts] = useState<UserPost[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [verifiedNews, setVerifiedNews] = useState<VerifiedNews[]>([]);
  const [, setPostsLoading] = useState(false);
  const [verifiedNewsLoading, setVerifiedNewsLoading] = useState(false);

  // Modal state
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);

  // Check if the profile user is an author
  const isAuthor = profile?.role === 'author';

  useEffect(() => {
    if (id) {
      fetchUserProfile();
      if (user?.id) {
        checkFollowStatus();
      }
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (profile?.id) {
      if (activeTab === 'posts' && profile.role === 'author') {
        fetchUserPosts();
      } else if (activeTab === 'verified') {
        fetchUserVerifiedNews();
      } else if (activeTab === 'custom') {
        fetchUserActivity();
      }
    }
  }, [activeTab, profile?.id, profile?.role]);

   const fetchUserProfile = async () => {
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
  };


  const handlePostsCountUpdate = (count: number) => {
    // Update the profile with the new posts count
    setProfile(prev => prev ? { ...prev, posts_count: count } : null);
  };
  const checkFollowStatus = async () => {
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
  };

  // Updated fetchUserPosts function for UserProfilePage component
const fetchUserPosts = async () => {
  if (!profile?.sanity_author_id || profile.role !== 'author') {
    console.log('No Sanity author ID found or user is not an author', {
      sanity_author_id: profile?.sanity_author_id,
      role: profile?.role
    });
    setPosts([]);
    return;
  }

  try {
    setPostsLoading(true);

    console.log('Fetching posts for user ID:', profile.id);

    // Use the API endpoint instead of direct Sanity client calls
    const response = await fetch('/api/post/by-author', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authorId: profile.id }), // Use Supabase user ID
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch posts');
    }

    const sanityPosts = await response.json();
    console.log('Sanity posts fetched:', sanityPosts);

    // Transform Sanity posts to match your UserPost interface
    const postsData: UserPost[] = sanityPosts.map((post: SanityPost) => ({
  id: post._id,
  title: post.title || '',
  content: post.body
    ? post.body
      .map((block: PortableTextBlock) =>
        block.children?.map((child: PortableTextChild) => child.text).join('') || ''
      )
      .join('\n')
    : '',
      excerpt: post.description || post.excerpt || '',
      image_url: post.mainImage?.asset?.url || null,
      media_urls: post.mainImage?.asset?.url ? [post.mainImage.asset.url] : [],
      author_id: profile.id,
      author: {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        username: profile.username,
        image_url: profile.image_url,
        is_verified: profile.role === 'author',
      },
      likes_count: post.likes?.length || 0,
      comments_count: post.comments?.length || 0,
      bookmarks_count: 0,
      shares_count: 0,
      published_at: post.publishedAt || post._createdAt,
      created_at: post._createdAt,
      updated_at: post._updatedAt,
      is_liked: false,
      is_bookmarked: false,
      visibility: 'public',
      slug: post.slug?.current || post._id,
    }));

    console.log('Transformed posts:', postsData);
    setPosts(postsData);

    // Update profile with posts count
    if (profile) {
      setProfile(prev => prev ? { ...prev, posts_count: postsData.length } : null);
    }
  } catch (error) {
    console.error('Error fetching user posts:', error);
    setPosts([]);
  } finally {
    setPostsLoading(false);
  }
};

  // New function to fetch verified news for the profile user
  const fetchUserVerifiedNews = async () => {
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
  };

  const fetchUserActivity = async () => {
    if (!profile?.id) return;

    try {
      // This would depend on if you have user activities in Supabase
      // For now, returning empty array
      setActivities([]);
    } catch (error) {
      console.error('Error fetching user activity:', error);
      setActivities([]);
    }
  };

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

  const fetchFollowers = async () => {
    if (!profile?.id) return;

    try {
      const response = await fetch(`/api/follow?type=followers&userId=${profile.id}`);
      if (!response.ok) throw new Error('Failed to fetch followers');

      const data = await response.json();
      setFollowers(data.users || []);
    } catch (error) {
      console.error('Error fetching followers:', error);
      setFollowers([]);
    }
  };

  const fetchFollowing = async () => {
    if (!profile?.id) return;

    try {
      const response = await fetch(`/api/follow?type=following&userId=${profile.id}`);
      if (!response.ok) throw new Error('Failed to fetch following');

      const data = await response.json();
      setFollowing(data.users || []);
    } catch (error) {
      console.error('Error fetching following:', error);
      setFollowing([]);
    }
  };

  const handleFollowersClick = () => {
    fetchFollowers();
    setFollowersModalOpen(true);
  };

  const handleFollowingClick = () => {
    fetchFollowing();
    setFollowingModalOpen(true);
  };

  const handleModalFollow = async (userId: string, isCurrentlyFollowing: boolean) => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isCurrentlyFollowing ? 'unfollow' : 'follow',
          following_id: userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update follow status');
      }

      if (data.success) {
        if (followersModalOpen) {
          fetchFollowers();
        } else if (followingModalOpen) {
          fetchFollowing();
        }
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      alert('Failed to update follow status. Please try again.');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        if (!isAuthor) {
          return (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-8">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              
              {/* Accent line */}
              <div className="w-16 h-0.5 bg-[#EF3866] mx-auto mb-6"></div>
              
              <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-4 tracking-tight">
                No Posts Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center max-w-md leading-relaxed font-light">
                This user hasn&apos;t shared any posts yet. Check back later to discover their content and insights.
              </p>
            </div>
          );
        }
        // For authors, use the AuthorPostsSection component
        return (
          <div className="">
            <AuthorPostsSection 
              userId={profile.id}
              isAuthor={isAuthor}
              userName={`${profile.first_name} ${profile.last_name}`}
            />
          </div>
        );
      case 'about':
        return profile ? (
          <div className="">
            <AboutSection profile={profile} />
          </div>
        ) : null;
      case 'verified':
        return (
          <div className="">
            <VerifiedNewsList 
              news={verifiedNews} 
              loading={verifiedNewsLoading}
            />
          </div>
        );
      case 'custom':
        return (
          <div className="">
            <UserActivity activities={activities} />
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/20 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full mx-auto animate-pulse"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/20 to-transparent animate-pulse"></div>
          </div>
          
          {/* Animated accent line */}
          <div className="w-16 h-0.5 bg-[#EF3866] mx-auto mb-6 animate-pulse"></div>
          
          <div className="space-y-4">
            <div className="w-48 h-6 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto animate-pulse"></div>
            <div className="w-32 h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto animate-pulse"></div>
            <div className="w-40 h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/20 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          {/* Accent line */}
          <div className="w-16 h-0.5 bg-[#EF3866] mx-auto mb-6"></div>
          
          <h1 className="text-3xl font-light text-gray-900 dark:text-white mb-4 tracking-tight">
            User Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-light">
            The user you&apos;re looking for doesn&apos;t exist or may have been removed from our platform.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900/20">
      {/* Header Section */}
      <section className="pt-20 sm:pt-24 lg:pt-28 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            {profile.bio && (
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-light leading-relaxed">
                {profile.bio}
              </p>
            )}
          </div>

          <ProfileHeader
            profile={profile}
            currentUserId={user?.id}
            isFollowing={isFollowing}
            followLoading={followLoading}
            onFollow={handleFollow}
            onOpenFollowers={handleFollowersClick}
            onOpenFollowing={handleFollowingClick}
            onPostsCountUpdate={handlePostsCountUpdate}
          />
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className=" bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProfileTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            postsCount={profile.posts_count}
            userRole={profile.role || 'user'}
          />
        </div>
      </div>

      {/* Content Section */}
      <section className="py-16 px-4 md:px-2 lg:px-2 max-w-7xl mx-auto">
        <div className="min-h-[60vh]">
          {renderTabContent()}
        </div>

        {/* Profile Stats */}
        {profile && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-12 mt-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="space-y-3">
                <p className="text-3xl md:text-4xl font-light text-[#EF3866] tracking-tight">
                  {profile.posts_count || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide">
                  Posts
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-3xl md:text-4xl font-light text-[#EF3866] tracking-tight">
                  {profile.followers_count || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide">
                  Followers
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-3xl md:text-4xl font-light text-[#EF3866] tracking-tight">
                  {profile.following_count || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide">
                  Following
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Modals */}
      <FollowModal
        isOpen={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        title="Followers"
        users={followers}
        currentUserId={user?.id}
        onFollow={handleModalFollow}
      />

      <FollowModal
        isOpen={followingModalOpen}
        onClose={() => setFollowingModalOpen(false)}
        title="Following"
        users={following}
        currentUserId={user?.id}
        onFollow={handleModalFollow}
      />
    </div>
  );
};

export default UserProfilePage;