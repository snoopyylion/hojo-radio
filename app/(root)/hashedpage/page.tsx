// Updated UserDashboard Component with Merged Layout
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from "@clerk/nextjs";
import { ProfileHeader } from '@/components/UserProfile/ProfileHeader';
import { gsap } from "gsap";
import { TrendingUp, CheckCircle, Crown, BarChart3, Edit3, MessageCircle, Bookmark } from "lucide-react";
import VerifiedList from '@/components/VerifiedList';
import { FollowersFollowingSection } from '@/components/Dashboard/FollowersFollowingSection';
import PageLoader from '@/components/PageLoader';
import { useUserLikes } from '../../../hooks/user-likes/useUserLikes';
import { useUserComments } from '../../../hooks/user-comments/useUserComments';
import { useUserCreatedAt, useUserMemberSince } from '../../../hooks/user-created/useUserCreatedAt';
import UserStatsSection from "@/components/Dashboard/UderStatsSection";
import { AuthorPostsSection } from '@/components/UserProfile/AuthorPostsSection';
import WeeklyTopPosts from "@/components/WeeklyTopPosts";
import AuthorAccessSection from "@/components/Dashboard/AuthorAccessSection";
import CommentsSection from "@/components/Dashboard/CommentsSection";
import BookmarksSection from "@/components/Dashboard/Bookmarks";
import { Button } from "@/components/ui/button";

// ProfileTabs Component
interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  postsCount: number;
  userRole: string;
  dashboardTabs: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  onTabChange,
  dashboardTabs
}) => {
  return (
    <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
      {dashboardTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#EF3866] text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
};

// Fixed UserProfile interface
interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role: "user" | "author";
  image_url?: string;
  profile_completed?: boolean;
  bio?: string;
  location?: string;
  website?: string;
  phone?: string;
  date_of_birth?: string;
  created_at: string;
  updated_at: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
}

interface TopPost {
  id: string;
  title: string;
  excerpt: string;
  views: number;
  likes: number;
  comments: number;
  created_at: string;
  author: string;
  author_id: string;
  slug?: string;
}

interface LoadingState {
  stage: 'loading' | 'syncing' | 'finalizing' | 'complete';
  message: string;
  progress: number;
}

export default function UserDashboard() {
  const { user, isLoaded } = useUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [, setTopPosts] = useState<TopPost[]>([]);
  const { getToken } = useAuth();
  const [verifiedNewsCount, setVerifiedNewsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    stage: 'loading',
    message: 'Initializing your dashboard...',
    progress: 0
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'comments' | 'verified' | 'my-posts' | 'author' | 'bookmarks'>('overview');
  const [, setTabLoading] = useState(false);
  const { totalLikes: userLikedPosts } = useUserLikes();
  const {
    totalComments,
    loading: commentsLoading
  } = useUserComments();
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const { loading: createdAtLoading } = useUserCreatedAt();
  const { memberSince, daysSinceJoining } = useUserMemberSince();
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following'>('followers');

  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // Updated fetchProfileStats function
  const fetchProfileStats = useCallback(async () => {
    if (!user?.id) {
      console.log("❌ No user ID available for fetching stats");
      return;
    }

    try {
      console.log("🔄 Fetching profile stats for user:", user.id);
      const token = await getToken();
      let newFollowersCount = 0;
      let newFollowingCount = 0;
      let newPostsCount = 0;

      // Fetch all stats concurrently
      const [followersPromise, followingPromise, postsPromise] = await Promise.allSettled([
        fetch(`/api/follow?type=followers&userId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : null),

        fetch(`/api/follow?type=following&userId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : null),

        userProfile?.role === 'author'
          ? fetch(`/api/users/${user.id}/posts`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => res.ok ? res.json() : null)
          : Promise.resolve(null)
      ]);

      // Process results
      if (followersPromise.status === 'fulfilled' && followersPromise.value) {
        const followersData = followersPromise.value;
        if (Array.isArray(followersData)) {
          newFollowersCount = followersData.length;
        } else if (typeof followersData.count === 'number') {
          newFollowersCount = followersData.count;
        } else if (followersData.followers && Array.isArray(followersData.followers)) {
          newFollowersCount = followersData.followers.length;
        }
      }

      if (followingPromise.status === 'fulfilled' && followingPromise.value) {
        const followingData = followingPromise.value;
        if (Array.isArray(followingData)) {
          newFollowingCount = followingData.length;
        } else if (typeof followingData.count === 'number') {
          newFollowingCount = followingData.count;
        } else if (followingData.following && Array.isArray(followingData.following)) {
          newFollowingCount = followingData.following.length;
        }
      }

      if (postsPromise.status === 'fulfilled' && postsPromise.value && userProfile?.role === 'author') {
        const postsData = postsPromise.value;
        if (Array.isArray(postsData)) {
          newPostsCount = postsData.length;
        } else if (typeof postsData.count === 'number') {
          newPostsCount = postsData.count;
        } else if (postsData.posts && Array.isArray(postsData.posts)) {
          newPostsCount = postsData.posts.length;
        }
      }

      console.log("📊 Final counts:", { newFollowersCount, newFollowingCount, newPostsCount });

      // Update states
      setFollowersCount(newFollowersCount);
      setFollowingCount(newFollowingCount);
      setPostsCount(newPostsCount);

      // Update userProfile with current stats
      setUserProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          followers_count: newFollowersCount,
          following_count: newFollowingCount,
          posts_count: prev.role === 'author' ? newPostsCount : 0
        };
      });

    } catch (error) {
      console.error('❌ Error fetching profile stats:', error);
    }
  }, [user?.id, getToken, userProfile?.role]);

  const handleFollowersClick = () => {
    setFollowersModalTab('followers');
    setShowFollowersModal(true);
  };

  const handleFollowingClick = () => {
    setFollowersModalTab('following');
    setShowFollowersModal(true);
  };

  const handleCloseFollowersModal = () => {
    setShowFollowersModal(false);
  };

  // Function to fetch top posts
  const fetchTopPosts = useCallback(async () => {
    try {
      setLoadingState({
        stage: 'syncing',
        message: 'Loading top posts...',
        progress: 70
      });

      const token = await getToken();
      console.log('🔄 Fetching top posts...');

      const response = await fetch('/api/post/top-weekly?limit=5', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setTopPosts(data.posts || []);

    } catch (error) {
      console.error('❌ Error in fetchTopPosts:', error);
      setTopPosts([]);
      throw error;
    }
  }, [getToken]);

  // Function to fetch verified news count
  const fetchVerifiedNewsCount = useCallback(async () => {
    try {
      setLoadingState({
        stage: 'syncing',
        message: 'Fetching verified news data...',
        progress: 60
      });

      const token = await getToken();
      const res = await fetch('/api/news-verification/verification-list?page=1&limit=1000', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.verifications)) {
          setVerifiedNewsCount(json.verifications.length);
        } else {
          setVerifiedNewsCount(0);
        }
      } else {
        setVerifiedNewsCount(0);
      }
    } catch (error) {
      console.error('Error fetching verified news count:', error);
      setVerifiedNewsCount(0);
    }
  }, [getToken]);

  // Main function to fetch user data
  const fetchUserData = useCallback(async () => {
    if (!user?.id) {
      console.log("❌ No user ID available");
      return;
    }

    setLoading(true);
    try {
      setLoadingState({
        stage: 'loading',
        message: 'Loading your profile...',
        progress: 25
      });

      const token = await getToken();

      // First sync user data
      setLoadingState({
        stage: 'loading',
        message: 'Syncing user data...',
        progress: 30
      });

      try {
        const syncResponse = await fetch('/api/sync-user', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!syncResponse.ok) {
          console.warn(`Sync failed with status ${syncResponse.status}`);
        } else {
          console.log('✅ User data synced successfully');
        }
      } catch (syncError) {
        console.warn('User sync failed, continuing without sync:', syncError);
      }

      // Fetch user profile
      setLoadingState({
        stage: 'loading',
        message: 'Fetching your profile...',
        progress: 40
      });

      try {
        const profileResponse = await fetch('/api/user/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();

          // Create the profile object with the ACTUAL data from the database
          const newProfile: UserProfile = {
            id: user.id,
            first_name: profileData.first_name || user.firstName || '',
            last_name: profileData.last_name || user.lastName || '',
            username: profileData.username || user.username || user.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'user',
            email: profileData.email || user.emailAddresses?.[0]?.emailAddress || '',
            role: profileData.role || 'user' as const,
            image_url: profileData.image_url || user.imageUrl,
            profile_completed: profileData.profile_completed || false,
            bio: profileData.bio || '',
            location: profileData.location || '',
            website: profileData.website || '',
            phone: profileData.phone || '',
            date_of_birth: profileData.date_of_birth || '',
            created_at: profileData.created_at || user.createdAt?.toISOString() || new Date().toISOString(),
            updated_at: profileData.updated_at || user.updatedAt?.toISOString() || new Date().toISOString(),
            followers_count: 0,
            following_count: 0,
            posts_count: 0
          };

          setUserProfile(newProfile);
          console.log('✅ User profile loaded from API:', newProfile);
        } else {
          createFallbackProfile();
        }
      } catch (profileError) {
        console.error('Profile fetch error:', profileError);
        createFallbackProfile();
      }

      // Fetch other data
      try {
        await fetchVerifiedNewsCount();
      } catch (verifiedError) {
        console.warn('Failed to fetch verified news count:', verifiedError);
        setVerifiedNewsCount(0);
      }

      try {
        await fetchTopPosts();
      } catch (postsError) {
        console.warn('Failed to fetch top posts:', postsError);
        setTopPosts([]);
      }

      setLoadingState({
        stage: 'finalizing',
        message: 'Preparing your dashboard...',
        progress: 85
      });

      setLoadingState({
        stage: 'complete',
        message: 'Dashboard ready!',
        progress: 100
      });

      setTimeout(() => {
        setLoading(false);
      }, 500);

    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      createFallbackProfile();
      setLoading(false);
    }

    // Helper function to create fallback profile
    function createFallbackProfile() {
      if (!user) {
        console.error('Cannot create fallback profile: user is null or undefined');
        return;
      }

      console.log('Creating fallback profile...');
      setUserProfile({
        id: user.id,
        first_name: user.firstName || '',
        last_name: user.lastName || '',
        username: user.username || user.emailAddresses?.[0]?.emailAddress?.split('@')[0] || '',
        email: user.emailAddresses?.[0]?.emailAddress || '',
        role: 'user' as const,
        image_url: user.imageUrl,
        created_at: user.createdAt?.toISOString() || new Date().toISOString(),
        updated_at: user.updatedAt?.toISOString() || new Date().toISOString(),
        followers_count: 0,
        following_count: 0,
        posts_count: 0,
      });
    }
  }, [user?.id, user, getToken, fetchTopPosts, fetchVerifiedNewsCount]);

  const refreshProfileData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const token = await getToken();
      const response = await fetch('/api/user/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const profileData = await response.json();
        setUserProfile(prev => ({
          ...prev!,
          ...profileData,
          followers_count: followersCount,
          following_count: followingCount,
          posts_count: postsCount
        }));
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  }, [user?.id, getToken, followersCount, followingCount, postsCount]);

  // Add useEffect to refetch stats when userProfile.role changes
  useEffect(() => {
    if (userProfile && !loading && isLoaded) {
      fetchProfileStats();
    }
  }, [userProfile, loading, isLoaded, fetchProfileStats]);

  useEffect(() => {
    if (isLoaded && user && !userProfile) {
      fetchUserData();
    }
  }, [isLoaded, user, userProfile, fetchUserData]);

  // Initial animations
  useEffect(() => {
    if (!loading && headerRef.current && statsRef.current && tabsRef.current && contentRef.current) {
      const tl = gsap.timeline();

      const elements = [headerRef.current, statsRef.current, tabsRef.current, contentRef.current].filter(Boolean);

      if (elements.length > 0) {
        gsap.set(elements, {
          opacity: 0,
          y: 30
        });

        tl.to(headerRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out"
        })
          .to(statsRef.current, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out"
          }, "-=0.3")
          .to(tabsRef.current, {
            opacity: 1,
            y: 0,
            duration: 0.4,
            ease: "power2.out"
          }, "-=0.2")
          .to(contentRef.current, {
            opacity: 1,
            y: 0,
            duration: 0.4,
            ease: "power2.out"
          }, "-=0.1");
      }
    }
  }, [loading]);
  

  const handleTabClick = async (tab: typeof activeTab, event?: React.MouseEvent) => {
    if (tab === activeTab) return;

    if (tab === 'verified' || tab === 'posts' || tab === 'bookmarks') {
      setTabLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setTabLoading(false);
    }

    setActiveTab(tab);

    if (event?.currentTarget) {
      gsap.to(event.currentTarget, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut"
      });
    }

    if (contentRef.current) {
      gsap.fromTo(contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
    }
  };

  useEffect(() => {
    const handleFocus = () => {
      // Refresh profile data when user returns to dashboard
      if (document.visibilityState === 'visible') {
        refreshProfileData();
      }
    };

    document.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshProfileData]);

  // Show PageLoader during initial loading
  if (!isLoaded || loading) {
    return (
      <PageLoader
        message={loadingState.message}
        stage={loadingState.stage}
        progress={loadingState.progress}
        showProgress={true}
        showSteps={true}
        size="md"
      />
    );
  }

  if (!user || !userProfile) {
    return (
      <PageLoader
        message="Unable to load user data"
        stage="loading"
        progress={0}
        showProgress={false}
        size="md"
      />
    );
  }

  // Define styles
  const styles = {
    container: "min-h-screen bg-gray-50/50 dark:bg-gray-900/20 pt-[100px] pb-[100px]",
    profileContainer: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8",
    contentArea: "flex-1 flex flex-col gap-6",
    tabContent: "min-h-[60vh]",
    sectionTitle: "text-3xl font-bold dark:text-white",
    aboutCard: "bg-white/70 dark:bg-black/70 backdrop-blur-md rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-8",
    cardGrid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
    emptyStateContainer: "flex flex-col items-center justify-center py-20 px-4",
    emptyStateTitle: "text-2xl font-light text-gray-900 dark:text-white mb-4 tracking-tight",
    emptyStateText: "text-gray-600 dark:text-gray-400 text-center max-w-md leading-relaxed font-light"
  };

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Profile Section */}
      <section className={styles.profileContainer}>
        {/* Profile Card (Left Side) */}
        <div className="" ref={headerRef}>
          <ProfileHeader
            profile={{
              ...userProfile,
              followers_count: followersCount,
              following_count: followingCount,
              posts_count: userProfile.role === 'author' ? postsCount : 0
            }}
            currentUserId={user.id}
            isFollowing={false}
            followLoading={false}
            onFollow={() => {}}
            onOpenFollowers={handleFollowersClick}
            onOpenFollowing={handleFollowingClick}
          />
        </div>

        {/* Content Area (Right Side) */}
        <div className={styles.contentArea}>
          {/* Tab Navigation */}
          <div className="bg-white/80 dark:bg-black/80 backdrop-blur-lg rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-2 shadow-sm" ref={tabsRef}>
            <ProfileTabs
              activeTab={activeTab}
              onTabChange={(tab) => handleTabClick(tab as typeof activeTab)}
              postsCount={postsCount}
              userRole={userProfile.role || 'user'}
              dashboardTabs={[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'posts', label: 'Top Posts', icon: TrendingUp },
                { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
                { id: 'verified', label: 'Verified News', icon: CheckCircle },
                ...(userProfile?.role === 'author' ? [{ id: 'my-posts', label: 'My Posts', icon: Edit3 }] : []),
                { id: 'comments', label: 'My Comments', icon: MessageCircle },
                { id: 'author', label: 'Author Access', icon: Crown }
              ]}
            />
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent} ref={contentRef}>
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Account Overview */}
                <div className="rounded-2xl p-6 border bg-white/70 dark:bg-black/70 backdrop-blur-md border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white font-sora">Account Overview</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/hashedpage/profile')}
                      className="flex items-center gap-2 border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Profile
                    </Button>
                  </div>
                  <div className="space-y-5 text-sm font-sora">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-zinc-400">Role</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${userProfile.role === 'author' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                        {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-zinc-400">Username</span>
                      <span className="text-gray-900 dark:text-white">@{userProfile.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-zinc-400">Comments Made</span>
                      <span className="text-gray-900 dark:text-white">
                        {commentsLoading ? (
                          <span className="animate-pulse bg-gray-200 dark:bg-zinc-700 rounded h-4 w-8 inline-block"></span>
                        ) : (
                          totalComments
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-zinc-400">Member Since</span>
                      <span className="text-gray-900 dark:text-white">
                        {createdAtLoading ? (
                          <span className="animate-pulse bg-gray-200 dark:bg-zinc-700 rounded h-4 w-20 inline-block"></span>
                        ) : (
                          memberSince || new Date(userProfile.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long'
                          })
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-2xl p-6 border bg-white/70 dark:bg-black/70 backdrop-blur-md border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-5 font-sora">Recent Activity</h3>
                  <div className="space-y-3 text-sm font-sora">
                    {[
                      { color: 'bg-green-500', text: 'Viewed 5 verified articles today' },
                      { color: 'bg-blue-500', text: 'Dashboard accessed' },
                      { color: 'bg-purple-500', text: 'Profile updated' },
                    ].map(({ color, text }, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${color}`}></div>
                        <span className="text-gray-600 dark:text-zinc-400">{text}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-gray-600 dark:text-zinc-400">
                        {createdAtLoading ? (
                          <span className="animate-pulse bg-gray-200 dark:bg-zinc-700 rounded h-4 w-12 inline-block"></span>
                        ) : (
                          `${daysSinceJoining} days active`
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'posts' && (
              <div>
                <WeeklyTopPosts />
              </div>
            )}

            {activeTab === 'bookmarks' && (
              <div>
                <BookmarksSection />
              </div>
            )}

            {activeTab === 'my-posts' && (
              <div>
                <AuthorPostsSection
                  userId={userProfile.id}
                  isAuthor={userProfile.role === 'author'}
                  userName={`${userProfile.first_name} ${userProfile.last_name}`}
                />
              </div>
            )}

            {activeTab === 'comments' && (
              <div><CommentsSection /></div>
            )}

            {activeTab === 'verified' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-sora transition-colors">HOJO AI Verified News</h2>
                  <p className="text-gray-600 dark:text-gray-400 font-sora transition-colors">AI-powered fact-checking and verification results</p>
                </div>
                <VerifiedList />
              </div>
            )}

            {activeTab === 'author' && (
              <div>
                <AuthorAccessSection userProfile={userProfile} user={user} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <div ref={statsRef} className="">
        <UserStatsSection
          userLikedPosts={userLikedPosts}
          totalComments={totalComments}
          verifiedNewsCount={verifiedNewsCount}
          likesLoading={loading}
          commentsLoading={loading}
          verifiedLoading={loading}
        />
      </div>

      {showFollowersModal && (
        <FollowersFollowingSection
          isModal={true}
          onClose={handleCloseFollowersModal}
          initialTab={followersModalTab}
        />
      )}
    </div>
  );
}