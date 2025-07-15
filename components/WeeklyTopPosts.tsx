'use client';
import React from 'react';
import { useWeeklyTopPosts } from '../hooks/useWeeklyTopPosts';
import { Heart, TrendingUp, Calendar, RefreshCw, Tag, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistance } from 'date-fns';

export interface TopPost {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  publishedAt?: string;
  _createdAt?: string;
  mainImage?: { asset: { url: string }; alt?: string };
  author?: {
    name: string;
    image?: { asset: { url: string } };
    imageUrl?: string;
  };
  categories?: { title: string }[];
  likeCount: number;
  weeklyLikes: number;
}

const WeeklyTopPosts = () => {
  const {
    posts,
    loading,
    error,
    weekInfo,
    pagination,
    fetchNextPage,
    refreshPosts,
  } = useWeeklyTopPosts();

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    return formatDistance(new Date(dateString), new Date(), { addSuffix: true });
  };

  const getRankBadgeColor = (index: number) => {
    switch (index) {
      case 0: return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
      case 1: return 'bg-gradient-to-r from-gray-400 to-gray-500';
      case 2: return 'bg-gradient-to-r from-amber-600 to-amber-700';
      default: return 'bg-gradient-to-r from-[#EF3866] to-pink-600';
    }
  };

  const handleLoadMore = () => {
    if (pagination?.has_more && !loading) fetchNextPage();
  };

  if (loading && posts.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 bg-white dark:bg-black rounded-lg">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-white dark:bg-black rounded w-1/3" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-b border-gray-100 dark:border-gray-800 p-4 md:p-6 last:border-b-0">
              <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-white dark:bg-black rounded w-1/4" />
                  <div className="h-6 bg-white dark:bg-black rounded w-3/4" />
                  <div className="h-4 bg-white dark:bg-black rounded w-full" />
                  <div className="h-4 bg-white dark:bg-black rounded w-1/2" />
                </div>
                <div className="w-full sm:w-48 h-32 bg-white dark:bg-black rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="bg-white dark:bg-black border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <TrendingUp className="w-12 h-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Failed to Load Top Posts</h3>
            <p className="text-sm mt-2">{error}</p>
          </div>
          <button
            onClick={refreshPosts}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-[#EF3866]" />
            Weekly Top Posts
          </h1>
          {weekInfo && (
            <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2 text-sm md:text-base">
              <Calendar className="w-4 h-4" />
              {formatDate(weekInfo.week_start)} - {formatDate(weekInfo.week_end)}
            </p>
          )}
        </div>
        <div className="flex items-center">
          <button
            onClick={refreshPosts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border dark:text-white border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Posts */}
      {posts.length > 0 ? (
        <div className="space-y-8">
          <div className="space-y-0 bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            {posts.map((post, index) => (
              <article
                key={post._id}
                className="group border-b border-gray-100 dark:border-gray-800 p-4 md:p-6 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all duration-300 relative"
              >
                <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10 sm:hidden">
                  <div className={`px-3 py-1 rounded-full text-sm font-bold text-white shadow-lg ${getRankBadgeColor(index)}`}>
                    #{index + 1}
                  </div>
                </div>

                <Link href={`/post/${post._id}`} className="block">
                  <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
                    <div className="flex-1 min-w-0 order-2 sm:order-1">
                      <div className="hidden sm:flex items-center gap-4 mb-3">
                        <div className={`px-3 py-1 rounded-full text-sm font-bold text-white shadow-lg ${getRankBadgeColor(index)} flex-shrink-0`}>
                          #{index + 1}
                        </div>
                        {post.categories?.slice(0, 2).map((cat, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 bg-[#EF3866]/10 text-[#EF3866] text-xs font-medium px-3 py-1 rounded-full hover:bg-[#EF3866]/20"
                          >
                            <Tag className="w-3 h-3" />
                            {cat.title}
                          </span>
                        ))}
                      </div>

                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-[#EF3866] dark:group-hover:text-[#ff7a9c] transition-colors">
                        {post.title}
                      </h2>

                      {post.description && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base mb-4 line-clamp-2 sm:line-clamp-3">
                          {post.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {post.author && (
                          <div className="flex items-center gap-2">
                            {post.author.image?.asset?.url || post.author.imageUrl ? (
                              <div className="w-6 h-6 sm:w-8 sm:h-8 relative rounded-full overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
                                <Image
                                  src={post.author.image?.asset?.url || post.author.imageUrl || ''}
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
                            <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{post.author.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="text-xs sm:text-sm">{getTimeAgo(post.publishedAt || post._createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-[#EF3866] font-medium">
                          <Heart className="w-4 h-4 fill-current" />
                          <span>{post.weeklyLikes} this week</span>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400">{post.likeCount} total likes</span>
                      </div>
                    </div>

                    <div className="w-full sm:w-48 md:w-56 lg:w-64 xl:w-72 flex-shrink-0 order-1 sm:order-2">
                      <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] bg-white dark:bg-black rounded-lg overflow-hidden">
                        {post.mainImage?.asset?.url ? (
                          <>
                            <Image
                              src={post.mainImage.asset.url}
                              alt={post.mainImage.alt || post.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#EF3866]/10 to-purple-100 dark:to-purple-900 flex items-center justify-center">
                            <TrendingUp className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 dark:text-gray-600" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          5 min read
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>

          {/* Load More Button */}
          {pagination?.has_more && (
            <div className="text-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#EF3866] text-white rounded-lg hover:bg-[#d63384] transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    Load More Posts
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800">
          <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">No Top Posts Found</h3>
          <p className="text-gray-500 dark:text-gray-500 mb-6">There are no trending posts for this week yet.</p>
          <button
            onClick={refreshPosts}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#EF3866] text-white rounded-lg hover:bg-[#d63384] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      )}
    </div>
  );
};

export default WeeklyTopPosts;
