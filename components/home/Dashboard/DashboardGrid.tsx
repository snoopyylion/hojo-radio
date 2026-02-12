import { Mic, ShieldCheck, Eye, TrendingUp } from "lucide-react";
import DashboardCard from "./DashboardCard";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

interface RecentlyViewedItem {
  id: string;
  title: string;
  viewedAt: string;
  // Add other properties as needed
}

interface DashboardAnalytics {
  totalViews: number;
  uniquePostsViewed: number;
  weeklyViews: number;
  recentlyViewed: RecentlyViewedItem[];
  dailyViewCounts: Record<string, number>;
}

const DashboardGrid = () => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/dashboard/analytics');
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [isSignedIn]);

  const data = [
    {
      title: "Total Post Views",
      count: analytics?.totalViews || 0,
      weeklyChange: analytics ? `${analytics.weeklyViews} this week` : "0 this week",
      icon: <Eye size={20} />,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Unique Posts Read",
      count: analytics?.uniquePostsViewed || 0,
      weeklyChange: analytics ? `${analytics.weeklyViews} views this week` : "0 views this week",
      icon: <TrendingUp size={20} />,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Podcasts Created",
      count: 12,
      weeklyChange: "+3 this week",
      icon: <Mic size={20} />,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "News Verified",
      count: 12,
      weeklyChange: "+3 this week",
      icon: <ShieldCheck size={20} />,
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ];

  if (loading) {
    return (
      <div className="bg-white dark:bg-black">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl p-4 flex justify-between items-start animate-pulse">
              <div className="flex flex-col justify-between h-full">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                <div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </div>
              </div>
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black">    {/* ← removed min-h-screen and mt-4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {data.map((card, i) => (
          <DashboardCard key={i} {...card} />
        ))}
      </div>
    </div>
  );
};

export default DashboardGrid;