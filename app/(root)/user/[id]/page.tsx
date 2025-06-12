"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useAppContext } from '@/context/AppContext';
import { UserProfile, FollowUser, UserPost } from '@/types/user';
import { client } from '@/sanity/lib/client'; // Your Sanity client
import { POSTS_BY_AUTHOR_QUERY } from '@/sanity/lib/queries'; // Your query
// Import your components
import { ProfileHeader } from '@/components/UserProfile/ProfileHeader';
import { ProfileTabs } from '@/components/UserProfile/ProfileTabs';
import { PostsList } from '@/components/UserProfile/PostList';
import { AboutSection } from '@/components/UserProfile/AboutSection';
import { UserActivity } from '@/components/UserProfile/UserActivity';
import { FollowModal } from '@/components/UserProfile/FollowModal';
import VerifiedList from '@/components/VerifiedList';


interface SanityPost {
  _id: string;
  title?: string;
  body?: PortableTextBlock[];
  description?: string;
  excerpt?: string;
  mainImage?: {
    asset?: {
      url?: string;
    };
  };
  likes?: number;
  comments?: number;
  publishedAt?: string;
  _createdAt: string;
  _updatedAt: string;
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
  sanity_author_id?: string; // Add this to link to Sanity author
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
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Modal state
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);

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
      } else if (activeTab === 'custom') {
        fetchUserActivity();
      }
    }
  }, [activeTab, profile?.id, profile?.role]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);

      // Get user profile with followers/following counts
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
        sanity_author_id: data.sanity_author_id, // This should be set when user becomes author
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        posts_count: 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setProfile(profileData);

      // Set default tab based on user role
      if (profileData.role === 'user') {
        setActiveTab('about');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      router.push('/404');
    } finally {
      setLoading(false);
    }
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

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
      setIsFollowing(false);
    }
  };

  const fetchUserPosts = async () => {
    if (!profile?.sanity_author_id || profile.role !== 'author') {
      console.log('No Sanity author ID found or user is not an author', {
        sanity_author_id: profile?.sanity_author_id,
        role: profile?.role
      });
      return;
    }

    try {
      setPostsLoading(true);

      console.log('Fetching posts for author:', profile.sanity_author_id);

      // First, let's check if the author exists in Sanity
      const authorCheck = await client.fetch(
        `*[_type == "author" && _id == $authorId][0]`,
        { authorId: profile.sanity_author_id }
      );

      console.log('Author check result:', authorCheck);

      if (!authorCheck) {
        console.error('Author not found in Sanity with ID:', profile.sanity_author_id);
        setPosts([]);
        return;
      }

      // Fetch posts from Sanity using the author's Sanity ID
      const sanityPosts = await client.fetch(POSTS_BY_AUTHOR_QUERY, {
        id: profile.sanity_author_id
      });

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
        likes_count: post.likes || 0,
        comments_count: post.comments || 0,
        bookmarks_count: 0,
        shares_count: 0,
        published_at: post.publishedAt || post._createdAt,
        created_at: post._createdAt,
        updated_at: post._updatedAt,
        is_liked: false,
        is_bookmarked: false,
        visibility: 'public',
      }));


      console.log('Transformed posts:', postsData);
      setPosts(postsData);

      // Update profile with posts count
      if (profile) {
        setProfile(prev => prev ? { ...prev, posts_count: postsData.length } : null);
      }
    } catch (error) {
      console.error('Error fetching user posts from Sanity:', error);
      setPosts([]);
    } finally {
      setPostsLoading(false);
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
      // You might want to show a toast notification here
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

      // Refresh the modal data only if the operation was successful
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
        if (profile?.role !== 'author') {
          return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No posts yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm leading-relaxed">
                This user hasn&apos;t shared any posts yet. Check back later to see their content.
              </p>
            </div>
          );
        }
        return (
          <div className="px-4 sm:px-6 lg:px-8">
            <PostsList
              posts={posts}
              loading={postsLoading}
            />
          </div>
        );
      case 'about':
        return profile ? (
          <div className="px-4 sm:px-6 lg:px-8">
            <AboutSection profile={profile} />
          </div>
        ) : null;
      case 'verified':
        return (
          <div className="px-4 sm:px-6 lg:px-8">
            <VerifiedList />
          </div>
        );
      case 'custom':
        return (
          <div className="px-4 sm:px-6 lg:px-8">
            <UserActivity activities={activities} />
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full mx-auto mb-6 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/20 to-transparent animate-pulse"></div>
          </div>
          <div className="space-y-3">
            <div className="w-48 h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto animate-pulse"></div>
            <div className="w-32 h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto animate-pulse"></div>
            <div className="w-40 h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
            User not found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            The user you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header Section */}
      <div className="pt-20 sm:pt-24 lg:pt-28 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProfileHeader
            profile={profile}
            currentUserId={user?.id}
            isFollowing={isFollowing}
            followLoading={followLoading}
            onFollow={handleFollow}
            onOpenFollowers={handleFollowersClick}
            onOpenFollowing={handleFollowingClick}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-16 sm:top-20 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProfileTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            postsCount={profile.posts_count}
            userRole={profile.role || 'user'}
          />
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto">
        <div className="min-h-[60vh] py-8">
          {renderTabContent()}
        </div>
      </div>

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