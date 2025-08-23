import Image from 'next/image';
import React from 'react'

// Mock trending posts data
const trendingPosts = [
  { id: '1', title: 'AI Revolution in Healthcare', views: 45680, image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=120&h=120&fit=crop' },
  { id: '2', title: 'Sustainable Energy Solutions', views: 38920, image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=120&h=120&fit=crop' },
  { id: '3', title: 'Future of Transportation', views: 34567, image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=120&h=120&fit=crop' },
  { id: '4', title: 'Digital Privacy Rights', views: 29841, image: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=120&h=120&fit=crop' },
  { id: '5', title: 'Ocean Conservation Efforts', views: 27153, image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=120&h=120&fit=crop' }
];

interface TrendingPost {
  id: string;
  title: string;
  views: number;
  image: string;
}

const TrendingSection = () => {
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
          <div className="space-y-3">
            {trendingPosts.map((post: TrendingPost, index: number) => (
              <div key={post.id} className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors cursor-pointer group">
                <span className="text-sm font-bold text-[#EF3866] dark:text-[#EF3866] w-5 flex-shrink-0">
                  {index + 1}
                </span>
                <Image
                  src={post.image}
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
                    {post.views.toLocaleString()} views
                  </p>
                </div>
              </div>
            ))}
          </div>
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