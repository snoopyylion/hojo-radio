"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { UserResource } from '@clerk/types';
import { useAuth, useUser } from "@clerk/nextjs";
import { ProfileHeader } from '@/components/UserProfile/ProfileHeader';
import { gsap } from "gsap";
import {
  TrendingUp,
  CheckCircle,
  User,
  Crown,
  BarChart3,
  Calendar,
  Eye,
  Edit3,
  Heart,
  MessageCircle,
} from "lucide-react";
import VerifiedList from '@/components/VerifiedList';
import { FollowersFollowingSection } from '@/components/Dashboard/FollowersFollowingSection';
import LinkButton from "@/components/LinkButton";
import PageLoader from '@/components/PageLoader';
import { useUserLikes } from '../../../hooks/user-likes/useUserLikes';
import { useUserComments } from '../../../hooks/user-comments/useUserComments';
import { useUserCreatedAt, useUserMemberSince } from '../../../hooks/user-created/useUserCreatedAt';
import UserStatsSection from "@/components/Dashboard/UderStatsSection";
import { AuthorPostsSection } from '@/components/UserProfile/AuthorPostsSection';
import WeeklyTopPosts from "@/components/WeeklyTopPosts";

// Fixed UserProfile interface - added missing updated_at
interface UserProfile {
  id: string; // Changed from id?: string to id: string
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role: "user" | "author";
  image_url?: string;
  profile_completed?: boolean;
  bio?: string;
  location?: string;
  created_at: string;
  updated_at: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
}

// Update your TopPost interface to match the API response
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

// Fixed transform function with proper null checks
const transformUserProfileForHeaderV2 = (userProfile: UserProfile, user: UserResource): UserProfile => {
  // Use the dates from userProfile first (from Supabase), then fall back to Clerk
  const createdAt = userProfile.created_at || (user.createdAt?.toISOString() ?? new Date().toISOString());
  const updatedAt = userProfile.updated_at || (user.updatedAt?.toISOString() ?? new Date().toISOString());

  return {
    id: user.id,
    first_name: userProfile.first_name,
    last_name: userProfile.last_name,
    username: userProfile.username,
    email: userProfile.email,
    role: userProfile.role as "user" | "author",
    image_url: userProfile.image_url,
    profile_completed: userProfile.profile_completed,
    bio: userProfile.bio ?? '',
    location: userProfile.location ?? '',
    created_at: createdAt,
    updated_at: updatedAt,
    followers_count: userProfile.followers_count ?? 0,
    following_count: userProfile.following_count ?? 0,
    posts_count: userProfile.posts_count ?? 0
  };
};


export default function UserDashboard() {
  const { user, isLoaded } = useUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const { getToken } = useAuth();
  const [verifiedNewsCount, setVerifiedNewsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    stage: 'loading',
    message: 'Initializing your dashboard...',
    progress: 0
  });
  const [requestSent, setRequestSent] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'comments' | 'verified' | 'my-posts' | 'author'>('overview');
  const [, setTabLoading] = useState(false);
  const { totalLikes: userLikedPosts } = useUserLikes();
  const {
    totalComments,
    commentsThisMonth,
    commentsToday,
    recentComments,
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

  // Updated fetchProfileStats function with better error handling and logging
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

      // Fetch all stats concurrently to avoid race conditions
      const [followersPromise, followingPromise, postsPromise] = await Promise.allSettled([
        // Followers
        fetch(`/api/follow?type=followers&userId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : null),

        // Following  
        fetch(`/api/follow?type=following&userId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : null),

        // Posts (only if user is author)
        userProfile?.role === 'author'
          ? fetch(`/api/users/${user.id}/posts`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => res.ok ? res.json() : null)
          : Promise.resolve(null)
      ]);

      // Process followers
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

      // Process following
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

      // Process posts
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

      // Update all states in batch to prevent multiple re-renders
      setFollowersCount(newFollowersCount);
      setFollowingCount(newFollowingCount);
      setPostsCount(newPostsCount);

      // Update userProfile with a functional update to ensure consistency
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

  // Function to fetch verified news count
  const fetchVerifiedNewsCount = async () => {
    try {
      setLoadingState({
        stage: 'syncing',
        message: 'Fetching verified news data...',
        progress: 60
      });

      const token = await getToken();
      const res = await fetch('/api/news-verification/verification-list?page=1&limit=1000', {
        headers: {
          Authorization: `Bearer ${token}`,
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
        console.error('Failed to fetch verified news count');
        setVerifiedNewsCount(0);
      }
    } catch (error) {
      console.error('Error fetching verified news count:', error);
      setVerifiedNewsCount(0);
    }
  };

  const fetchTopPosts = async () => {
  try {
    setLoadingState({
      stage: 'syncing',
      message: 'Loading top posts...',
      progress: 70
    });

    const token = await getToken();
    console.log('🔄 Fetching top posts...');
    
    const response = await fetch('/api/post/top-weekly?limit=5', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Log the response status and headers for debugging
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      // Get error details from response
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch (parseError) {
        errorDetails = { error: 'Failed to parse error response' };
      }
      
      console.error('❌ API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        details: errorDetails
      });
      
      // Handle specific error cases
      if (response.status === 401) {
        console.error('❌ Authentication failed - token may be expired');
        throw new Error('Authentication failed. Please try logging in again.');
      } else if (response.status === 403) {
        console.error('❌ Access forbidden');
        throw new Error('Access denied. You may not have permission to view this content.');
      } else if (response.status === 500) {
        console.error('❌ Server error:', errorDetails);
        throw new Error(errorDetails.error || 'Server error occurred');
      } else {
        throw new Error(`API request failed with status ${response.status}: ${errorDetails.error || response.statusText}`);
      }
    }

    const data = await response.json();
    console.log('📊 Top posts data received:', {
      postsCount: data.posts?.length || 0,
      period: data.period,
      total: data.total
    });

    setTopPosts(data.posts || []);
    
  } catch (error) {
    console.error('❌ Error in fetchTopPosts:', error);
    
    // Set empty posts array to prevent UI issues
    setTopPosts([]);
    
    // Re-throw the error so it can be handled by the calling function
    throw error;
  }
};

// Enhanced refreshTopPosts with user feedback
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}

// Usage in your refreshTopPosts function:
const refreshTopPosts = async () => {
  setTabLoading(true);
  try {
    await fetchTopPosts();
    console.log('✅ Top posts refreshed successfully');
  } catch (error) {
    console.error('❌ Failed to refresh top posts:', error);
    
    // Show user-friendly error message
    alert(`Failed to refresh posts: ${getErrorMessage(error)}`);
  } finally {
    setTabLoading(false);
  }
};


  const fetchUserData = useCallback(async () => {
  if (!user?.id) {
    console.log("❌ No user ID available");
    return;
  }

  setLoading(true);
  try {
    // Stage 1: Loading user profile
    setLoadingState({
      stage: 'loading',
      message: 'Loading your profile...',
      progress: 25
    });

    // Fetch user profile from Supabase
    const token = await getToken();
    
    // First, sync user data with Supabase
    const syncResponse = await fetch('/api/users/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id,
        email: user.emailAddresses?.[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
      }),
    });

    if (!syncResponse.ok) {
      console.error('Failed to sync user data');
    }

    // Fetch user profile
    setLoadingState({
      stage: 'loading',
      message: 'Fetching your profile...',
      progress: 40
    });

    const profileResponse = await fetch(`/api/users/${user.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      setUserProfile(profileData);
      console.log('✅ User profile loaded:', profileData);
    } else {
      console.error('Failed to fetch user profile');
      // Create a basic profile if fetch fails
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
      });
    }

    // Stage 2: Fetch verified news count
    setLoadingState({
      stage: 'syncing',
      message: 'Fetching verified news data...',
      progress: 60
    });
    
    await fetchVerifiedNewsCount();

    // Stage 3: Fetch top posts
    await fetchTopPosts();

    // Stage 4: Finalizing
    setLoadingState({
      stage: 'finalizing',
      message: 'Preparing your dashboard...',
      progress: 85
    });

    // Complete loading
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
    setLoading(false);
  }
}, [user?.id, user, getToken]);



  // Add useEffect to refetch stats when userProfile.role changes
  useEffect(() => {
    if (userProfile && !loading && isLoaded) {
      console.log("🔄 Profile loaded, fetching stats...");
      fetchProfileStats();
    }
  }, [userProfile?.id, userProfile?.role, loading, isLoaded, fetchProfileStats]);

  useEffect(() => {
    if (isLoaded && user && !userProfile) {
      fetchUserData();
    }
  }, [isLoaded, user, userProfile, fetchUserData]);

  // Initial animations - Fixed to check for refs before animating
  useEffect(() => {
    if (!loading && headerRef.current && statsRef.current && tabsRef.current && contentRef.current) {
      const tl = gsap.timeline();

      // Set initial states - check each ref individually
      const elements = [headerRef.current, statsRef.current, tabsRef.current, contentRef.current].filter(Boolean);

      if (elements.length > 0) {
        gsap.set(elements, {
          opacity: 0,
          y: 30
        });

        // Animate elements in sequence
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

  const handleRequestAuthorAccess = async () => {
    // Fixed: Added null check for user
    if (!user?.id) return;

    try {
      const payload = {
        userId: user.id,
        email: user.emailAddresses?.[0]?.emailAddress // Fixed: Added optional chaining
      };

      const res = await fetch("/api/authors/request-author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setRequestSent(true);
        // Animate success feedback - check if element exists
        const button = document.querySelector('[data-author-request]');
        if (button) {
          gsap.to(button, {
            scale: 0.95,
            duration: 0.1,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
          });
        }
      } else {
        alert("Failed to send request. Please try again.");
      }
    } catch (error) {
      console.error("Request failed:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  const handleTabClick = async (tab: typeof activeTab, event: React.MouseEvent) => {
    if (tab === activeTab) return;

    // Show tab loading for certain tabs that might need data fetching
    if (tab === 'verified' || tab === 'posts') {
      setTabLoading(true);

      // Simulate async operation (replace with actual data fetching if needed)
      await new Promise(resolve => setTimeout(resolve, 800));

      setTabLoading(false);
    }

    setActiveTab(tab);

    // Animate tab switch - check if element exists
    if (event.currentTarget) {
      gsap.to(event.currentTarget, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut"
      });
    }

    // Animate content change - check if ref exists
    if (contentRef.current) {
      gsap.fromTo(contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };



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

  return (
    <div ref={containerRef} className="min-h-screen bg-white dark:bg-black pt-[80px] transition-colors duration-300 pb-[100px]">
      {/* Header Section */}
      <div ref={headerRef} className="bg-white dark:bg-black opacity-0 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <ProfileHeader
            profile={{
              ...transformUserProfileForHeaderV2(userProfile, user),
              id: user.id, // Explicitly ensure id is present
              followers_count: followersCount,
              following_count: followingCount,
              posts_count: userProfile?.role === 'author' ? postsCount : 0
            }}
            currentUserId={user.id}
            isFollowing={false}
            followLoading={false}
            onFollow={() => { }}
            onOpenFollowers={handleFollowersClick}
            onOpenFollowing={handleFollowingClick}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div ref={tabsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 opacity-0">
        <div className="border-b border-gray-200 dark:border-gray-700 transition-colors">
          <nav className="-mb-px flex space-x-2 sm:space-x-8 overflow-x-auto scrollbar-hide">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'posts', label: 'Top Posts', icon: TrendingUp },
              { id: 'verified', label: 'Verified News', icon: CheckCircle },
              ...(userProfile?.role === 'author' ? [{ id: 'my-posts', label: 'My Posts', icon: Edit3 }] : []),
              { id: 'comments', label: 'My Comments', icon: MessageCircle },
              { id: 'author', label: 'Author Access', icon: Crown }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={(e) => handleTabClick(tab.id as typeof activeTab, e)}
                  className={`flex items-center space-x-2 py-4 px-1 sm:px-3 border-b-2 font-medium text-sm transition-colors font-sora whitespace-nowrap ${activeTab === tab.id
                    ? 'border-[#EF3866] text-[#EF3866]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Section - Enhanced for responsiveness */}
      <div
        ref={contentRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 opacity-0 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
      >
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Stats */}
            <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 font-sora transition-colors">Account Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 font-sora transition-colors">Role</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium font-sora ${userProfile.role === 'author'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                    } transition-colors`}>
                    {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 font-sora transition-colors">Username</span>
                  <span className="text-gray-900 dark:text-white font-sora transition-colors">@{userProfile.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 font-sora transition-colors">Comments Made</span>
                  <span className="text-gray-900 dark:text-white font-sora transition-colors">
                    {commentsLoading ? (
                      <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-8 inline-block"></span>
                    ) : (
                      totalComments
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 font-sora transition-colors">Member Since</span>
                  <span className="text-gray-900 dark:text-white font-sora transition-colors">
                    {createdAtLoading ? (
                      <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-20 inline-block"></span>
                    ) : (
                      memberSince || "Apr 2025"
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 font-sora transition-colors">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-sora transition-colors">Viewed 5 verified articles today</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-sora transition-colors">Dashboard accessed</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-sora transition-colors">Profile updated</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-sora transition-colors">{createdAtLoading ? (
                    <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-12 inline-block"></span>
                  ) : (
                    `${daysSinceJoining} days active`
                  )}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div>
                <WeeklyTopPosts/>
          </div>
        )}

        {activeTab === 'my-posts' && (
          <div>
            <div className="mb-6">
            </div>
            <AuthorPostsSection
              userId={userProfile.id}
              isAuthor={userProfile.role === 'author'}
              userName={`${userProfile.first_name} ${userProfile.last_name}`}
            />
          </div>
        )}

        {activeTab === 'comments' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-sora transition-colors">My Comments</h2>
              <p className="text-gray-600 dark:text-gray-400 font-sora transition-colors">All your comments across the platform</p>
            </div>

            {/* Comment Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white font-sora transition-colors">
                    {commentsLoading ? (
                      <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-8 w-16 inline-block"></span>
                    ) : (
                      totalComments
                    )}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-sora transition-colors">Total Comments</p>
                </div>
              </div>

              <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white font-sora transition-colors">
                    {commentsLoading ? (
                      <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-8 w-16 inline-block"></span>
                    ) : (
                      commentsThisMonth
                    )}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-sora transition-colors">This Month</p>
                </div>
              </div>

              <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white font-sora transition-colors">
                    {commentsLoading ? (
                      <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-8 w-16 inline-block"></span>
                    ) : (
                      commentsToday
                    )}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-sora transition-colors">Today</p>
                </div>
              </div>
            </div>

            {/* Recent Comments */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white font-sora transition-colors">Recent Comments</h3>
              {commentsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentComments.length > 0 ? (
                <div className="space-y-4">
                  {recentComments.map((comment) => (
                    <div key={comment.id} className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300 hover:shadow-md">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-900 dark:text-white font-sora transition-colors mb-2">
                            {comment.comment}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 transition-colors">
                            <span className="font-sora">On: {comment.post_title}</span>
                            <span className="font-sora">
                              {new Date(comment.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 font-sora transition-colors">
                    You haven&apos;t made any comments yet. Start engaging with posts to see your comments here!
                  </p>
                </div>
              )}
            </div>
          </div>
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
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-sora transition-colors">Author Access</h2>
              <p className="text-gray-600 dark:text-gray-400 font-sora transition-colors">Apply to become a content author on HOJO</p>
            </div>
            <div className="bg-white dark:bg-black rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
              {userProfile.role === 'author' ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                    <Crown className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-sora transition-colors">You&apos;re an Author!</h3>
                  <p className="text-gray-600 dark:text-gray-400 font-sora transition-colors">You can now create and publish posts on HOJO.</p>
                  <div className="mt-4 items-center justify-center flex space-x-4">
                    <LinkButton title="Create Blog" href="/post/create-post" />
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                    <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-sora transition-colors">Become an Author</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 font-sora transition-colors">
                    Join our community of content creators and share your expertise with the world.
                  </p>

                  {requestSent ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 transition-colors">
                      <div className="flex items-center justify-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="text-green-800 dark:text-green-400 font-medium font-sora transition-colors">
                          Request submitted successfully! We&apos;ll review your application shortly.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      data-author-request
                      onClick={handleRequestAuthorAccess}
                      className="px-6 py-3 bg-[#EF3866] text-white rounded-lg font-semibold font-sora hover:bg-[#D53059] transition-colors shadow-sm"
                    >
                      Request Author Access
                    </button>
                  )}

                  <div className="mt-6 text-left">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 font-sora transition-colors">Author Benefits:</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="font-sora">Publish articles and blog posts</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="font-sora">Create podcasts and audio content</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="font-sora">Access to analytics and insights</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="font-sora">Community engagement tools</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Stats Section */}
      <div ref={statsRef} className="bg-white dark:bg-black rounded-2xl overflow-hidden transition-all duration-300 opacity-0">
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