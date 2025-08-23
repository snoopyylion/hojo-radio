import { useState, useEffect } from 'react';

interface TrendingPost {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  publishedAt?: string;
  _createdAt?: string;
  mainImage?: {
    asset: { url: string };
    alt?: string;
  };
  author?: {
    name: string;
    imageUrl?: string;
  };
  categories?: { title: string }[];
  viewCount: number;
}

interface TrendingPostsResponse {
  posts: TrendingPost[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  success: boolean;
}

export const useTrendingPosts = (limit: number = 10) => {
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrendingPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/post/trending?limit=${limit}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: TrendingPostsResponse = await response.json();
        
        if (data.success) {
          setPosts(data.posts);
        } else {
          throw new Error('Failed to fetch trending posts');
        }
      } catch (err) {
        console.error('Error fetching trending posts:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingPosts();
  }, [limit]);

  return { posts, loading, error };
};
