// components/EnhancedNotificationList.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useGlobalNotifications } from '@/context/EnhancedGlobalNotificationsContext';
import { formatDistanceToNow } from 'date-fns';
import { 
  X, CheckCheck, Bell, Filter, Search, RefreshCw, MessageCircle, Users, Heart, MessageSquare, AtSign, Trophy,
  ChevronDown, ChevronUp, Camera, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { BaseNotification, NotificationCategory, NotificationType } from '@/types/notifications';

interface NotificationData {
  conversation_id?: string;
  target_id?: string;
  sender_id?: string;
  sender_name?: string;
  image_url?: string;
  message_type?: string;
  [key: string]: unknown;
}

interface Notification extends BaseNotification {
  data?: NotificationData;
}

interface GroupedNotification {
  id: string;
  notifications: Notification[];
  sender_id?: string;
  sender_name?: string;
  latest_created_at: string;
  total_unread: number;
  category: NotificationCategory;
  type: NotificationType;
  isGrouped: boolean;
}

const ITEMS_PER_PAGE = 10;

export const EnhancedNotificationList: React.FC = () => {
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    fetchNotifications,
    isGlobalConnected
  } = useGlobalNotifications();

  const [filteredNotifications, setFilteredNotifications] = useState<GroupedNotification[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // Smart grouping logic
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {};
    const standalone: Notification[] = [];

    // --- Improved message grouping: rolling 24-hour window ---
    // 1. Group all messages by sender
    const messageGroups: { [senderId: string]: Notification[][] } = {};
    notifications
      .filter(n => n.type === 'message' && n.data?.sender_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .forEach(n => {
        const senderId = n.data!.sender_id!;
        if (!messageGroups[senderId]) messageGroups[senderId] = [];
        let added = false;
        for (const group of messageGroups[senderId]) {
          // If within 24h of the latest in the group
          if (Math.abs(new Date(group[0].created_at).getTime() - new Date(n.created_at).getTime()) < 24 * 60 * 60 * 1000) {
            group.push(n);
            added = true;
            break;
          }
        }
        if (!added) {
          messageGroups[senderId].push([n]);
        }
      });
    // Add grouped messages to groups
    Object.entries(messageGroups).forEach(([senderId, senderGroups]) => {
      senderGroups.forEach((group, idx) => {
        if (group.length > 1) {
          groups[`message_${senderId}_${idx}`] = group;
        } else {
          standalone.push(...group);
        }
      });
    });

    // --- Group other types as before, but skip messages (already handled) ---
    notifications.forEach(notification => {
      if (notification.type === 'message' && notification.data?.sender_id) return; // already handled
      const senderId = notification.data?.sender_id;
      let groupKey = '';
      const notificationTime = new Date(notification.created_at).getTime();
      if (['like', 'comment', 'mention'].includes(notification.type) && notification.data?.target_id) {
        const timeWindow = 24 * 60 * 60 * 1000;
        groupKey = `interaction_${notification.data.target_id}_${Math.floor(notificationTime / timeWindow)}`;
      } else if (notification.type === 'follow' && senderId) {
        const timeWindow = 24 * 60 * 60 * 1000;
        groupKey = `follow_${senderId}_${Math.floor(notificationTime / timeWindow)}`;
      }
      if (groupKey) {
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(notification);
      } else {
        standalone.push(notification);
      }
    });

    // Convert groups to GroupedNotification format
    const result: GroupedNotification[] = [];
    Object.entries(groups).forEach(([key, groupNotifications]) => {
      if (groupNotifications.length >= 2) {
        const latest = groupNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        result.push({
          id: key,
          notifications: groupNotifications,
          sender_id: latest.data?.sender_id,
          sender_name: latest.data?.sender_name,
          latest_created_at: latest.created_at,
          total_unread: groupNotifications.filter(n => !n.read).length,
          category: latest.category ?? 'system',
          type: latest.type,
          isGrouped: true
        });
      } else {
        standalone.push(...groupNotifications);
      }
    });
    standalone.forEach(notification => {
      result.push({
        id: notification.id,
        notifications: [notification],
        sender_id: notification.data?.sender_id,
        sender_name: notification.data?.sender_name,
        latest_created_at: notification.created_at,
        total_unread: notification.read ? 0 : 1,
        category: notification.category ?? 'system',
        type: notification.type,
        isGrouped: false
      });
    });
    return result.sort((a, b) => new Date(b.latest_created_at).getTime() - new Date(a.latest_created_at).getTime());
  }, [notifications]);

  // Apply filters and pagination
  useEffect(() => {
    let filtered = [...groupedNotifications];

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(g => g.category === selectedCategory);
    }

    // Apply read filter
    if (readFilter === 'unread') {
      filtered = filtered.filter(g => g.total_unread > 0);
    } else if (readFilter === 'read') {
      filtered = filtered.filter(g => g.total_unread === 0);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(g => 
        g.notifications.some(n => 
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query) ||
          n.data?.sender_name?.toLowerCase().includes(query)
        )
      );
    }

    setFilteredNotifications(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [groupedNotifications, selectedCategory, readFilter, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Initial fetch
  useEffect(() => {
    if (notifications.length === 0) {
      fetchNotifications();
    }
  }, [fetchNotifications, notifications.length]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  };

  const handleGroupClick = (group: GroupedNotification) => {
    if (group.isGrouped) {
      toggleGroupExpansion(group.id);
    } else {
      handleNotificationClick(group.notifications[0]);
    }

    // Mark as read if unread
    if (group.total_unread > 0) {
      group.notifications.forEach(n => {
        if (!n.read) {
          markAsRead(n.id);
        }
      });
    }
  };

  const toggleGroupExpansion = (groupId: string) => {
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

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read first
    markAsRead(notification.id);
    // Navigate immediately so UI removal doesn't interfere
    navigateToNotification(notification);
    // Cleanup in background
    removeNotification(notification.id);
    fetch(`/api/notifications/${notification.id}`, { method: 'DELETE' });
  };

  const navigateToNotification = (notification: Notification) => {
    const data = (notification.data as Record<string, any>) || {};
    switch (notification.type) {
      case 'message': {
        if (data.conversation_id) {
          window.location.href = `/messages/${data.conversation_id}`;
          return;
        }
        break;
      }
      case 'follow': {
        const actorId = data.actor_id || data.sender_id || data.user_id || data.follower_id;
        if (actorId) {
          window.location.href = `/user/${actorId}`;
          return;
        }
        if (data.action_url) {
          window.location.href = data.action_url as string;
          return;
        }
        break;
      }
      case 'like':
      case 'comment':
      case 'mention': {
        const targetId = data.target_id || data.post_id;
        if (targetId) {
          window.location.href = `/post/${targetId}`;
          return;
        }
        break;
      }
      case 'application_approved':
      case 'application_rejected': {
        window.location.href = '/studio';
        return;
      }
      default: {
        if ((notification as any).action_url) {
          window.location.href = (notification as any).action_url as string;
          return;
        }
        if (data.action_url) {
          window.location.href = data.action_url as string;
          return;
        }
        window.location.href = '/notifications';
      }
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'message': return MessageCircle;
      case 'like': return Heart;
      case 'comment': return MessageSquare;
      case 'follow': return Users;
      case 'mention': return AtSign;
      case 'achievement': return Trophy;
      default: return Bell;
    }
  };

  const getCategoryColor = (category: NotificationCategory) => {
    switch (category) {
      case 'social': return 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400';
      case 'messaging': return 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400';
      case 'content': return 'text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400';
      case 'system': return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400';
      case 'achievement': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400';
      case 'security': return 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const generateGroupSummary = (group: GroupedNotification) => {
    const { notifications, sender_name } = group;
    const messageCount = notifications.filter(n => n.type === 'message').length;
    const imageCount = notifications.filter(n => 
      n.data?.message_type === 'image' || 
      n.data?.image_url ||
      n.message.toLowerCase().includes('image') || 
      n.message.toLowerCase().includes('photo')
    ).length;
    const likeCount = notifications.filter(n => n.type === 'like').length;
    const commentCount = notifications.filter(n => n.type === 'comment').length;

    if (group.type === 'message') {
      const parts = [];
      if (messageCount > imageCount) {
        parts.push(`${messageCount - imageCount} message${messageCount - imageCount > 1 ? 's' : ''}`);
      }
      if (imageCount > 0) {
        parts.push(`${imageCount} photo${imageCount > 1 ? 's' : ''}`);
      }
      
      return parts.length > 0 
        ? `${sender_name || 'Someone'} sent ${parts.join(' and ')}`
        : `${sender_name || 'Someone'} sent ${notifications.length} message${notifications.length > 1 ? 's' : ''}`;
    }

    if (group.type === 'like') {
      return `${likeCount} new like${likeCount > 1 ? 's' : ''} on your post`;
    }

    if (group.type === 'comment') {
      return `${commentCount} new comment${commentCount > 1 ? 's' : ''} on your post`;
    }

    if (group.type === 'follow') {
      return `${notifications.length} new follower${notifications.length > 1 ? 's' : ''}`;
    }

    return `${notifications.length} new notification${notifications.length > 1 ? 's' : ''}`;
  };

  const formatNotificationMessage = (notification: Notification) => {
    // Check if it's an image notification
    if (notification.data?.message_type === 'image' || 
        notification.data?.image_url ||
        notification.message.toLowerCase().includes('sent you an image') ||
        notification.message.toLowerCase().includes('sent a photo') ||
        notification.message.toLowerCase().includes('shared an image') ||
        notification.message.includes('data:image/')) {
      return (
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-gray-500" />
          <span>Sent you a photo</span>
        </div>
      );
    }
    
    return notification.message;
  };

  const NotificationSkeleton = () => (
    <div className="animate-pulse p-4 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-black">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full flex-shrink-0"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  );

  const PaginationControls = () => (
    <div className="flex items-center justify-between mt-6 px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span>
          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
          {Math.min(currentPage * ITEMS_PER_PAGE, filteredNotifications.length)} of{' '}
          {filteredNotifications.length} notifications
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = i + 1;
            if (totalPages <= 5) {
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    currentPage === pageNum
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            }
            
            // For more than 5 pages, show smart pagination
            const showPage = pageNum <= 2 || pageNum >= totalPages - 1 || Math.abs(pageNum - currentPage) <= 1;
            if (!showPage) {
              if (pageNum === 3 && currentPage > 4) {
                return <span key={pageNum} className="px-2 text-gray-400">...</span>;
              }
              if (pageNum === totalPages - 2 && currentPage < totalPages - 3) {
                return <span key={pageNum} className="px-2 text-gray-400">...</span>;
              }
              return null;
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  currentPage === pageNum
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">
              Notifications
            </h1>
            {isGlobalConnected && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Live
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-[#EF3866] text-white hover:bg-[#d8325b] transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Mark All
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EF3866] transition"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Category:</span>
            </div>
            {(['all', 'social', 'messaging', 'content', 'system', 'achievement', 'security'] as const).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}

            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
            </div>
            {(['all', 'unread', 'read'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setReadFilter(status)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  readFilter === status
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading && notifications.length === 0 ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <NotificationSkeleton key={index} />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
              {searchQuery || selectedCategory !== 'all' || readFilter !== 'all'
                ? 'No notifications match your filters'
                : 'No notifications yet'
              }
            </p>
            {(searchQuery || selectedCategory !== 'all' || readFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setReadFilter('all');
                }}
                className="text-black dark:text-white hover:underline text-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedNotifications.map((group) => {
                const IconComponent = getTypeIcon(group.type);
                const isExpanded = expandedGroups.has(group.id);
                
                return (
                  <div key={group.id} className="group">
                    {/* Group Header */}
                    <div
                      onClick={() => handleGroupClick(group)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                        group.total_unread > 0
                          ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                          : 'bg-white dark:bg-black border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[#EF3866]/10 text-[#EF3866]`}>
                          <IconComponent className="w-5 h-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-black dark:text-white text-sm truncate">
                              {group.isGrouped && group.type === 'message'
                                ? `${group.sender_name || 'Someone'}: ${group.notifications[0].message}`
                                : group.isGrouped
                                  ? generateGroupSummary(group)
                                  : group.notifications[0].title}
                            </h3>
                            {group.total_unread > 0 && (
                              <span className="w-2 h-2 rounded-full bg-[#EF3866] flex-shrink-0"></span>
                            )}
                            {group.isGrouped && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                                {group.notifications.length}
                              </span>
                            )}
                          </div>

                          {/* Only show latest message preview for grouped messages */}
                          {group.isGrouped && group.type === 'message' && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {formatNotificationMessage(group.notifications[0])}
                            </div>
                          )}
                          {!group.isGrouped && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {formatNotificationMessage(group.notifications[0])}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(new Date(group.latest_created_at), { addSuffix: true })}
                            </span>
                            
                            <div className="flex items-center gap-1">
                              {group.isGrouped && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGroupExpansion(group.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  group.notifications.forEach(n => removeNotification(n.id));
                                }}
                                className="p-1 text-gray-400 hover:text-[#EF3866] transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Group Items */}
                    {group.isGrouped && isExpanded && (
                      <div className="ml-13 mt-2 space-y-2">
                        {group.notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-black dark:text-white mb-1">
                                  {notification.title}
                                </h4>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                  {formatNotificationMessage(notification)}
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              {!notification.read && (
                                <span className="w-2 h-2 rounded-full bg-[#EF3866] flex-shrink-0"></span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && <PaginationControls />}
          </>
        )}

      </div>
    </div>
  );
};