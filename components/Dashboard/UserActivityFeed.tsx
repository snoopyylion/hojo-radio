// components/Dashboard/UserActivityFeed.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { gsap } from 'gsap';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  TrendingUp,
  User,
  Edit3,
  CheckCircle,
  Award,
  LogIn,
  Eye,
  ThumbsUp,
  UserPlus,
  UserMinus,
  FileText,
  Shield,
  Bell
} from 'lucide-react';
import { UserActivity, ActivityType, ActivityCategory } from '@/types/notifications';
import { notificationService } from '@/lib/notificationService';

interface UserActivityFeedProps {
  userId?: string;
  limit?: number;
  showFilters?: boolean;
  className?: string;
  isOverview?: boolean; // Added for overview mode
}

export const UserActivityFeed: React.FC<UserActivityFeedProps> = ({ 
  userId,
  limit = 20,
  showFilters = true,
  className = '',
  isOverview = false // Default to false
}) => {
  const { userId: currentUserId } = useAuth();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | 'all'>('all');
  const [selectedType, setSelectedType] = useState<ActivityType | 'all'>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  const targetUserId = userId || currentUserId;

  const fetchActivities = async (reset = false) => {
    if (!targetUserId) return;

    try {
      setLoading(true);
      const newOffset = reset ? 0 : offset;
      const newActivities = await notificationService.getUserActivityFeed(
        targetUserId,
        limit,
        newOffset
      );

      if (reset) {
        setActivities(newActivities);
        setOffset(limit);
      } else {
        setActivities(prev => [...prev, ...newActivities]);
        setOffset(prev => prev + limit);
      }

      setHasMore(newActivities.length === limit);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetUserId) {
      fetchActivities(true);
    }
  }, [targetUserId, selectedCategory, selectedType]);

  useEffect(() => {
    if (containerRef.current && activities.length > 0) {
      const items = containerRef.current.querySelectorAll('.activity-item');
      gsap.fromTo(items, 
        { opacity: 0, y: 30 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out"
        }
      );
    }
  }, [activities]);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'post_liked':
        return <Heart size={16} className="text-red-500" />;
      case 'post_commented':
        return <MessageCircle size={16} className="text-blue-500" />;
      case 'post_shared':
        return <Share2 size={16} className="text-green-500" />;
      case 'post_bookmarked':
        return <Bookmark size={16} className="text-yellow-500" />;
      case 'user_followed':
        return <UserPlus size={16} className="text-purple-500" />;
      case 'user_unfollowed':
        return <UserMinus size={16} className="text-gray-500" />;
      case 'comment_liked':
        return <ThumbsUp size={16} className="text-orange-500" />;
      case 'comment_replied':
        return <MessageCircle size={16} className="text-indigo-500" />;
      case 'message_sent':
        return <MessageCircle size={16} className="text-blue-500" />;
      case 'message_received':
        return <MessageCircle size={16} className="text-green-500" />;
      case 'profile_updated':
        return <Edit3 size={16} className="text-teal-500" />;
      case 'login':
        return <LogIn size={16} className="text-cyan-500" />;
      case 'achievement_earned':
        return <Award size={16} className="text-yellow-600" />;
      case 'milestone_reached':
        return <TrendingUp size={16} className="text-emerald-500" />;
      case 'verification_submitted':
        return <Shield size={16} className="text-blue-600" />;
      case 'verification_approved':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'post_created':
        return <FileText size={16} className="text-blue-500" />;
      default:
        return <Eye size={16} className="text-gray-500" />;
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'post_liked':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'post_commented':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'post_shared':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'post_bookmarked':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'user_followed':
        return 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800';
      case 'user_unfollowed':
        return 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800';
      case 'comment_liked':
        return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';
      case 'comment_replied':
        return 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800';
      case 'message_sent':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'message_received':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'profile_updated':
        return 'bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800';
      case 'login':
        return 'bg-cyan-50 border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-800';
      case 'achievement_earned':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'milestone_reached':
        return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800';
      case 'verification_submitted':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'verification_approved':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'post_created':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = diffInMs / (1000 * 60);
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (selectedCategory !== 'all' && activity.category !== selectedCategory) {
      return false;
    }
    if (selectedType !== 'all' && activity.type !== selectedType) {
      return false;
    }
    return true;
  });

  const categories: { value: ActivityCategory | 'all'; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All', icon: <Eye size={16} /> },
    { value: 'content', label: 'Content', icon: <FileText size={16} /> },
    { value: 'social', label: 'Social', icon: <User size={16} /> },
    { value: 'achievement', label: 'Achievements', icon: <Award size={16} /> },
    { value: 'system', label: 'System', icon: <Bell size={16} /> }
  ];

  const activityTypes: { value: ActivityType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Activities' },
    { value: 'post_created', label: 'Posts Created' },
    { value: 'post_liked', label: 'Posts Liked' },
    { value: 'post_commented', label: 'Comments Made' },
    { value: 'post_shared', label: 'Posts Shared' },
    { value: 'post_bookmarked', label: 'Posts Bookmarked' },
    { value: 'user_followed', label: 'Users Followed' },
    { value: 'comment_liked', label: 'Comments Liked' },
    { value: 'comment_replied', label: 'Comment Replies' },
    { value: 'profile_updated', label: 'Profile Updates' },
    { value: 'login', label: 'Logins' },
    { value: 'achievement_earned', label: 'Achievements' },
    { value: 'milestone_reached', label: 'Milestones' },
    { value: 'verification_submitted', label: 'Verifications' }
  ];

  if (loading && activities.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      {showFilters && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category.value
                      ? 'bg-[#EF3866] text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {category.icon}
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ActivityType | 'all')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#EF3866] focus:border-transparent"
            >
              {activityTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Activity List */}
      <div ref={containerRef} className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-16">
            <TrendingUp size={64} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No activity yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {selectedCategory !== 'all' || selectedType !== 'all' 
                ? 'No activities match your current filters.'
                : 'User activity will appear here once they start engaging with content.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className={`activity-item p-4 rounded-xl border transition-all hover:shadow-md ${getActivityColor(activity.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {activity.title}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(activity.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {activity.description}
                    </div>
                    {/* Optionally show extra data */}
                    {activity.data && Object.keys(activity.data).length > 0 && (
                      <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {Object.entries(activity.data).map(([key, value]) => (
                          <span key={key} className="mr-2">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {/* Load more button */}
            {!isOverview && hasMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={() => fetchActivities()}
                  disabled={loading}
                  className="px-4 py-2 bg-[#EF3866] text-white rounded-lg hover:bg-[#EF3866]/90 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 