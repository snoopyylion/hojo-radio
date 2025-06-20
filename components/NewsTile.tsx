"use client";
import React, { useCallback, useEffect, useState } from "react";
import { urlFor } from "@/sanity/lib/image";
import Link from "next/link";
import Image from "next/image";
import { formatDistance } from 'date-fns';
import { Heart, Bookmark, Clock } from 'lucide-react';

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
    };
    categories: { title: string }[];
  };
}

const NewsTile: React.FC<NewsTileProps> = ({ post }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const timeAgo = formatDistance(new Date(post.publishedAt), new Date(), { addSuffix: true });

  const fetchLikeStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/post/${post._id}/like`);
      if (!res.ok) return;

      const data = await res.json();
      setIsLiked(data.hasLiked);
      setLikeCount(data.likeCount);
    } catch (err) {
      console.error("Failed to fetch like status", err);
    }
  }, [post._id]);

  useEffect(() => {
    fetchLikeStatus();
  }, [fetchLikeStatus]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent multiple clicks while request is in progress
    if (isLoading) return;

    // Optimistic update - update UI immediately
    const previousIsLiked = isLiked;
    const previousLikeCount = likeCount;
    
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/post/${post._id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (res.ok) {
        // Update with actual server response
        setIsLiked(data.liked);
        setLikeCount(data.likeCount);
      } else {
        // Revert optimistic update on error
        setIsLiked(previousIsLiked);
        setLikeCount(previousLikeCount);
        console.error("Error toggling like", data.error);
      }
    } catch (err) {
      // Revert optimistic update on error
      setIsLiked(previousIsLiked);
      setLikeCount(previousLikeCount);
      console.error("Like request failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
  };

  return (
    <article className="group border-b border-gray-100 dark:border-gray-800 p-4 md:p-6 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all duration-300 rounded-lg hover:shadow-sm">
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
                {post.author.image ? (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 relative rounded-full overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
                    <Image
                      src={urlFor(post.author.image).width(32).height(32).url()}
                      alt={post.author.name}
                      fill
                      className="object-cover"
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
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={handleLike}
                disabled={isLoading}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-all duration-200 ${isLiked
                    ? 'bg-[#ffe6ec] dark:bg-[#4a1a22] text-[#EF3866]'
                    : 'bg-white dark:bg-black text-[#EF3866] hover:bg-[#ffe6ec] dark:hover:bg-[#1a1a1a]'
                  } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <Heart
                  className={`w-3 h-3 sm:w-4 sm:h-4 transition-all duration-200 ${isLiked ? 'fill-current' : ''
                    } ${isLoading ? 'animate-pulse' : ''}`}
                />
                <span className="font-medium">{likeCount} Like{likeCount !== 1 ? 's' : ''}</span>
              </button>

              <button
                onClick={handleBookmark}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-all duration-200 ${isBookmarked
                    ? 'bg-[#ffe6ec] dark:bg-[#4a1a22] text-[#EF3866]'
                    : 'bg-white dark:bg-black text-[#EF3866] hover:bg-[#ffe6ec] dark:hover:bg-[#1a1a1a]'
                  }`}
              >
                <Bookmark
                  className={`w-3 h-3 sm:w-4 sm:h-4 transition-all duration-200 ${isBookmarked ? 'fill-current' : ''
                    }`}
                />
                <span className="font-medium">Save</span>
              </button>
            </div>
          </div>

          {/* Image Section - Improved Responsiveness */}
          <div className="w-full sm:w-48 md:w-56 lg:w-64 xl:w-72 flex-shrink-0 order-1 sm:order-2">
            <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              {post.mainImage ? (
                <>
                  <Image
                    src={urlFor(post.mainImage).width(400).height(300).url()}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 192px, (max-width: 1024px) 224px, (max-width: 1280px) 256px, 288px"
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
    </article>
  );
};

export default NewsTile;