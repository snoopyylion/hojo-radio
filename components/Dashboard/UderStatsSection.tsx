"use client";

import { useState, useEffect } from "react";
import { Heart, MessageCircle, Shield } from "lucide-react";

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
  icon: React.ElementType;
  value: number | string;
  label: string;
  isLoading?: boolean;
  color: {
    bg: string;
    icon: string;
    accent: string;
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
    <div className="group text-center hover:scale-105 transition-all duration-300 cursor-pointer">
      {/* Icon Container */}
      <div className="flex items-center justify-center mb-4">
        <div className={`w-12 h-12 ${color.bg} rounded-2xl flex items-center justify-center backdrop-blur-sm transition-all duration-300 group-hover:shadow-lg group-hover:shadow-gray-200/50 dark:group-hover:shadow-gray-800/50`}>
          <Icon className={`w-6 h-6 ${color.icon} group-hover:text-[#EF3866] transition-colors duration-300`} />
        </div>
      </div>

      {/* Value */}
      <div className="font-light text-2xl sm:text-3xl text-gray-900 dark:text-white group-hover:text-[#EF3866] transition-colors duration-300 tracking-tight mb-2">
        {isLoading ? (
          <div className="animate-pulse bg-gray-200/60 dark:bg-gray-700/60 rounded-lg h-8 w-16 mx-auto backdrop-blur-sm"></div>
        ) : (
          typeof value === 'number' ? value.toLocaleString() : value
        )}
      </div>

      {/* Label */}
      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide">
        {label}
      </div>

      {/* Accent Line */}
      <div className={`w-8 h-0.5 ${color.accent} mx-auto mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
    </div>
  );
};

const UserStatsSection: React.FC<UserStatsProps> = ({
  userId,
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
        bg: "bg-gradient-to-br from-pink-100/80 to-pink-200/60 dark:from-pink-900/30 dark:to-pink-800/20",
        icon: "text-pink-600 dark:text-pink-400",
        accent: "bg-pink-400/50"
      }
    },
    {
      icon: MessageCircle,
      value: stats.comments,
      label: "My Comments",
      isLoading: commentsLoading,
      color: {
        bg: "bg-gradient-to-br from-purple-100/80 to-purple-200/60 dark:from-purple-900/30 dark:to-purple-800/20",
        icon: "text-purple-600 dark:text-purple-400",
        accent: "bg-purple-400/50"
      }
    },
    {
      icon: Shield,
      value: stats.verified,
      label: "Verified News",
      isLoading: verifiedLoading,
      color: {
        bg: "bg-gradient-to-br from-orange-100/80 to-orange-200/60 dark:from-orange-900/30 dark:to-orange-800/20",
        icon: "text-orange-600 dark:text-orange-400",
        accent: "bg-orange-400/50"
      }
    }
  ];

  return (
    <section className={`bg-white dark:bg-black backdrop-blur-md rounded-2xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>

      {/* Stats Container */}
      <div className="px-4 sm:px-8 lg:px-12 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
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
      </div>
    </section>
  );
};

export default UserStatsSection;