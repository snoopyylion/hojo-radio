// components/RealTimeNotificationBell.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useGlobalNotifications } from '@/context/EnhancedGlobalNotificationsContext';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { NotificationDot } from './NotificationDot';

interface RealTimeNotificationBellProps {
  className?: string;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal';
}

export const RealTimeNotificationBell: React.FC<RealTimeNotificationBellProps> = ({
  className = '',
  showCount = true,
  size = 'md',
  variant = 'default'
}) => {
  const { unreadCount, isGlobalConnected } = useGlobalNotifications();
  const [isAnimating, setIsAnimating] = useState(false);
  const [previousCount, setPreviousCount] = useState(0);

  // Animation when new notifications arrive
  useEffect(() => {
    if (unreadCount > previousCount && previousCount > 0) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }
    setPreviousCount(unreadCount);
  }, [unreadCount, previousCount]);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  const baseClasses = `relative flex items-center justify-center rounded-full transition-all duration-300 ${sizeClasses[size]} ${className}`;

  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600',
    minimal: 'hover:bg-gray-100 dark:hover:bg-gray-800'
  };

  const animationClasses = isAnimating
    ? 'animate-pulse ring-2 ring-[#EF3866] ring-opacity-50'
    : '';

  return (
    <Link
      href="/notifications"
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses}`}
    >
      <Bell
        size={iconSizes[size]}
        className={`transition-colors ${isGlobalConnected
            ? 'text-gray-700 dark:text-gray-300'
            : 'text-gray-400 dark:text-gray-500'
          }`}
      />

      {/* Connection status indicator */}
      {!isGlobalConnected && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
      )}

      {/* Unread count badge */}
      {showCount && unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#EF3866] text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-bounce">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}

      {/* Notification dot for minimal variant */}
      {variant === 'minimal' && unreadCount > 0 && (
        <NotificationDot
          className="absolute -top-1 -right-1"
          show={true}
        />
      )}
    </Link>
  );
}; 