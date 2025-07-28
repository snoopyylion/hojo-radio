// components/EnhancedNotificationList.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useGlobalNotifications } from '@/context/EnhancedGlobalNotificationsContext';
import { formatDistanceToNow } from 'date-fns';
import { X, Check, CheckCheck, Bell, Filter, Search, RefreshCw } from 'lucide-react';
import { BaseNotification, NotificationCategory, NotificationType } from '@/types/notifications';

interface NotificationData {
  conversation_id?: string;
  target_id?: string;
  [key: string]: unknown;
}

interface Notification extends BaseNotification {
  data?: NotificationData;
}

export const EnhancedNotificationList: React.FC = () => {
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    fetchNotifications,
    isGlobalConnected
  } = useGlobalNotifications();

  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all');
  const [selectedType, setSelectedType] = useState<NotificationType | 'all'>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newNotificationIds, setNewNotificationIds] = useState<Set<string>>(new Set());

  // Track new notifications for animation
  useEffect(() => {
    if (notifications.length > 0) {
      const currentIds = new Set(notifications.map(n => n.id));
      const previousIds = new Set(filteredNotifications.map(n => n.id));
      
      // Find new notifications
      const newIds = new Set([...currentIds].filter(id => !previousIds.has(id)));
      
      if (newIds.size > 0) {
        setNewNotificationIds(newIds);
        // Remove animation class after animation completes
        setTimeout(() => {
          setNewNotificationIds(new Set());
        }, 1000);
      }
    }
  }, [notifications, filteredNotifications]);

  // Apply filters whenever notifications or filters change
  useEffect(() => {
    let filtered = [...notifications] as Notification[];

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(n => n.category === selectedCategory);
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(n => n.type === selectedType);
    }

    // Apply read filter
    if (readFilter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (readFilter === 'read') {
      filtered = filtered.filter(n => n.read);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, selectedCategory, selectedType, readFilter, searchQuery]);

  // Initial fetch only once
  useEffect(() => {
    if (notifications.length === 0) {
      fetchNotifications();
    }
  }, [fetchNotifications, notifications.length]);

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    navigateToNotification(notification);
  };

  const navigateToNotification = (notification: Notification) => {
    switch (notification.type) {
      case 'message':
        if (notification.data?.conversation_id) {
          window.location.href = `/messages/${notification.data.conversation_id}`;
        }
        break;
      case 'follow':
      case 'like':
      case 'comment':
      case 'mention':
        if (notification.data?.target_id) {
          window.location.href = `/posts/${notification.data.target_id}`;
        }
        break;
      case 'application_approved':
      case 'application_rejected':
        window.location.href = '/studio';
        break;
      default:
        window.location.href = '/notifications';
    }
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'social': return '👥';
      case 'messaging': return '💬';
      case 'content': return '📝';
      case 'system': return '⚙️';
      case 'achievement': return '🏆';
      case 'security': return '🔒';
      default: return '🔔';
    }
  };

  const getCategoryColor = (category: NotificationCategory) => {
    switch (category) {
      case 'social': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'messaging': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'content': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'system': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'achievement': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'security': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Skeleton loader component
  const NotificationSkeleton = () => (
    <div className="animate-pulse">
      <div className="p-4 rounded-xl border bg-white dark:bg-black">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="w-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 font-sora bg-white dark:bg-black min-h-screen transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">
            Notifications
          </h2>
          {isGlobalConnected && (
            <div className="flex items-center gap-2 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-[#EF3866] text-white rounded-lg hover:bg-[#EF3866]/90 text-sm font-medium transition"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </button>
            <button
              onClick={clearAllNotifications}
              className="flex items-center gap-2 px-4 py-2 border border-black/10 dark:border-white/10 text-black dark:text-white text-sm rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EF3866] focus:border-transparent"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {/* Category Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Category:</span>
            {(['all', 'social', 'messaging', 'content', 'system', 'achievement', 'security'] as const).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  selectedCategory === category
                    ? 'bg-[#EF3866] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Read Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
            {(['all', 'unread', 'read'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setReadFilter(status)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  readFilter === status
                    ? 'bg-[#EF3866] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading && notifications.length === 0 ? (
        // Initial loading - show skeletons
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <NotificationSkeleton key={index} />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        // Empty state
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
            <Bell className="w-8 h-8 text-black/30 dark:text-white/30" />
          </div>
          <p className="text-black/60 dark:text-white/60 font-medium mb-2">
            {searchQuery || selectedCategory !== 'all' || selectedType !== 'all' || readFilter !== 'all'
              ? 'No notifications match your filters'
              : 'No notifications yet'
            }
          </p>
          {(searchQuery || selectedCategory !== 'all' || selectedType !== 'all' || readFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedType('all');
                setReadFilter('all');
              }}
              className="text-[#EF3866] hover:underline text-sm"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        // Notifications list
        <div className="space-y-3">
          {filteredNotifications.map((notification: Notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`group relative p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg
                ${notification.read
                  ? 'bg-white dark:bg-black hover:bg-black/5 dark:hover:bg-white/5'
                  : 'bg-[#EF3866]/10 dark:bg-[#EF3866]/15 hover:bg-[#EF3866]/15 dark:hover:bg-[#EF3866]/20'}
                ${newNotificationIds.has(notification.id) ? 'animate-pulse bg-[#EF3866]/20 dark:bg-[#EF3866]/25' : ''}
              `}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {notification.category && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(notification.category)}`}>
                        {getCategoryIcon(notification.category)} {notification.category}
                      </span>
                    )}
                    <h3 className="text-base sm:text-lg font-semibold text-black dark:text-white truncate">
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-[#EF3866] flex-shrink-0"></span>
                    )}
                  </div>

                  <p className="text-sm text-black/80 dark:text-white/70 leading-relaxed mb-2">
                    {notification.message}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-black/50 dark:text-white/50">
                    <span>
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    {notification.priority && (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        notification.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        notification.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                        notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {notification.priority}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      title="Mark as read"
                      className="p-2 text-[#EF3866] hover:bg-[#EF3866]/10 rounded-lg transition"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                    title="Remove"
                    className="p-2 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {notifications.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <span>
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </span>
            <span>
              {notifications.filter(n => !n.read).length} unread
            </span>
          </div>
        </div>
      )}
    </div>
  );
}; 