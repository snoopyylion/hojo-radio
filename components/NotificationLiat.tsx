'use client';

import React, { useEffect } from 'react';
import { useGlobalNotifications } from '@/context/EnhancedGlobalNotificationsContext';
import { formatDistanceToNow } from 'date-fns';
import { X, Check, CheckCheck, Bell } from 'lucide-react';

interface NotificationData {
  conversation_id?: string;
  target_id?: string;
  [key: string]: unknown;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: NotificationData;
}

export const NotificationList: React.FC = () => {
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    fetchNotifications
  } = useGlobalNotifications();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Note: Auto-refresh removed to prevent reload behavior
  // Real-time updates are handled by WebSocket connections

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

  if (isLoading) {
    return (
      <div className="p-8 text-center font-sora">
        <div className="w-6 h-6 border-2 border-[#EF3866] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-3 text-black/60 dark:text-white/60">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 font-sora bg-white dark:bg-black min-h-screen transition-colors">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">
          Notifications
        </h2>

        {notifications.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:gap-3">
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

      {/* Empty State */}
      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
            <Bell className="w-8 h-8 text-black/30 dark:text-white/30" />
          </div>
          <p className="text-black/60 dark:text-white/60 font-medium">
            No notifications yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification: Notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`group relative p-4 rounded-xl border cursor-pointer transition-all
                ${notification.read
                  ? 'bg-white dark:bg-black hover:bg-black/5 dark:hover:bg-white/5'
                  : 'bg-[#EF3866]/10 dark:bg-[#EF3866]/15 hover:bg-[#EF3866]/15 dark:hover:bg-[#EF3866]/20'}
              `}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
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

                  <p className="text-xs text-black/50 dark:text-white/50">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                    })}
                  </p>
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
    </div>
  );
};
