// components/Dashboard/SmartUserActivityFeed.tsx
'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  Bell,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  RefreshCw,
  Users,
  Activity
} from 'lucide-react';
import { UserActivity, ActivityType, ActivityCategory } from '@/types/notifications';
import { notificationService } from '@/lib/notificationService';

interface GroupedActivity {
  id: string;
  userId: string;
  userDisplayName: string;
  userImage?: string;
  primaryType: ActivityType;
  primaryCategory: ActivityCategory;
  activities: UserActivity[];
  count: number;
  latestTimestamp: string;
  earliestTimestamp: string;
  isExpanded?: boolean;
}

interface SmartUserActivityFeedProps {
  userId?: string;
  limit?: number;
  showFilters?: boolean;
  className?: string;
  isOverview?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const SmartUserActivityFeed: React.FC<SmartUserActivityFeedProps> = ({ 
  userId,
  limit = 20,
  showFilters = true,
  className = '',
  isOverview = false,
  autoRefresh = false,
  refreshInterval = 30000 // 30 seconds
}) => {
  const { userId: currentUserId } = useAuth();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | 'all'>('all');
  const [selectedType, ] = useState<ActivityType | 'all'>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const targetUserId = userId || currentUserId;
  const itemsPerPage = isOverview ? 5 : 10;

  // Helper functions for activity grouping - MOVED BEFORE useMemo
  const isMessageActivity = (type: ActivityType): boolean => {
    return ['message_sent', 'message_received', 'post_commented', 'comment_replied'].includes(type);
  };

  const isSocialActivity = (type: ActivityType): boolean => {
    return ['post_liked', 'comment_liked', 'post_shared', 'user_followed', 'user_unfollowed'].includes(type);
  };

  // Smart grouping algorithm
  const groupedActivities = useMemo(() => {
    const groups = new Map<string, GroupedActivity>();
    const timeWindow = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    
    // Sort activities by timestamp (newest first)
    const sortedActivities = [...activities].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    sortedActivities.forEach((activity) => {
      const activityTime = new Date(activity.timestamp).getTime();
      
      // Find existing group for this user within time window
      let targetGroup: GroupedActivity | null = null;
      
      for (const group of groups.values()) {
        if (
          group.userId === activity.user_id &&
          Math.abs(activityTime - new Date(group.latestTimestamp).getTime()) <= timeWindow &&
          (
            // Group similar activities
            group.primaryType === activity.type ||
            // Group all message-related activities
            (isMessageActivity(group.primaryType) && isMessageActivity(activity.type)) ||
            // Group all social activities
            (isSocialActivity(group.primaryType) && isSocialActivity(activity.type))
          )
        ) {
          targetGroup = group;
          break;
        }
      }

      if (targetGroup) {
        // Add to existing group
        targetGroup.activities.push(activity);
        targetGroup.count++;
        targetGroup.latestTimestamp = activity.timestamp;
        if (new Date(activity.timestamp) < new Date(targetGroup.earliestTimestamp)) {
          targetGroup.earliestTimestamp = activity.timestamp;
        }
      } else {
        // Create new group
        const newGroup: GroupedActivity = {
          id: `group_${activity.user_id}_${activity.timestamp}`,
          userId: activity.user_id,
          userDisplayName: activity.data?.userName || activity.title.split(' ')[0] || 'User',
          userImage: activity.data?.userImage,
          primaryType: activity.type,
          primaryCategory: activity.category,
          activities: [activity],
          count: 1,
          latestTimestamp: activity.timestamp,
          earliestTimestamp: activity.timestamp,
          isExpanded: false
        };
        groups.set(newGroup.id, newGroup);
      }
    });

    return Array.from(groups.values()).sort((a, b) => 
      new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime()
    );
  }, [activities]);

  // Filter grouped activities
  const filteredGroups = useMemo(() => {
    return groupedActivities.filter(group => {
      if (selectedCategory !== 'all' && group.primaryCategory !== selectedCategory) {
        return false;
      }
      if (selectedType !== 'all' && group.primaryType !== selectedType) {
        return false;
      }
      return true;
    });
  }, [groupedActivities, selectedCategory, selectedType]);

  // Paginated groups
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredGroups.slice(startIndex, endIndex);
  }, [filteredGroups, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);

  const fetchActivities = async (reset = false) => {
    if (!targetUserId) return;

    try {
      setLoading(reset);
      if (!reset) setRefreshing(true);
      
      const newActivities = await notificationService.getUserActivityFeed(
        targetUserId,
        limit,
        0
      );

      setActivities(newActivities);
      setHasMore(newActivities.length === limit);
      if (reset) setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchActivities(true);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && !isOverview) {
      refreshIntervalRef.current = setInterval(() => {
        fetchActivities(false);
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, isOverview, targetUserId]);

  useEffect(() => {
    if (targetUserId) {
      fetchActivities(true);
    }
  }, [targetUserId, selectedCategory, selectedType]);

  useEffect(() => {
    if (containerRef.current && paginatedGroups.length > 0) {
      const items = containerRef.current.querySelectorAll('.activity-group');
      gsap.fromTo(items, 
        { opacity: 0, y: 20, scale: 0.95 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          duration: 0.4,
          stagger: 0.08,
          ease: "power2.out"
        }
      );
    }
  }, [paginatedGroups, currentPage]);

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

  const getSmartTitle = (group: GroupedActivity): string => {
    const { userDisplayName, count, primaryType } = group;
    
    if (count === 1) {
      return group.activities[0].title;
    }

    if (isMessageActivity(primaryType)) {
      return `${userDisplayName} sent ${count} messages`;
    }

    switch (primaryType) {
      case 'post_liked':
        return `${userDisplayName} liked ${count} posts`;
      case 'user_followed':
        return `${userDisplayName} followed ${count} users`;
      case 'post_shared':
        return `${userDisplayName} shared ${count} posts`;
      case 'comment_liked':
        return `${userDisplayName} liked ${count} comments`;
      default:
        return `${userDisplayName} performed ${count} activities`;
    }
  };

  const getSmartDescription = (group: GroupedActivity): string => {
    if (group.count === 1) {
      return group.activities[0].description;
    }

    const timeSpan = formatTimeSpan(group.earliestTimestamp, group.latestTimestamp);
    return `Multiple activities over ${timeSpan}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = diffInMs / (1000 * 60);
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`;
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

  const formatTimeSpan = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffInMs = endDate.getTime() - startDate.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'within an hour';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours`;
    } else {
      return `${Math.floor(diffInHours / 24)} days`;
    }
  };

  const categories: { value: ActivityCategory | 'all'; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All', icon: <Activity size={16} /> },
    { value: 'content', label: 'Content', icon: <FileText size={16} /> },
    { value: 'social', label: 'Social', icon: <Users size={16} /> },
    { value: 'achievement', label: 'Achievements', icon: <Award size={16} /> },
    { value: 'system', label: 'System', icon: <Bell size={16} /> }
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
    <div className={`space-y-4 ${className}`}>
      {/* Header with refresh button */}
      {!isOverview && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Activity Feed
            </h3>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      )}

      {/* Filters */}
      {showFilters && !isOverview && (
        <div className="flex flex-wrap gap-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <Filter size={16} className="text-gray-500 dark:text-gray-400 mt-2" />
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === category.value
                  ? 'bg-[#EF3866] text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {category.icon}
              {category.label}
            </button>
          ))}
        </div>
      )}

      {/* Activity Groups */}
      <div ref={containerRef} className="space-y-3">
        {paginatedGroups.length === 0 ? (
          <div className="text-center py-12">
            <Activity size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No recent activity
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {selectedCategory !== 'all' || selectedType !== 'all' 
                ? 'No activities match your current filters.'
                : 'Activity will appear here as users engage with content.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedGroups.map((group) => (
              <div
                key={group.id}
                className="activity-group bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition-all duration-200"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 relative">
                      {group.userImage ? (
                        <img
                          src={group.userImage}
                          alt={group.userDisplayName}
                          className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <User size={20} className="text-gray-500 dark:text-gray-400" />
                        </div>
                      )}
                      {group.count > 1 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#EF3866] text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {group.count}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getActivityIcon(group.primaryType)}
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">
                          {getSmartTitle(group)}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(group.latestTimestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {getSmartDescription(group)}
                      </p>
                    </div>

                    {group.count > 1 && (
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      >
                        {expandedGroups.has(group.id) ? (
                          <ChevronUp size={16} className="text-gray-500" />
                        ) : (
                          <ChevronDown size={16} className="text-gray-500" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded activities */}
                {expandedGroups.has(group.id) && group.count > 1 && (
                  <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <div className="p-4 space-y-3">
                      {group.activities.slice(0, 5).map((activity, index) => (
                        <div key={`${activity.id}-${index}`} className="flex items-start gap-3 text-sm">
                          <div className="flex-shrink-0 mt-0.5">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-gray-900 dark:text-white font-medium">
                              {activity.title}
                            </span>
                            <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">
                              {activity.description}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatDate(activity.timestamp)}
                          </span>
                        </div>
                      ))}
                      {group.activities.length > 5 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                          and {group.activities.length - 5} more activities...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isOverview && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredGroups.length)} of {filteredGroups.length} activity groups
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Auto-refresh indicator */}
      {autoRefresh && !isOverview && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2 flex items-center justify-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Auto-refreshing every {refreshInterval / 1000}s
        </div>
      )}
    </div>
  );
};