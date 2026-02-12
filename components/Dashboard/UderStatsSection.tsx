"use client";

import { useState, useEffect } from "react";
import { Heart, MessageCircle, Shield, LucideIcon } from "lucide-react";

interface UserStatsProps {
  userId?: string;
  userLikedPosts?: number;
  totalComments?: number;
  verifiedNewsCount?: number;
  likesLoading?: boolean;
  commentsLoading?: boolean;
  verifiedLoading?: boolean;
  className?: string;
}

interface StatItemProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  isLoading?: boolean;
  color: {
    bg: string;
    icon: string;
  };
}

const StatItem: React.FC<StatItemProps> = ({ 
  icon: Icon, 
  value, 
  label, 
  isLoading = false, 
  color 
}) => {
  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ${color.bg} rounded-lg sm:rounded-xl flex items-center justify-center`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6`} style={{ color: color.icon.replace('text-', '') }} />
        </div>
      </div>
      <div>
        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2">{label}</p>
        <p className="text-gray-900 dark:text-white text-lg sm:text-xl lg:text-2xl font-bold leading-tight">
          {isLoading ? (
            <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 sm:h-7 lg:h-8 w-12 sm:w-14 lg:w-16 inline-block"></span>
          ) : (
            typeof value === 'number' ? value.toLocaleString() : value
          )}
        </p>
      </div>
    </div>
  );
};

const UserStatsSection: React.FC<UserStatsProps> = ({
  userLikedPosts = 0,
  totalComments = 0,
  verifiedNewsCount = 0,
  likesLoading = false,
  commentsLoading = false,
  verifiedLoading = false,
  className = ""
}) => {
  const [stats, setStats] = useState({
    likes: userLikedPosts,
    comments: totalComments,
    verified: verifiedNewsCount
  });

  // Update stats when props change
  useEffect(() => {
    setStats({
      likes: userLikedPosts,
      comments: totalComments,
      verified: verifiedNewsCount
    });
  }, [userLikedPosts, totalComments, verifiedNewsCount]);

  const statItems = [
    {
      icon: Heart,
      value: stats.likes,
      label: "Posts Liked",
      isLoading: likesLoading,
      color: {
        bg: "bg-pink-100 dark:bg-pink-900/30",
        icon: "text-pink-600 dark:text-pink-400"
      }
    },
    {
      icon: MessageCircle,
      value: stats.comments,
      label: "My Comments",
      isLoading: commentsLoading,
      color: {
        bg: "bg-purple-100 dark:bg-purple-900/30",
        icon: "text-purple-600 dark:text-purple-400"
      }
    },
    {
      icon: Shield,
      value: stats.verified,
      label: "Verified News",
      isLoading: verifiedLoading,
      color: {
        bg: "bg-orange-100 dark:bg-orange-900/30",
        icon: "text-orange-600 dark:text-orange-400"
      }
    }
  ];

  return (
    <div className={`bg-white dark:bg-gray-950 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm ${className}`}>
      {/* Header Section */}
      <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-[#EF3866] to-[#EF3866]/80 rounded-full"></div>
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Activity Overview</h3>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {statItems.map((item, index) => (
            <StatItem
              key={index}
              icon={item.icon}
              value={item.value}
              label={item.label}
              isLoading={item.isLoading}
              color={item.color}
            />
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0"></div>
            <span className="font-medium">Stats update in real-time</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStatsSection;