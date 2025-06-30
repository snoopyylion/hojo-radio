// components/NotificationBell.tsx
'use client';

import React from 'react';
import { Bell, BellRing } from 'lucide-react';
import { useGlobalNotifications } from '@/context/EnhancedGlobalNotificationsContext';

export const NotificationBell: React.FC = () => {
  const { unreadCount, isGlobalConnected } = useGlobalNotifications();

  return (
    <div className="relative">
      {isGlobalConnected ? (
        <BellRing className="w-6 h-6 text-blue-500" />
      ) : (
        <Bell className="w-6 h-6 text-gray-500" />
      )}
      
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  );
};