"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import { gsap } from "gsap";
import {
  TrendingUp,
  CheckCircle,
  User,
  Mail,
  Crown,
  BarChart3,
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  Shield,
} from "lucide-react";
import VerifiedList from '@/components/VerifiedList';
import LinkButton from "@/components/LinkButton";
import PageLoader from '@/components/PageLoader';
import { useUserLikes } from '../../../hooks/user-likes/useUserLikes';
import { useUserComments } from '../../../hooks/user-comments/useUserComments';
import { useUserCreatedAt, useUserMemberSince } from '../../../hooks/user-created/useUserCreatedAt';
import Image from "next/image";

interface UserProfile {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role: string;
  image_url?: string; // Make it optional since it might not exist
  profile_completed?: boolean; // Also add this if you're using it
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
}

interface LoadingState {
  stage: 'loading' | 'syncing' | 'finalizing' | 'complete';
  message: string;
  progress: number;
}

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
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'comments' | 'verified' | 'author'>('overview');
  const [, setTabLoading] = useState(false);
  const { totalLikes: userLikedPosts, loading: likesLoading } = useUserLikes();
  const {
    totalComments,
    commentsThisMonth,
    commentsToday,
    recentComments,
    loading: commentsLoading
  } = useUserComments();
  const { loading: createdAtLoading } = useUserCreatedAt();
  const { memberSince, daysSinceJoining } = useUserMemberSince();

  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  

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

  const fetchUserData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Stage 1: Loading user profile
      setLoadingState({
        stage: 'loading',
        message: 'Loading your profile...',
        progress: 25
      });

      // ✅ FIXED: Added image_url and profile_completed to the select query
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('first_name, last_name, username, email, role, image_url, profile_completed')
        .eq('id', user.id)
        .single();

      console.log('🔍 Profile query result:', { profileData, profileError });

      if (profileData && !profileError) {
        setUserProfile(profileData);
      } else {
        console.error('❌ Failed to fetch profile:', profileError);

        // ✅ FALLBACK: If database query fails, use Clerk user data
        if (user) {
          const fallbackProfile: UserProfile = {
            first_name: user.firstName || 'User',
            last_name: user.lastName || '',
            username: user.username || user.emailAddresses[0]?.emailAddress.split('@')[0] || 'user',
            email: user.emailAddresses[0]?.emailAddress || '',
            role: 'user', // default role
            image_url: user.imageUrl, // ✅ Use Clerk's image URL as fallback
            profile_completed: false
          };
          setUserProfile(fallbackProfile);
        }
      }

      // Stage 2: Fetch verified news count
      await fetchVerifiedNewsCount();

      // Stage 3: Finalizing
      setLoadingState({
        stage: 'finalizing',
        message: 'Preparing your dashboard...',
        progress: 85
      });

      // Fetch top 5 posts (mock data for now)
      const mockTopPosts: TopPost[] = [
        {
          id: '1',
          title: 'The Future of AI in Content Creation',
          excerpt: 'Exploring how artificial intelligence is revolutionizing the way we create and consume content...',
          views: 15420,
          likes: 234,
          comments: 45,
          created_at: '2024-12-01',
          author: 'John Doe'
        },
        {
          id: '2',
          title: 'Web3 and Decentralized Social Media',
          excerpt: 'Understanding the shift towards decentralized platforms and what it means for creators...',
          views: 12890,
          likes: 198,
          comments: 32,
          created_at: '2024-11-28',
          author: 'Jane Smith'
        },
        {
          id: '3',
          title: 'Sustainable Technology Trends 2024',
          excerpt: 'How green technology is shaping the future of innovation and environmental responsibility...',
          views: 9876,
          likes: 167,
          comments: 28,
          created_at: '2024-11-25',
          author: 'Mike Johnson'
        },
        {
          id: '4',
          title: 'The Rise of Remote Work Culture',
          excerpt: 'Analyzing the permanent shift in work dynamics and its impact on productivity...',
          views: 8543,
          likes: 143,
          comments: 21,
          created_at: '2024-11-22',
          author: 'Sarah Wilson'
        },
        {
          id: '5',
          title: 'Cryptocurrency Market Analysis',
          excerpt: 'Deep dive into current market trends and future predictions for digital currencies...',
          views: 7234,
          likes: 112,
          comments: 19,
          created_at: '2024-11-20',
          author: 'David Brown'
        }
      ];
      setTopPosts(mockTopPosts);

      // Complete loading
      setLoadingState({
        stage: 'complete',
        message: 'Dashboard ready!',
        progress: 100
      });

      // Small delay to show completion state
      setTimeout(() => {
        setLoading(false);
      }, 500);

    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoading(false);
    }
  }, [user?.id, user, getToken]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchUserData();
    }
  }, [isLoaded, user, fetchUserData]);

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
    if (!user) return;

    try {
      const payload = {
        userId: user.id,
        email: user.emailAddresses[0]?.emailAddress
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

  // ✅ ENHANCED: Better image URL handling
  const getProfileImageUrl = () => {
    // Priority order: database image_url -> Clerk imageUrl -> null (fallback to initials)
    return userProfile?.image_url || user?.imageUrl || null;
  };

  const getUserInitials = () => {
    if (userProfile?.first_name) {
      const firstInitial = userProfile.first_name.charAt(0).toUpperCase();
      const lastInitial = userProfile.last_name ? userProfile.last_name.charAt(0).toUpperCase() : '';
      return firstInitial + lastInitial;
    }
    return user?.firstName?.charAt(0).toUpperCase() || 'U';
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              {/* ✅ ENHANCED: Better Profile Image Section with improved error handling */}
              <div className="relative group">
                {/* Custom Profile Image with Fallback */}
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-[#EF3866] to-[#FF6B9D] p-0.5">
                  <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-gray-900">
                    {getProfileImageUrl() ? (
                      <Image
                        src={getProfileImageUrl()!}
                        alt={`${userProfile.first_name}'s profile`}
                        className="w-full h-full object-cover"
                        width={96}
                        height={96}
                        onError={(e) => {
                          // Hide the image and show fallback
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = parent.querySelector('.fallback-avatar') as HTMLElement;
                            if (fallback) {
                              fallback.style.display = 'flex';
                            }
                          }
                        }}
                        onLoad={(e) => {
                          // Hide fallback if image loads successfully
                          const target = e.target as HTMLImageElement;
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = parent.querySelector('.fallback-avatar') as HTMLElement;
                            if (fallback) {
                              fallback.style.display = 'none';
                            }
                          }
                        }}
                      />
                    ) : null}

                    {/* Fallback Avatar with Initials */}
                    <div
                      className="fallback-avatar w-full h-full bg-gradient-to-br from-[#EF3866] to-[#FF6B9D] flex items-center justify-center text-white font-bold text-lg"
                      style={{ display: getProfileImageUrl() ? 'none' : 'flex' }}
                    >
                      {getUserInitials()}
                    </div>
                  </div>
                </div>

                {/* Animated Ring */}
                <div className="absolute inset-0 rounded-full border-2 border-[#EF3866]/20 animate-pulse pointer-events-none group-hover:border-[#EF3866]/40 transition-colors"></div>

                {/* Online Status Indicator */}
                <div className="absolute -bottom-[-10px] -right-[-5px] w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full animate-ping"></div>
              </div>

              {/* User Information */}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-gray-900  dark:text-white font-sora transition-colors">
                    Welcome back, {userProfile.first_name}!
                  </h1>

                  {/* Profile Completion Badge */}
                  {!userProfile.profile_completed && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                      Profile Incomplete
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-gray-600 dark:text-gray-400 font-sora transition-colors">
                    @{userProfile.username}
                  </p>
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 capitalize">
                    {userProfile.role}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 transition-colors">
                <Mail className="w-4 h-4" />
                <span className="font-sora">{userProfile.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div ref={statsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 opacity-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center transition-colors">
                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 font-sora transition-colors">Total Views</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white font-sora transition-colors">
                  {topPosts.reduce((sum, post) => sum + post.views, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center transition-colors">
                <Heart className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 font-sora transition-colors">Posts Liked</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white font-sora transition-colors">
                  {likesLoading ? (
                    <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-8 w-16 inline-block"></span>
                  ) : (
                    userLikedPosts.toLocaleString()
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center transition-colors">
                <MessageCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 font-sora transition-colors">My Comments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white font-sora transition-colors">
                  {commentsLoading ? (
                    <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-8 w-16 inline-block"></span>
                  ) : (
                    totalComments.toLocaleString()
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center transition-colors">
                <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 font-sora transition-colors">Verified News</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white font-sora transition-colors">
                  {verifiedNewsCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div ref={tabsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 opacity-0">
        <div className="border-b border-gray-200 dark:border-gray-700 transition-colors">
          <nav className="-mb-px flex space-x-2 sm:space-x-8 overflow-x-auto scrollbar-hide">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'posts', label: 'Top Posts', icon: TrendingUp },
              { id: 'comments', label: 'My Comments', icon: MessageCircle },
              { id: 'verified', label: 'Verified News', icon: CheckCircle },
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
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-sora transition-colors">Top 5 Posts</h2>
              <p className="text-gray-600 dark:text-gray-400 font-sora transition-colors">Most popular content on the platform</p>
            </div>
            <div className="space-y-6">
              {topPosts.map((post, index) => (
                <div key={post.id} className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300 hover:shadow-md">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#EF3866] to-[#D53059] rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold font-sora">#{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white font-sora transition-colors">{post.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 mt-1 font-sora transition-colors">{post.excerpt}</p>
                      <div className="flex items-center flex-wrap gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400 transition-colors">
                        <div className="flex items-center space-x-1">
                          <Eye className="w-4 h-4" />
                          <span className="font-sora">{post.views.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-4 h-4" />
                          <span className="font-sora">{post.likes}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-4 h-4" />
                          <span className="font-sora">{post.comments}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span className="font-sora">{formatDate(post.created_at)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-sora transition-colors">by {post.author}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
    </div>
  );
}