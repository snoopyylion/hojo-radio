// hooks/author-posts/useAuthorPosts.ts
"use client";

import { useState, useEffect } from 'react';
import { UserPost } from '@/types/user';

interface UseAuthorPostsProps {
  authorId?: string; // Supabase user ID
  sanityAuthorId?: string; // Sanity author document ID
  isAuthor: boolean;
}

interface SanityPost {
  _id: string;
  _createdAt: string;
  _updatedAt: string;
  title: string;
  slug?: {
    current: string;
  };
  description?: string;
  excerpt?: string;
  body?: any[];
  mainImage?: {
    asset?: {
      url: string;
      metadata?: {
        dimensions?: {
          width: number;
          height: number;
        };
      };
    };
  };
  author?: {
    _id: string;
    name: string;
    slug?: {
      current: string;
    };
    supabaseUserId?: string;
    image?: {
      asset?: {
        url: string;
      };
    };
  };
  categories?: Array<{
    _id: string;
    title: string;
  }>;
  publishedAt?: string;
  likes?: any[];
  comments?: any[];
}

export const useAuthorPosts = ({ authorId, sanityAuthorId, isAuthor }: UseAuthorPostsProps) => {
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch posts if user is confirmed to be an author and we have an ID
    if (!isAuthor || (!authorId && !sanityAuthorId)) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const fetchAuthorPosts = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('Fetching posts for:', { authorId, sanityAuthorId });

        const response = await fetch('/api/post/by-author', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            authorId, 
            sanityAuthorId 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch author posts');
        }

        const data: SanityPost[] = await response.json();
        console.log('Received posts from API:', data);
        
        // Transform Sanity data to match UserPost interface
        const transformedPosts: UserPost[] = data.map((post: SanityPost) => {
          // Extract text content from Sanity's portable text format
          const extractTextFromBody = (body: any[]): string => {
            if (!body) return '';
            return body
              .map((block: any) => {
                if (block._type === 'block') {
                  return block.children
                    ?.map((child: any) => child.text)
                    .join('') || '';
                }
                return '';
              })
              .join('\n');
          };

          return {
            id: post._id,
            title: post.title || '',
            content: extractTextFromBody(post.body || []),
            excerpt: post.excerpt || post.description || '',
            image_url: post.mainImage?.asset?.url || undefined,
            media_urls: post.mainImage?.asset?.url ? [post.mainImage.asset.url] : [],
            author_id: authorId || post.author?.supabaseUserId || '',
            author: {
              id: authorId || post.author?.supabaseUserId || '',
              first_name: post.author?.name?.split(' ')[0] || '',
              last_name: post.author?.name?.split(' ').slice(1).join(' ') || '',
              username: post.author?.slug?.current || '',
              image_url: post.author?.image?.asset?.url || null,
              is_verified: true, // Authors are verified
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
          };
        });

        console.log('Transformed posts:', transformedPosts);
        setPosts(transformedPosts);
      } catch (err) {
        console.error('Error fetching author posts:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorPosts();
  }, [authorId, sanityAuthorId, isAuthor]);

  const refetch = () => {
    if (isAuthor && (authorId || sanityAuthorId)) {
      // Force a re-fetch by clearing posts and triggering useEffect
      setPosts([]);
      setError(null);
    }
  };

  return { posts, loading, error, refetch };
};