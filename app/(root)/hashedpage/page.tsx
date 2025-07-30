// Updated UserDashboard Component with Merged Layout
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from "@clerk/nextjs";
import { ProfileHeader } from '@/components/UserProfile/ProfileHeader';
import { gsap } from "gsap";
import { TrendingUp, CheckCircle, Crown, BarChart3, Edit3, MessageCircle, Bookmark, Download } from "lucide-react";
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
import { SmartUserActivityFeed } from '@/components/Dashboard/UserActivityFeed';
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
            className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
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
  const [activeTab, setActiveTab] = useState<'overview' | 'profile-details' | 'posts' | 'comments' | 'verified' | 'my-posts' | 'author' | 'bookmarks'>('overview');
  const [, setTabLoading] = useState(false);
  const { totalLikes: userLikedPosts } = useUserLikes();
  const {
    totalComments
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
            onFollow={() => { }}
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
  <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-0">
    {/* Header Section - Fully responsive */}
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
      {/* Profile Info Section */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 w-full">
        {userProfile.image_url && (
          <div className="relative flex-shrink-0">
            <img
              src={userProfile.image_url}
              alt={`${userProfile.first_name} ${userProfile.last_name}`}
              className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg sm:rounded-xl object-cover border-2 border-gray-200 dark:border-gray-700 shadow-sm"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-emerald-500 border-2 sm:border-3 border-white dark:border-gray-900 rounded-full shadow-sm"></div>
          </div>
        )}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight break-words">
            {userProfile.first_name} {userProfile.last_name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 font-medium mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg break-all">@{userProfile.username}</p>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mt-2 sm:mt-3">
            <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
              userProfile.profile_completed 
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' 
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
            }`}>
              {userProfile.profile_completed ? 'Profile Complete' : 'Profile Incomplete'}
            </span>
            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
              {userProfile.role}
            </span>
          </div>
        </div>
      </div>
      
      {/* Edit Profile Button */}
      <div className="flex justify-center sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/hashedpage/profile')}
          className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 rounded-lg font-medium shadow-sm hover:shadow-md flex-shrink-0 w-full sm:w-auto justify-center text-sm sm:text-base"
        >
          <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
          Edit Profile
        </Button>
      </div>
    </div>

    {/* Stats Cards - Responsive grid */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl flex items-center justify-center">
            <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-gray-600 dark:bg-gray-400 rounded"></div>
          </div>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2">Role</p>
          <p className="text-gray-900 dark:text-white text-lg sm:text-xl lg:text-2xl font-bold capitalize leading-tight">
            {userProfile.role}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl flex items-center justify-center">
            <div className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded ${userProfile.profile_completed ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
          </div>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2">Status</p>
          <p className="text-gray-900 dark:text-white text-lg sm:text-xl lg:text-2xl font-bold leading-tight">
            {userProfile.profile_completed ? 'Complete' : 'Incomplete'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl flex items-center justify-center">
            <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-blue-500 rounded"></div>
          </div>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2">Active Days</p>
          <p className="text-gray-900 dark:text-white text-lg sm:text-xl lg:text-2xl font-bold leading-tight">
            {createdAtLoading ? (
              <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 sm:h-7 lg:h-8 w-12 sm:w-14 lg:w-16 inline-block"></span>
            ) : (
              `${daysSinceJoining}`
            )}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl flex items-center justify-center">
            <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-purple-500 rounded"></div>
          </div>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2">Member Since</p>
          <p className="text-gray-900 dark:text-white text-sm sm:text-base lg:text-lg font-bold leading-tight">
            {createdAtLoading ? (
              <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-5 sm:h-6 w-16 sm:w-20 inline-block"></span>
            ) : (
              memberSince || new Date(userProfile.created_at).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric'
              })
            )}
          </p>
        </div>
      </div>
    </div>

    {/* Main Content Grid - Responsive layout */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
      {/* Account Information - Responsive columns */}
      <div className="xl:col-span-2 space-y-4 sm:space-y-6">
        {/* Personal Information Card */}
        <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-[#EF3866] to-[#EF3866]/80 rounded-full"></div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Personal Information</h3>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              <div className="space-y-4 sm:space-y-6">
                <div className="group">
                  <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 block tracking-wider uppercase">Email Address</label>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-all duration-200">
                    <span className="text-gray-900 dark:text-white font-medium text-sm sm:text-base lg:text-lg break-all">{userProfile.email}</span>
                  </div>
                </div>

                {userProfile.phone && (
                  <div className="group">
                    <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 block tracking-wider uppercase">Phone Number</label>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-all duration-200">
                      <span className="text-gray-900 dark:text-white font-medium text-sm sm:text-base lg:text-lg">{userProfile.phone}</span>
                    </div>
                  </div>
                )}

                {userProfile.location && (
                  <div className="group">
                    <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 block tracking-wider uppercase">Location</label>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-all duration-200">
                      <span className="text-gray-900 dark:text-white font-medium text-sm sm:text-base lg:text-lg break-words">{userProfile.location}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 sm:space-y-6">
                {userProfile.date_of_birth && (
                  <div className="group">
                    <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 block tracking-wider uppercase">Date of Birth</label>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-all duration-200">
                      <span className="text-gray-900 dark:text-white font-medium text-sm sm:text-base lg:text-lg">
                        {new Date(userProfile.date_of_birth).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {userProfile.website && (
                  <div className="group">
                    <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 block tracking-wider uppercase">Website</label>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-all duration-200">
                      <a
                        href={userProfile.website.startsWith('http') ? userProfile.website : `https://${userProfile.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm sm:text-base lg:text-lg transition-colors underline decoration-gray-400 hover:decoration-blue-600 dark:hover:decoration-blue-400 underline-offset-4 break-all"
                      >
                        {userProfile.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {userProfile.bio && (
              <div className="mt-6 sm:mt-8">
                <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 block tracking-wider uppercase">Biography</label>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-900 dark:text-white leading-relaxed text-sm sm:text-base lg:text-lg break-words">{userProfile.bio}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Timeline Card */}
        <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-[#EF3866] to-[#EF3866]/80 rounded-full"></div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Account Timeline</h3>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gray-400 dark:bg-gray-500 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-900 dark:text-white font-semibold text-sm sm:text-base lg:text-lg">Account Created</span>
                </div>
                <span className="text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base ml-5 sm:ml-0">
                  {createdAtLoading ? (
                    <span className="animate-pulse bg-gray-200 dark:bg-gray-600 rounded h-4 sm:h-5 w-20 sm:w-24 inline-block"></span>
                  ) : (
                    memberSince || new Date(userProfile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  )}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-900 dark:text-white font-semibold text-sm sm:text-base lg:text-lg">Last Profile Update</span>
                </div>
                <span className="text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base ml-5 sm:ml-0">
                  {new Date(userProfile.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-purple-500 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-900 dark:text-white font-semibold text-sm sm:text-base lg:text-lg">Days Active</span>
                </div>
                <span className="text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base ml-5 sm:ml-0">
                  {createdAtLoading ? (
                    <span className="animate-pulse bg-gray-200 dark:bg-gray-600 rounded h-4 sm:h-5 w-12 sm:w-16 inline-block"></span>
                  ) : (
                    `${daysSinceJoining} days`
                  )}
                </span>
              </div>

              {userProfile.role === 'author' && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-900 dark:text-white font-semibold text-sm sm:text-base lg:text-lg">Author Status</span>
                  </div>
                  <span className="text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-800/50 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ml-5 sm:ml-0 w-fit">
                    Active Author
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Sidebar - Responsive width */}
      <div className="space-y-4 sm:space-y-6">
        {/* Quick Activity Card */}
        <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-[#EF3866] to-[#EF3866]/80 rounded-full"></div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Quick Stats</h3>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="space-y-2 sm:space-y-3">
              {[
                { label: 'Viewed 5 articles today', color: 'bg-blue-500' },
                { label: 'Dashboard accessed', color: 'bg-green-500' },
                { label: 'Profile updated', color: 'bg-purple-500' },
              ].map(({ label, color }, idx) => (
                <div key={idx} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${color} flex-shrink-0`}></div>
                  <span className="text-gray-700 dark:text-gray-300 font-medium flex-1 text-sm sm:text-base break-words">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                <span className="text-gray-700 dark:text-gray-300 font-medium flex-1 text-sm sm:text-base">
                  {createdAtLoading ? (
                    <span className="animate-pulse bg-gray-200 dark:bg-gray-600 rounded h-3 sm:h-4 w-20 sm:w-24 inline-block"></span>
                  ) : (
                    `${daysSinceJoining} days active`
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-[#EF3866] to-[#EF3866]/80 rounded-full"></div>
                <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Activity Feed</h4>
              </div>
              <button
                onClick={() => router.push('/notifications')}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-xs sm:text-sm self-start sm:self-auto"
              >
                View All
              </button>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <SmartUserActivityFeed userId={userProfile.id} showFilters={false} limit={5} isOverview={true} />
          </div>
        </div>
      </div>
    </div>
  </div>
)}

            {activeTab === 'profile-details' && (
              <div className="space-y-6">
                {/* Complete Profile Information */}
                <div className="rounded-2xl p-6 border bg-white/70 dark:bg-black/70 backdrop-blur-md border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 font-sora">Complete Profile Information</h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Personal Details */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Personal Details</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">User ID</span>
                            <span className="text-gray-900 dark:text-white font-mono text-sm">{userProfile.id}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">First Name</span>
                            <span className="text-gray-900 dark:text-white">{userProfile.first_name}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Last Name</span>
                            <span className="text-gray-900 dark:text-white">{userProfile.last_name}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Username</span>
                            <span className="text-gray-900 dark:text-white">@{userProfile.username}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Email</span>
                            <span className="text-gray-900 dark:text-white">{userProfile.email}</span>
                          </div>
                          {userProfile.phone && (
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">Phone</span>
                              <span className="text-gray-900 dark:text-white">{userProfile.phone}</span>
                            </div>
                          )}
                          {userProfile.date_of_birth && (
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">Date of Birth</span>
                              <span className="text-gray-900 dark:text-white">
                                {new Date(userProfile.date_of_birth).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Account Details */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Account Details</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Role</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${userProfile.role === 'author' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                              {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Profile Status</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${userProfile.profile_completed ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
                              {userProfile.profile_completed ? 'Complete' : 'Incomplete'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Account Created</span>
                            <span className="text-gray-900 dark:text-white text-sm">
                              {new Date(userProfile.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Last Updated</span>
                            <span className="text-gray-900 dark:text-white text-sm">
                              {new Date(userProfile.updated_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {userProfile.location && (
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">Location</span>
                              <span className="text-gray-900 dark:text-white">{userProfile.location}</span>
                            </div>
                          )}
                          {userProfile.website && (
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">Website</span>
                              <a
                                href={userProfile.website.startsWith('http') ? userProfile.website : `https://${userProfile.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#EF3866] hover:underline"
                              >
                                {userProfile.website}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bio Section */}
                  {userProfile.bio && (
                    <div className="mt-8">
                      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Bio</h4>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-gray-900 dark:text-white leading-relaxed">{userProfile.bio}</p>
                      </div>
                    </div>
                  )}

                  {/* Profile Image */}
                  {userProfile.image_url && (
                    <div className="mt-8">
                      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Profile Image</h4>
                      <div className="flex items-center gap-4">
                        <img
                          src={userProfile.image_url}
                          alt={`${userProfile.first_name} ${userProfile.last_name}`}
                          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                        />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Current profile picture</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">Uploaded via authentication provider</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Data Export Section */}
                <div className="rounded-2xl p-6 border bg-white/70 dark:bg-black/70 backdrop-blur-md border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 font-sora">Data Management</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">Export Profile Data</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Download all your profile information as JSON</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const profileData = {
                            ...userProfile,
                            followers_count: followersCount,
                            following_count: followingCount,
                            posts_count: postsCount,
                            total_comments: totalComments,
                            total_likes: userLikedPosts,
                            verified_news_count: verifiedNewsCount,
                            export_date: new Date().toISOString()
                          };
                          const blob = new Blob([JSON.stringify(profileData, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `profile-data-${userProfile.username}-${new Date().toISOString().split('T')[0]}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export
                      </Button>
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