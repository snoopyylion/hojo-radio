"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import { useAppContext } from '@/context/AppContext';
import { User, MapPin, Calendar, Users, BookOpen, Heart, MessageCircle, UserPlus, UserMinus, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  created_at: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
}

interface Article {
  id: string;
  title: string;
  excerpt: string;
  published_at: string;
  likes_count: number;
  comments_count: number;
  image_url?: string;
}

const UserProfilePage = () => {
  const { id } = useParams();
  const { user } = useAppContext();
  const router = useRouter();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');

  useEffect(() => {
    if (id) {
      fetchUserProfile();
      fetchUserArticles();
      if (user?.id) {
        checkFollowStatus();
      }
    }
  }, [id, user?.id]);


  const fetchUserProfile = async () => {
  try {
    console.log('Fetching profile for ID:', id);
    
    // First, try with the exact ID from URL
    let { data, error } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        bio,
        location,
        website,
        avatar_url,
        created_at
      `)
      .eq('id', id)
      .single();

    // If not found and ID looks like it might have been cleaned, try with common prefixes
    if (error && error.code === 'PGRST116') { // PGRST116 = no rows returned
      console.log('User not found with exact ID, trying with prefixes...');
      
      const prefixes = ['supabase_user_', 'user_', 'sanity_user_'];
      
      for (const prefix of prefixes) {
        const prefixedId = `${prefix}${id}`;
        console.log('Trying with prefixed ID:', prefixedId);
        
        const result = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            role,
            bio,
            location,
            website,
            avatar_url,
            created_at
          `)
          .eq('id', prefixedId)
          .single();
          
        if (result.data && !result.error) {
          data = result.data;
          error = null;
          console.log('Found user with prefixed ID:', prefixedId);
          break;
        }
      }
      
      // If still not found, try searching by partial ID match
      if (!data) {
        console.log('Trying partial ID match...');
        const partialResult = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            role,
            bio,
            location,
            website,
            avatar_url,
            created_at
          `)
          .ilike('id', `%${id}%`)
          .limit(1)
          .single();
          
        if (partialResult.data && !partialResult.error) {
          data = partialResult.data;
          error = null;
          console.log('Found user with partial match:', partialResult.data.id);
        }
      }
    }

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    if (data) {
      console.log('User found:', data);
      
      // Get counts
      const [followersResult, followingResult, postsResult] = await Promise.all([
        supabase.from('follows').select('id').eq('following_id', data.id),
        supabase.from('follows').select('id').eq('follower_id', data.id),
        supabase.from('user_posts').select('id').eq('user_id', data.id)
      ]);

      setProfile({
        ...data,
        followers_count: followersResult.data?.length || 0,
        following_count: followingResult.data?.length || 0,
        posts_count: postsResult.data?.length || 0
      });
    } else {
      console.log('No user data found');
      throw new Error('User not found');
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // Don't set profile to null immediately, let the component handle the error state
  } finally {
    setLoading(false);
  }
};

  const fetchUserArticles = async () => {
    try {
      // Fetch user's posts from your posts table
      const { data, error } = await supabase
        .from('user_posts')
        .select(`
          id,
          title,
          content,
          created_at,
          likes_count,
          comments_count,
          image_url
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedArticles = data?.map(post => ({
        id: post.id,
        title: post.title,
        excerpt: post.content?.substring(0, 150) + '...' || '',
        published_at: post.created_at,
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0,
        image_url: post.image_url
      })) || [];

      setArticles(formattedArticles);
    } catch (error) {
      console.error('Error fetching user articles:', error);
    }
  };

  const checkFollowStatus = async () => {
    if (!user?.id || user.id === id) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', id)
        .single();

      if (!error && data) {
        setIsFollowing(true);
      }
    } catch (error) {
      // User is not following
      setIsFollowing(false);
    }
  };

  const handleFollow = async () => {
    if (!user?.id || user.id === id) return;

    setFollowLoading(true);
    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isFollowing ? 'unfollow' : 'follow',
          following_id: id,
        }),
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
        // Update follower count
        setProfile(prev => prev ? {
          ...prev,
          followers_count: isFollowing ? prev.followers_count - 1 : prev.followers_count + 1
        } : null);
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h1>
          <p className="text-gray-600 mb-6">The user you're looking for doesn't exist.</p>
          <button
            onClick={() => router.back()}
            className="bg-[#EF3866] text-white px-6 py-2 rounded-full hover:bg-[#d7325a] transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="p-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={`${profile.first_name} ${profile.last_name}`}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#EF3866] to-gray-700 flex items-center justify-center">
                    <User size={40} className="text-white" />
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {profile.first_name} {profile.last_name}
                    </h1>
                    <div className="flex items-center gap-4 text-gray-600 mb-4">
                      <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium capitalize">
                        {profile.role}
                      </span>
                      {profile.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={16} />
                          <span className="text-sm">{profile.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        <span className="text-sm">Joined {formatDate(profile.created_at)}</span>
                      </div>
                    </div>
                    
                    {profile.bio && (
                      <p className="text-gray-700 mb-4">{profile.bio}</p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1">
                        <Users size={16} className="text-gray-500" />
                        <span className="font-semibold">{profile.followers_count}</span>
                        <span className="text-gray-600">Followers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={16} className="text-gray-500" />
                        <span className="font-semibold">{profile.following_count}</span>
                        <span className="text-gray-600">Following</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen size={16} className="text-gray-500" />
                        <span className="font-semibold">{profile.posts_count}</span>
                        <span className="text-gray-600">Posts</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {user?.id && user.id !== id && (
                    <div className="flex gap-3">
                      <button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition ${
                          isFollowing
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-[#EF3866] text-white hover:bg-[#d7325a]'
                        } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {followLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : isFollowing ? (
                          <UserMinus size={16} />
                        ) : (
                          <UserPlus size={16} />
                        )}
                        <span>{isFollowing ? 'Unfollow' : 'Follow'}</span>
                      </button>
                      <button className="flex items-center gap-2 px-6 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
                        <Mail size={16} />
                        <span>Message</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('posts')}
                className={`px-6 py-4 font-medium text-sm transition ${
                  activeTab === 'posts'
                    ? 'text-[#EF3866] border-b-2 border-[#EF3866]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Posts ({profile.posts_count})
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`px-6 py-4 font-medium text-sm transition ${
                  activeTab === 'about'
                    ? 'text-[#EF3866] border-b-2 border-[#EF3866]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                About
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'posts' ? (
              <div>
                {articles.length > 0 ? (
                  <div className="grid gap-6">
                    {articles.map((article) => (
                      <Link href={`/post/${article.id}`} key={article.id}>
                        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition cursor-pointer">
                          <div className="flex gap-4">
                            {article.image_url && (
                              <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                <Image
                                  src={article.image_url}
                                  alt={article.title}
                                  width={80}
                                  height={80}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-2 hover:text-[#EF3866] transition">
                                {article.title}
                              </h3>
                              <p className="text-gray-600 text-sm mb-3">{article.excerpt}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>{formatDate(article.published_at)}</span>
                                <div className="flex items-center gap-1">
                                  <Heart size={12} />
                                  <span>{article.likes_count}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageCircle size={12} />
                                  <span>{article.comments_count}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
                    <p className="text-gray-600">
                      {profile.first_name} hasn't published any posts yet.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-gray-500" />
                      <span className="text-gray-700">{profile.email}</span>
                    </div>
                    {profile.phone && (
                      <div className="flex items-center gap-3">
                        <Phone size={16} className="text-gray-500" />
                        <span className="text-gray-700">{profile.phone}</span>
                      </div>
                    )}
                    {profile.website && (
                      <div className="flex items-center gap-3">
                        <User size={16} className="text-gray-500" />
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#EF3866] hover:underline"
                        >
                          {profile.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {profile.bio && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Bio</h3>
                    <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;