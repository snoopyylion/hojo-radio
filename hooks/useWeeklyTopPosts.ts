// hooks/useWeeklyTopPosts.ts
import { useState, useEffect, useCallback } from 'react';

export interface TopPost {
  _id: string;
  title: string;
  slug: {
    current: string;
  };
  description?: string;
  publishedAt?: string;
  _createdAt?: string;
  mainImage?: {
    asset: {
      url: string;
    };
    alt?: string;
  };
  author?: {
    name: string;
    image?: {
      asset: {
        url: string;
      };
    };
    imageUrl?: string;
  };
  categories?: {
    title: string;
  }[];
  likeCount: number;
  weeklyLikes: number;
}

interface WeekInfo {
  week_start: string;
  week_end: string;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

interface UseWeeklyTopPostsReturn {
  posts: TopPost[];
  loading: boolean;
  error: string | null;
  weekInfo: WeekInfo | null;
  pagination: Pagination | null;
  fetchPosts: (weekStart?: string, limit?: number, offset?: number) => Promise<void>;
  fetchNextPage: () => Promise<void>;
  refreshPosts: () => Promise<void>;
  getWeekStart: (date?: Date) => string;
  getCurrentWeekPosts: () => Promise<void>;
  getPreviousWeekPosts: () => Promise<void>;
}

export function useWeeklyTopPosts(): UseWeeklyTopPostsReturn {
  const [posts, setPosts] = useState<TopPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<string | null>(null);

  // Helper function to get week start (Monday)
  const getWeekStart = useCallback((date: Date = new Date()): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  }, []);

  // Transform API response to TopPost interface
  const transformPost = (apiPost: any): TopPost => {
    return {
      _id: apiPost._id,
      title: apiPost.title,
      slug: apiPost.slug,
      description: apiPost.description,
      publishedAt: apiPost.publishedAt,
      _createdAt: apiPost._createdAt,
      mainImage: apiPost.mainImage,
      author: apiPost.author,
      categories: apiPost.categories,
      likeCount: apiPost.stats?.total_likes || apiPost.likeCount || 0,
      weeklyLikes: apiPost.stats?.weekly_likes || apiPost.weeklyLikes || 0
    };
  };

  const fetchPosts = useCallback(async (
    weekStart?: string,
    limit: number = 10,
    offset: number = 0
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(weekStart && { week_start: weekStart })
      });

      // FIX: Add the query parameters to the URL
      const response = await fetch(`/api/post/top-weekly?${params.toString()}`);
      
      if (!response.ok) {
        // Better error handling
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Server error'}`);
      }

      const data = await response.json();

      // Handle case where API returns error in response body
      if (!data.success) {
        throw new Error(data.error || 'API returned error');
      }

      // Transform the posts to match TopPost interface
      const transformedPosts = data.posts.map(transformPost);

      if (offset === 0) {
        setPosts(transformedPosts);
      } else {
        setPosts(prev => [...prev, ...transformedPosts]);
      }

      setWeekInfo(data.week_info);
      setPagination(data.pagination);
      setCurrentWeekStart(weekStart || data.week_info?.week_start || null);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weekly top posts';
      setError(errorMessage);
      console.error('Error fetching weekly top posts:', err);
      
      // Set empty state on error
      if (offset === 0) {
        setPosts([]);
        setWeekInfo(null);
        setPagination(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNextPage = useCallback(async () => {
    if (!pagination?.has_more || loading) return;

    await fetchPosts(
      currentWeekStart || undefined,
      pagination.limit,
      pagination.offset + pagination.limit
    );
  }, [pagination, loading, currentWeekStart, fetchPosts]);

  const refreshPosts = useCallback(async () => {
    await fetchPosts(currentWeekStart || undefined);
  }, [currentWeekStart, fetchPosts]);

  const getCurrentWeekPosts = useCallback(async () => {
    const weekStart = getWeekStart();
    await fetchPosts(weekStart);
  }, [getWeekStart, fetchPosts]);

  const getPreviousWeekPosts = useCallback(async () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const weekStart = getWeekStart(lastWeek);
    await fetchPosts(weekStart);
  }, [getWeekStart, fetchPosts]);

  // Auto-fetch current week's posts on mount
  useEffect(() => {
    getCurrentWeekPosts();
  }, []); // Remove getCurrentWeekPosts from dependency array to prevent infinite loop

  return {
    posts,
    loading,
    error,
    weekInfo,
    pagination,
    fetchPosts,
    fetchNextPage,
    refreshPosts,
    getWeekStart,
    getCurrentWeekPosts,
    getPreviousWeekPosts
  };
}

// Additional hook for specific week data
export function useWeeklyTopPostsForWeek(weekStart: string, limit: number = 10) {
  const [posts, setPosts] = useState<TopPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);

  // Transform API response to TopPost interface
  const transformPost = (apiPost: any): TopPost => {
    return {
      _id: apiPost._id,
      title: apiPost.title,
      slug: apiPost.slug,
      description: apiPost.description,
      publishedAt: apiPost.publishedAt,
      _createdAt: apiPost._createdAt,
      mainImage: apiPost.mainImage,
      author: apiPost.author,
      categories: apiPost.categories,
      likeCount: apiPost.stats?.total_likes || apiPost.likeCount || 0,
      weeklyLikes: apiPost.stats?.weekly_likes || apiPost.weeklyLikes || 0
    };
  };

  const fetchWeeklyPosts = useCallback(async () => {
    if (!weekStart) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/post/top-weekly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week_start: weekStart,
          limit
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Server error'}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API returned error');
      }
      
      // Transform the posts to match TopPost interface
      const transformedPosts = data.posts.map(transformPost);
      setPosts(transformedPosts);
      setWeekInfo(data.week_info);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weekly posts';
      setError(errorMessage);
      console.error('Error fetching weekly posts:', err);
      setPosts([]);
      setWeekInfo(null);
    } finally {
      setLoading(false);
    }
  }, [weekStart, limit]);

  useEffect(() => {
    fetchWeeklyPosts();
  }, [fetchWeeklyPosts]);

  return {
    posts,
    loading,
    error,
    weekInfo,
    refetch: fetchWeeklyPosts
  };
}