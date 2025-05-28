"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import { gsap } from "gsap";
import { 
  Loader2, 
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

interface UserProfile {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role: string;
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

export default function UserDashboard() {
  const { user, isLoaded } = useUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'verified' | 'author'>('overview');

  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetchUserData();
    }
  }, [isLoaded, user]);

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

  const fetchUserData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Fix: Use 'id' instead of 'clerk_id'
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('first_name, last_name, username, email, role')
        .eq('id', user.id)  // ✅ Changed from 'clerk_id' to 'id'
        .single();

      console.log('🔍 Profile query result:', { profileData, profileError });

      if (profileData && !profileError) {
        setUserProfile(profileData);
      } else {
        console.error('❌ Failed to fetch profile:', profileError);
      }

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

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleTabClick = (tab: typeof activeTab, event: React.MouseEvent) => {
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

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-[#EF3866] mx-auto mb-4" />
          <p className="text-gray-600 font-sora">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-sora">Unable to load user data</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-white pt-[80px]">
      {/* Header Section */}
      <div ref={headerRef} className="bg-white opacity-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#EF3866] to-[#D53059] rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold font-sora">
                  {userProfile.first_name?.[0]}{userProfile.last_name?.[0]}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-sora">
                  Welcome back, {userProfile.first_name}!
                </h1>
                <p className="text-gray-600 font-sora">
                  @{userProfile.username} • {userProfile.role}
                </p>
              </div>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
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
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 font-sora">Total Views</p>
                <p className="text-2xl font-bold text-gray-900 font-sora">
                  {topPosts.reduce((sum, post) => sum + post.views, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 font-sora">Total Likes</p>
                <p className="text-2xl font-bold text-gray-900 font-sora">
                  {topPosts.reduce((sum, post) => sum + post.likes, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 font-sora">Comments</p>
                <p className="text-2xl font-bold text-gray-900 font-sora">
                  {topPosts.reduce((sum, post) => sum + post.comments, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 font-sora">Verified News</p>
                <p className="text-2xl font-bold text-gray-900 font-sora">-</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div ref={tabsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 opacity-0">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'posts', label: 'Top Posts', icon: TrendingUp },
              { id: 'verified', label: 'Verified News', icon: CheckCircle },
              { id: 'author', label: 'Author Access', icon: Crown }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={(e) => handleTabClick(tab.id as typeof activeTab, e)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors font-sora ${
                    activeTab === tab.id
                      ? 'border-[#EF3866] text-[#EF3866]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Section */}
      <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 opacity-0">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 font-sora">Account Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-sora">Role</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium font-sora ${
                    userProfile.role === 'author' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-sora">Username</span>
                  <span className="text-gray-900 font-sora">@{userProfile.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-sora">Member Since</span>
                  <span className="text-gray-900 font-sora">Nov 2024</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 font-sora">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 font-sora">Viewed 5 verified articles today</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 font-sora">Dashboard accessed</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 font-sora">Profile updated</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 font-sora">Top 5 Posts</h2>
              <p className="text-gray-600 font-sora">Most popular content on the platform</p>
            </div>
            <div className="space-y-6">
              {topPosts.map((post, index) => (
                <div key={post.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#EF3866] to-[#D53059] rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold font-sora">#{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 font-sora">{post.title}</h3>
                      <p className="text-gray-600 mt-1 font-sora">{post.excerpt}</p>
                      <div className="flex items-center space-x-6 mt-4 text-sm text-gray-500">
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
                      <p className="text-sm text-gray-500 mt-2 font-sora">by {post.author}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'verified' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 font-sora">HOJO AI Verified News</h2>
              <p className="text-gray-600 font-sora">AI-powered fact-checking and verification results</p>
            </div>
            <VerifiedList />
          </div>
        )}

        {activeTab === 'author' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 font-sora">Author Access</h2>
              <p className="text-gray-600 font-sora">Apply to become a content author on HOJO</p>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              {userProfile.role === 'author' ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 font-sora">You're an Author!</h3>
                  <p className="text-gray-600 font-sora">You can now create and publish posts on HOJO.</p>
                  <button className="mt-4 px-6 py-3 bg-[#EF3866] text-white rounded-lg font-semibold font-sora hover:bg-[#D53059] transition-colors">
                    Create New Post
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 font-sora">Become an Author</h3>
                  <p className="text-gray-600 mb-6 font-sora">
                    Join our community of content creators and share your expertise with the world.
                  </p>
                  
                  {requestSent ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-800 font-medium font-sora">
                          Request submitted successfully! We'll review your application shortly.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      data-author-request
                      onClick={handleRequestAuthorAccess}
                      className="px-6 py-3 bg-[#EF3866] text-white rounded-lg font-semibold font-sora hover:bg-[#D53059] transition-colors"
                    >
                      Request Author Access
                    </button>
                  )}
                  
                  <div className="mt-6 text-left">
                    <h4 className="font-semibold text-gray-900 mb-3 font-sora">Author Benefits:</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
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