// components/UserProfile/AuthorPostsSection.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Calendar,
  Heart, 
  MessageCircle, 
  BookOpen,
  Clock,
  ExternalLink
} from 'lucide-react';
import { UserPost } from '@/types/user';

interface Like {
  userId: string;
  createdAt: string;
}

interface Comment {
  userId: string;
  text: string;
  createdAt: string;
}

interface AuthorPostsSectionProps {
  userId: string;
  isAuthor: boolean;
  userName: string;
  onPostsCountUpdate?: (count: number) => void;
}

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
  likes?: Like[];
  comments?: Comment[];
  publishedAt?: string;
  _createdAt: string;
  _updatedAt: string;
  slug?: {
    current?: string;
  };
  author?: {
    _id: string;
    name: string;
    image?: {
      asset?: {
        url?: string;
      };
    };
  };
}

interface PortableTextBlock {
  children?: PortableTextChild[];
}

interface PortableTextChild {
  text?: string;
}

export const AuthorPostsSection: React.FC<AuthorPostsSectionProps> = ({
  userId,
  isAuthor,
  userName,
  onPostsCountUpdate
}) => {
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuthorPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching posts for author:', userId);

      const response = await fetch('/api/post/by-author', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ authorId: userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch posts`);
      }

      const sanityPosts: SanityPost[] = await response.json();
      console.log('Sanity posts received:', sanityPosts);

      // Transform Sanity posts to match UserPost interface
      const transformedPosts: UserPost[] = sanityPosts.map((post) => ({
        id: post._id,
        title: post.title || 'Untitled Post',
        content: extractTextFromPortableText(post.body),
        excerpt: post.description || post.excerpt || extractExcerpt(post.body),
        image_url: post.mainImage?.asset?.url || null,
        media_urls: post.mainImage?.asset?.url ? [post.mainImage.asset.url] : [],
        author_id: userId,
        author: {
          id: userId,
          first_name: userName.split(' ')[0] || '',
          last_name: userName.split(' ').slice(1).join(' ') || '',
          username: userName.toLowerCase().replace(/\s+/g, ''),
          image_url: post.author?.image?.asset?.url || null,
          is_verified: true,
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

      setPosts(transformedPosts);
      
      // Update the posts count in the parent component
      if (onPostsCountUpdate) {
        onPostsCountUpdate(transformedPosts.length);
      }
    } catch (error) {
      console.error('Error fetching author posts:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch posts');
      setPosts([]);
      if (onPostsCountUpdate) {
        onPostsCountUpdate(0);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, userName, onPostsCountUpdate]);

  useEffect(() => {
    if (isAuthor) {
      fetchAuthorPosts();
    } else {
      setLoading(false);
    }
  }, [isAuthor, fetchAuthorPosts]);

  // Helper function to extract text from Portable Text
  const extractTextFromPortableText = (body?: PortableTextBlock[]): string => {
    if (!body || !Array.isArray(body)) return '';
    
    return body
      .map(block => 
        block.children?.map(child => child.text).join('') || ''
      )
      .join('\n')
      .trim();
  };

  // Helper function to create excerpt from Portable Text
  const extractExcerpt = (body?: PortableTextBlock[], maxLength: number = 150): string => {
    const fullText = extractTextFromPortableText(body);
    if (fullText.length <= maxLength) return fullText;
    
    const truncated = fullText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return formatDate(dateString);
    }
  };

  if (!isAuthor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-8">
          <BookOpen className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        
        <div className="w-16 h-0.5 bg-[#EF3866] mx-auto mb-6"></div>
        
        <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-4 tracking-tight">
          No Posts Available
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md leading-relaxed font-light">
          This user is not an author and doesn&apos;t have any posts to display.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/70 dark:bg-black/70 backdrop-blur-md rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-8">
            <div className="animate-pulse">
              <div className="flex gap-6">
                <div className="w-32 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="flex-1 space-y-4">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  <div className="flex gap-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-full flex items-center justify-center mb-8">
          <ExternalLink className="w-8 h-8 text-red-500 dark:text-red-400" />
        </div>
        
        <div className="w-16 h-0.5 bg-[#EF3866] mx-auto mb-6"></div>
        
        <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-4 tracking-tight">
          Failed to Load Posts
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md leading-relaxed font-light mb-6">
          {error}
        </p>
        <button 
          onClick={fetchAuthorPosts}
          className="px-6 py-3 bg-[#EF3866] text-white rounded-lg hover:bg-[#d7325a] transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-8">
          <BookOpen className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        
        <div className="w-16 h-0.5 bg-[#EF3866] mx-auto mb-6"></div>
        
        <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-4 tracking-tight">
          No Posts Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md leading-relaxed font-light">
          {userName} hasn&apos;t published any posts yet. Check back later for their latest content and insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <p className="text-gray-600 dark:text-gray-400 mt-4 font-light">
          {posts.length} {posts.length === 1 ? 'post' : 'posts'} published
        </p>
        <div className="w-16 h-0.5 bg-[#EF3866] mx-auto"></div>
      </div>

      <div className="grid gap-8">
        {posts.map((post) => (
          <article
            key={post.id}
            className="group bg-white/70 dark:bg-black/70 backdrop-blur-md rounded-2xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:border-gray-300/50 dark:hover:border-gray-700/50"
          >
            <div className="p-8">
              <div className="flex flex-col lg:flex-row gap-6">
                {post.image_url && (
                  <div className="lg:w-48 flex-shrink-0">
                    <div className="relative w-full h-32 lg:h-36 rounded-xl overflow-hidden">
                      <Image
                        src={post.image_url}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="mb-4">
                    <Link 
                      href={`/post/${post.id}`}
                      className="group-hover:text-[#EF3866] transition-colors duration-200"
                    >
                      <h3 className="text-xl lg:text-2xl font-light text-gray-900 dark:text-white mb-3 line-clamp-2 tracking-tight">
                        {post.title}
                      </h3>
                    </Link>
                    
                    {post.excerpt && (
                      <p className="text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed font-light">
                        {post.excerpt}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-[#EF3866]" />
                      <span className="font-light">{formatDate(post.published_at)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-[#EF3866]" />
                      <span className="font-light">{formatRelativeTime(post.published_at)}</span>
                    </div>

                    {post.likes_count > 0 && (
                      <div className="flex items-center gap-2">
                        <Heart size={16} className="text-[#EF3866]" />
                        <span className="font-light">{post.likes_count}</span>
                      </div>
                    )}

                    {post.comments_count > 0 && (
                      <div className="flex items-center gap-2">
                        <MessageCircle size={16} className="text-[#EF3866]" />
                        <span className="font-light">{post.comments_count}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};