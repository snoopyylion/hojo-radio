import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Share2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { urlFor } from "@/sanity/lib/image";
import { useAuth } from '@clerk/nextjs';
import { notificationService } from '@/lib/notificationService';
import toast from 'react-hot-toast';
import { gsap } from "gsap";
import CommentSection from "@/components/CommentSection";

interface SanityImage {
  asset: {
    _ref: string;
    _type: string;
  };
}

interface Post {
  _id: string;
  title: string;
  description: string;
  slug: { current: string };
  mainImage?: SanityImage;
  publishedAt: string;
  author: {
    name: string;
    supabaseUserId: string;
    image?: SanityImage;
  };
  categories: { title: string }[];
}

interface BlogTileProps {
  post: Post;
}

// Define proper types for API responses
interface ApiResponse {
  data?: unknown;
  error?: string;
  liked?: boolean;
  bookmarked?: boolean;
  hasLiked?: boolean;
  hasBookmarked?: boolean;
  likeCount?: number;
  bookmarkCount?: number;
  comments?: unknown[];
}

interface CacheEntry {
  data: ApiResponse;
  timestamp: number;
}

// Cache for API responses to avoid duplicate requests
const apiCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 30000; // 30 seconds

// Utility function for cached API calls
const cachedFetch = async (url: string, options?: RequestInit): Promise<ApiResponse> => {
  const cacheKey = `${url}${JSON.stringify(options)}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const response = await fetch(url, options);
  const data = await response.json() as ApiResponse;
  
  apiCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

// Custom hook for engagement data
const useEngagementData = (postId: string) => {
  const [state, setState] = useState({
    isLiked: false,
    isBookmarked: false,
    likeCount: 0,
    bookmarkCount: 0,
    commentCount: 0,
    isInitialized: false,
    isLoading: false,
    isBookmarkLoading: false,
  });

  const fetchEngagementData = useCallback(async () => {
    if (state.isInitialized) return;
    
    try {
      // Batch all API calls in parallel for better performance
      const [likeRes, bookmarkRes, commentRes] = await Promise.all([
        cachedFetch(`/api/post/${postId}/like`),
        cachedFetch(`/api/post/${postId}/bookmark`),
        cachedFetch(`/api/post/comment/${postId}`)
      ]);

      setState(prev => ({
        ...prev,
        isLiked: likeRes.hasLiked || false,
        likeCount: likeRes.likeCount || 0,
        isBookmarked: bookmarkRes.hasBookmarked || false,
        bookmarkCount: bookmarkRes.bookmarkCount || 0,
        commentCount: commentRes.comments?.length || 0,
        isInitialized: true,
      }));
    } catch (err) {
      console.error("Failed to fetch engagement data", err);
      setState(prev => ({ ...prev, isInitialized: true }));
    }
  }, [postId, state.isInitialized]);

  return { ...state, setState, fetchEngagementData };
};

const BlogTile = ({ post }: BlogTileProps) => {
  const { userId } = useAuth();
  const router = useRouter();
  const {
    isLiked,
    isBookmarked,
    likeCount,
    bookmarkCount,
    commentCount,
    isInitialized,
    isLoading,
    isBookmarkLoading,
    setState,
    fetchEngagementData
  } = useEngagementData(post._id);

  const [showComments, setShowComments] = useState(false);
  const likeRef = useRef<HTMLButtonElement>(null);
  const bookmarkRef = useRef<HTMLButtonElement>(null);
  const commentRef = useRef<HTMLButtonElement>(null);
  const shareRef = useRef<HTMLButtonElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLElement>(null);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  // Generate image URLs using Sanity's urlFor
  const mainImageUrl = useMemo(() => 
    post.mainImage ? urlFor(post.mainImage).width(600).height(600).url() : '',
    [post.mainImage]
  );
  
  const authorImageUrl = useMemo(() => 
    post.author.image ? urlFor(post.author.image).width(40).height(40).url() : '',
    [post.author.image]
  );

  // Handle navigation to post page
  const handleNavigateToPost = useCallback((e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.closest('button') || target.closest('a');
    
    if (!isInteractiveElement) {
      router.push(`/home/post/${post._id}`);
    }
  }, [router, post._id]);

  // Optimized intersection observer with cleanup
  useEffect(() => {
    if (!elementRef.current || isInitialized) return;

    const currentElement = elementRef.current; // Copy to avoid stale reference

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isInitialized) {
          fetchEngagementData();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Load data slightly before component is visible
      }
    );

    observerRef.current.observe(currentElement);

    return () => {
      if (observerRef.current && currentElement) {
        observerRef.current.unobserve(currentElement);
      }
    };
  }, [fetchEngagementData, isInitialized]);

  // Optimized animation function with debouncing
  const animateButton = useCallback((buttonRef: React.RefObject<HTMLButtonElement | null>) => {
    if (buttonRef.current) {
      gsap.fromTo(
        buttonRef.current,
        { scale: 1 },
        { scale: 1.15, duration: 0.1, yoyo: true, repeat: 1, ease: "power1.inOut" }
      );
    }
  }, []);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    // Optimistic update with previous state backup
    const previousState = { isLiked, likeCount };
    
    setState(prev => ({
      ...prev,
      isLiked: !prev.isLiked,
      likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
      isLoading: true,
    }));

    animateButton(likeRef);

    try {
      const data = await cachedFetch(`/api/post/${post._id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (data.error) {
        throw new Error(data.error);
      }

      // Update with server response
      setState(prev => ({
        ...prev,
        isLiked: data.liked || false,
        likeCount: data.likeCount || 0,
        isLoading: false,
      }));

      // Toast and activity logging
      if (userId) {
        if (data.liked) {
          toast.success('Liked!');
          await notificationService.createUserActivity({
            user_id: userId,
            type: 'post_liked',
            title: 'Post Liked',
            description: `You liked "${post.title}"`,
            category: 'content',
            visibility: 'public',
            data: { post_id: post._id, post_title: post.title }
          });
          // Notify post owner if not self
          if (userId && post.author.supabaseUserId && userId !== post.author.supabaseUserId) {
            await notificationService.createLikeNotification(userId, post.author.supabaseUserId, 'Someone', post._id, post.title);
          }
        } else {
          toast('Like removed');
        }
      }
    } catch (err) {
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        isLiked: previousState.isLiked,
        likeCount: previousState.likeCount,
        isLoading: false,
      }));
      console.error("Like request failed", err);
      toast.error('Failed to like post');
    }
  }, [post._id, isLiked, likeCount, isLoading, setState, animateButton, post.title, post.author?.supabaseUserId, userId]);

  const handleBookmark = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isBookmarkLoading) return;

    // Optimistic update with previous state backup
    const previousState = { isBookmarked, bookmarkCount };
    
    setState(prev => ({
      ...prev,
      isBookmarked: !prev.isBookmarked,
      bookmarkCount: prev.isBookmarked ? prev.bookmarkCount - 1 : prev.bookmarkCount + 1,
      isBookmarkLoading: true,
    }));

    animateButton(bookmarkRef);

    try {
      const data = await cachedFetch(`/api/post/${post._id}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (data.error) {
        throw new Error(data.error);
      }

      // Update with server response
      setState(prev => ({
        ...prev,
        isBookmarked: data.bookmarked || false,
        bookmarkCount: data.bookmarkCount || 0,
        isBookmarkLoading: false,
      }));

      if (data.bookmarked) {
        toast.success('Post saved!');
      } else {
        toast('Post removed from saved');
      }
    } catch (err) {
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        isBookmarked: previousState.isBookmarked,
        bookmarkCount: previousState.bookmarkCount,
        isBookmarkLoading: false,
      }));
      console.error("Bookmark request failed", err);
      toast.error('Failed to save post');
    }
  }, [post._id, isBookmarked, bookmarkCount, isBookmarkLoading, setState, animateButton]);

  const handleShowComments = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowComments(!showComments);
  }, [showComments]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    animateButton(shareRef);

    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.description,
          url: `${window.location.origin}/home/post/${post._id}`,
        });
        toast.success('Shared successfully!');
      } else {
        // Fallback: copy to clipboard
        const url = `${window.location.origin}/home/post/${post._id}`;
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed:', err);
      toast.error('Failed to share post');
    }
  }, [post._id, post.title, post.description, animateButton]);

  // Callback to update comment count from CommentSection
  const updateCommentCount = useCallback((count: number) => {
    setState(prev => ({ ...prev, commentCount: count }));
  }, [setState]);

  return (
    <article 
      ref={elementRef}
      onClick={handleNavigateToPost}
      className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg mb-6 mx-auto cursor-pointer hover:shadow-md transition-shadow duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Image
            src={authorImageUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'}
            alt={post.author.name}
            width={32}
            height={32}
            className="rounded-full object-cover"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              {post.author.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimeAgo(post.publishedAt)}
            </span>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <MoreHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Image */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-900">
        <Image
          src={mainImageUrl || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=600&fit=crop'}
          alt={post.title}
          fill
          className="object-cover"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <button 
            ref={likeRef}
            onClick={handleLike}
            disabled={isLoading}
            className={`hover:opacity-70 transition-opacity ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <Heart 
              className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-900 dark:text-white'} ${isLoading ? 'animate-pulse' : ''}`} 
            />
          </button>
          <button 
            ref={commentRef}
            onClick={handleShowComments}
            className="hover:opacity-70 transition-opacity"
          >
            <MessageCircle className="w-6 h-6 text-gray-900 dark:text-white" />
          </button>
          <button 
            ref={shareRef}
            onClick={handleShare}
            className="hover:opacity-70 transition-opacity"
          >
            <Share2 className="w-6 h-6 text-gray-900 dark:text-white" />
          </button>
        </div>
        <button 
          ref={bookmarkRef}
          onClick={handleBookmark}
          disabled={isBookmarkLoading}
          className={`hover:opacity-70 transition-opacity ${isBookmarkLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <Bookmark 
            className={`w-6 h-6 ${isBookmarked ? 'fill-gray-900 dark:fill-white' : ''} text-gray-900 dark:text-white ${isBookmarkLoading ? 'animate-pulse' : ''}`} 
          />
        </button>
      </div>

      {/* Likes */}
      <div className="px-4 pb-2">
        <span className="font-semibold text-sm text-gray-900 dark:text-white">
          {likeCount.toLocaleString()} likes
        </span>
      </div>

      {/* Title and Description */}
      <div className="px-4 pb-2">
        <div className="text-lg text-gray-900 dark:text-white hover:underline">
          <span className="font-bold">{post.title}</span>
        </div>
        <p className="text-sm text-gray-900 dark:text-white mt-1 leading-relaxed">
          {post.description}
        </p>
      </div>

      {/* View Comments */}
      <div className="px-4 pb-2">
        <button 
          onClick={handleShowComments}
          className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
        >
          View all {commentCount} comments
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="p-4">
            <CommentSection 
              postId={post._id} 
              onCommentCountChange={updateCommentCount}
            />
          </div>
        </div>
      )}
    </article>
  );
};

export default BlogTile;