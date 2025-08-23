import Image from 'next/image';
import React from 'react';
import { useTrendingPosts } from '@/hooks/useTrendingPosts';
import Link from 'next/link';

const TrendingSection = () => {
  const { posts: trendingPosts, loading, error } = useTrendingPosts(5);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Ad Section - Fixed height */}
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Sponsored</h3>
        <div className="relative aspect-[4/3] bg-gradient-to-br from-[#EF3866] to-purple-600 rounded-lg mb-3 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-sm">Your Ad Here</span>
          </div>
        </div>
        <h4 className="font-semibold text-xs text-gray-900 dark:text-white mb-1">
          Boost Your Business
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
          Reach millions of engaged readers with our premium solutions.
        </p>
      </div>
           
      {/* Trending Posts - Flexible height */}
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex-1 flex flex-col min-h-0">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Trending Posts</h3>
        
        {/* Scrollable posts container */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex items-center gap-3 p-2 rounded-lg animate-pulse">
                  <div className="w-5 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-sm">
              Failed to load trending posts
            </div>
          ) : trendingPosts.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-sm">
              No trending posts yet
            </div>
          ) : (
            <div className="space-y-3">
              {trendingPosts.map((post, index: number) => (
                <Link 
                  key={post._id} 
                  href={`/post/${post.slug.current}`}
                  className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors cursor-pointer group"
                >
                  <span className="text-sm font-bold text-[#EF3866] dark:text-[#EF3866] w-5 flex-shrink-0">
                    {index + 1}
                  </span>
                  <Image
                    src={post.mainImage?.asset.url || '/img/analyze.png'}
                    alt={post.title}
                    className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                    width={40}
                    height={40}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs text-gray-900 dark:text-white truncate group-hover:text-[#EF3866] dark:group-hover:text-[#EF3866] transition-colors">
                      {post.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {post.viewCount.toLocaleString()} views
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        
        {/* View All Link */}
        <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800">
          <button className="w-full text-center text-xs text-[#EF3866] hover:text-[#d62f58] dark:text-[#EF3866] dark:hover:text-[#ff4d7a] font-medium transition-colors">
            View All Trending →
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrendingSection