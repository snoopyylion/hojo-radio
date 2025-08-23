import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Eye, TrendingUp, Calendar, Clock, BarChart3 } from 'lucide-react';

interface RecentlyViewedPost {
  post_id: string;
  post_title: string;
  post_slug: string;
  viewed_at: string;
}

interface DashboardAnalytics {
  totalViews: number;
  uniquePostsViewed: number;
  weeklyViews: number;
  recentlyViewed: RecentlyViewedPost[];
  dailyViewCounts: Record<string, number>;
}

export default function DashboardAnalytics() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/dashboard/analytics');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }
        const data = await response.json();
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [isSignedIn]);

  if (!isSignedIn) {
    return (
      <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm">
        <p className="text-gray-500 dark:text-gray-400 text-center">Please sign in to view analytics</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm">
        <p className="text-red-500 text-center">Error: {error}</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm">
        <p className="text-gray-500 dark:text-gray-400 text-center">No analytics data available</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const viewedAt = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - viewedAt.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const getAverageViewsPerDay = () => {
    const totalDays = Object.keys(analytics.dailyViewCounts).length;
    if (totalDays === 0) return 0;
    return Math.round(analytics.weeklyViews / totalDays);
  };

  return (
    <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        Your Reading Analytics
      </h2>
      
      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">Total Views</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{analytics.totalViews}</p>
              <p className="text-sm text-blue-500 dark:text-blue-300">All time</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">Unique Articles</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{analytics.uniquePostsViewed}</p>
              <p className="text-sm text-green-500 dark:text-green-300">Different posts read</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">This Week</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{analytics.weeklyViews}</p>
              <p className="text-sm text-purple-500 dark:text-purple-300">Last 7 days</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">Daily Average</h3>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{getAverageViewsPerDay()}</p>
              <p className="text-sm text-orange-500 dark:text-orange-300">Views per day</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recently Viewed Posts */}
      <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          Recently Viewed Posts
        </h3>
        {analytics.recentlyViewed.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No posts viewed yet</p>
        ) : (
          <div className="space-y-3">
            {analytics.recentlyViewed.map((post, index) => (
              <div key={`${post.post_id}-${index}`} className="flex justify-between items-start p-3 border-l-4 border-blue-500 bg-white dark:bg-gray-800 rounded-r-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {post.post_title || 'Untitled Post'}
                  </h4>
                  {post.post_slug && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">/{post.post_slug}</p>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 text-right flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <div>
                    <p>{getTimeAgo(post.viewed_at)}</p>
                    <p className="text-xs">{formatDate(post.viewed_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily View Chart */}
      <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Daily Reading Activity (Last 7 Days)</h3>
        <div className="space-y-3">
          {Object.entries(analytics.dailyViewCounts).map(([date, count]) => (
            <div key={date} className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <div className="flex items-center space-x-3">
                <div className="flex-1 max-w-xs">
                  <div 
                    className="bg-blue-500 h-6 rounded-lg transition-all duration-300" 
                    style={{ width: `${Math.max(count * 20, 20)}px` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[2rem] text-right">
                  {count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
