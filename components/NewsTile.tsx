"use client";
import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { urlFor } from "@/sanity/lib/image";
import Link from "next/link";
import Image from "next/image";
import { formatDistance } from 'date-fns';
import { gsap } from "gsap";
import { Heart, Bookmark, Clock, MessageCircle, ChevronUp, ChevronDown } from 'lucide-react';
import CommentSection from "./CommentSection";
import { useAuth } from '@clerk/nextjs';
import { notificationService } from '@/lib/notificationService';
import toast from 'react-hot-toast';

interface SanityImage {
  asset: {
    _ref: string;
    _type: string;
  };
}

interface NewsTileProps {
  post: {
    _id: string;
    title: string;
    description: string;
    slug: { current: string };
    mainImage?: SanityImage;
    publishedAt: string;
    author: {
      name: string;
      image?: SanityImage;
      supabaseUserId?: string; // Added for notification logic
    };
    categories: { title: string }[];
  };
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

const NewsTile: React.FC<NewsTileProps> = ({ post }) => {
  const { userId } = useAuth();
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
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLElement>(null);
  
  // Memoize time calculation to avoid recalculation on every render
  const timeAgo = useMemo(() => 
    formatDistance(new Date(post.publishedAt), new Date(), { addSuffix: true }),
    [post.publishedAt]
  );

  // Memoize image URL to avoid recalculation
  const imageUrl = useMemo(() => 
    post.mainImage ? urlFor(post.mainImage).width(400).height(300).url() : null,
    [post.mainImage]
  );

  const authorImageUrl = useMemo(() => 
    post.author.image ? urlFor(post.author.image).width(32).height(32).url() : null,
    [post.author.image]
  );

  // Optimized intersection observer with cleanup
  useEffect(() => {
    if (!elementRef.current || isInitialized) return;

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

    observerRef.current.observe(elementRef.current);

    return () => {
      if (observerRef.current && elementRef.current) {
        observerRef.current.unobserve(elementRef.current);
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
          await notificationService.createUserActivity({
            user_id: userId,
            type: 'post_unliked',
            title: 'Like Removed',
            description: `You unliked "${post.title}"`,
            category: 'content',
            visibility: 'public',
            data: { post_id: post._id, post_title: post.title }
          });
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
    } catch (err) {
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        isBookmarked: previousState.isBookmarked,
        bookmarkCount: previousState.bookmarkCount,
        isBookmarkLoading: false,
      }));
      console.error("Bookmark request failed", err);
    }
  }, [post._id, isBookmarked, bookmarkCount, isBookmarkLoading, setState, animateButton]);

  const handleShowComments = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowComments(!showComments);
  }, [showComments]);

  // Callback to update comment count from CommentSection
  const updateCommentCount = useCallback((count: number) => {
    setState(prev => ({ ...prev, commentCount: count }));
  }, [setState]);


  return (
    <article 
      ref={elementRef}
      id={`news-tile-${post._id}`}
      className="group border-b border-gray-100 dark:border-gray-800 p-4 md:p-6 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all duration-300 rounded-lg hover:shadow-sm"
    >
      <Link href={`/post/${post._id}`} className="block">
        <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
          {/* Content Section */}
          <div className="flex-1 min-w-0 order-2 sm:order-1">
            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-3">
              {post.categories.slice(0, 2).map((cat, index) => (
                <span
                  key={`${cat.title}-${index}`}
                  className="inline-block bg-[#EF3866]/10 text-[#EF3866] text-xs font-medium px-3 py-1 rounded-full hover:bg-[#EF3866]/20 transition-colors duration-200"
                >
                  {cat.title}
                </span>
              ))}
              {post.categories.length > 2 && (
                <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium px-3 py-1 rounded-full">
                  +{post.categories.length - 2} more
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3 leading-tight group-hover:text-[#EF3866] dark:group-hover:text-[#ff7a9c] transition-colors duration-300">
              {post.title}
            </h2>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base mb-4 leading-relaxed line-clamp-2 sm:line-clamp-3">
              {post.description}
            </p>

            {/* Author and Date */}
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <div className="flex items-center gap-2">
                {authorImageUrl ? (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 relative rounded-full overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
                    <Image
                      src={authorImageUrl}
                      alt={post.author.name}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                ) : (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#EF3866] text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {post.author.name.charAt(0)}
                  </div>
                )}
                <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                  {post.author.name}
                </span>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">{timeAgo}</span>
              </div>
            </div>
            
            {/* Engagement Actions */}
            <div className="flex items-center flex-wrap gap-4 mt-4">
              {/* Like */}
              <button
                ref={likeRef}
                onClick={handleLike}
                disabled={isLoading}
                className={`group flex items-center gap-2 text-sm font-medium transition-all duration-200 
                  ${isLiked ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'} 
                  ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <Heart
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isLiked ? 'fill-current scale-110' : ''
                  } ${isLoading ? 'animate-pulse' : 'group-hover:scale-110'}`}
                />
                <span>{likeCount}</span>
              </button>

              {/* Bookmark */}
              <button
                ref={bookmarkRef}
                onClick={handleBookmark}
                disabled={isBookmarkLoading}
                className={`group flex items-center gap-2 text-sm font-medium transition-all duration-200 
                  text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white 
                  ${isBookmarkLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <Bookmark
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isBookmarked ? 'fill-current scale-110' : ''
                  } ${isBookmarkLoading ? 'animate-pulse' : 'group-hover:scale-110'}`}
                />
                <span>{isBookmarked ? 'Saved' : 'Save'}</span>
              </button>

              {/* Comments */}
              <button
                ref={commentRef}
                onClick={handleShowComments}
                className={`group flex items-center gap-2 text-sm font-medium transition-all duration-200 
                  text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>{commentCount}</span>
                {showComments ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Image Section - Improved Responsiveness */}
          <div className="w-full sm:w-48 md:w-56 lg:w-64 xl:w-72 flex-shrink-0 order-1 sm:order-2">
            <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              {imageUrl ? (
                <>
                  <Image
                    src={imageUrl}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 192px, (max-width: 1024px) 224px, (max-width: 1280px) 256px, 288px"
                    priority={false}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#EF3866]/10 via-pink-50 to-purple-100 dark:from-[#EF3866]/20 dark:to-purple-900 flex items-center justify-center">
                  <div className="text-gray-400 dark:text-gray-600">
                    <svg className="w-12 h-12 sm:w-16 sm:h-16" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Read time overlay */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                5 min read
              </div>
            </div>
          </div>
        </div>
      </Link>
      
      {/* Comment Section - Hidden by default */}
      {showComments && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="p-6">
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

// Memoize the component to prevent unnecessary re-renders
export default React.memo(NewsTile);