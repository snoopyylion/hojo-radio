// components/messaging/InAppNotification.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, MessageCircle, Users, Image as ImageIcon } from 'lucide-react';
import { Message, TypingUser, User } from '@/types/messaging';

interface InAppNotificationProps {
  type: 'message' | 'typing';
  message?: Message;
  typingUsers?: TypingUser[];
  users?: User[];
  conversationName?: string;
  onClose: () => void;
  onClick?: () => void;
  duration?: number;
}

export const InAppNotification: React.FC<InAppNotificationProps> = ({
  type,
  message,
  typingUsers = [],
  users = [],
  conversationName,
  onClose,
  onClick,
  duration = 5000
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Memoize the close handler to prevent re-renders
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  // Show animation effect - only run once
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []); // Empty dependency array - only run once

  // Auto close after duration - only run when duration or handleClose changes
  useEffect(() => {
    if (duration <= 0) return;
    
    const timer = setTimeout(() => {
      handleClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, handleClose]); // Fixed dependency array

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    }
    handleClose();
  }, [onClick, handleClose]);

  const getUserName = useCallback((userId: string): string => {
    const user = users.find(u => u.id === userId);
    return user?.username || user?.email || 'Unknown User';
  }, [users]);

  const renderContent = () => {
    if (type === 'message' && message) {
      const senderName = getUserName(message.sender_id);
      const isImageMessage = message.message_type === 'image';
      const content = isImageMessage 
        ? '📷 Sent an image'
        : (message.content.length > 100 
          ? `${message.content.substring(0, 100)}...`
          : message.content);

      return (
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                New message from {senderName}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {conversationName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                in {conversationName}
              </p>
            )}
            
            {/* Show image icon for image messages */}
            {isImageMessage && message.content && (
              <div className="mt-2">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                    <ImageIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Image
                  </span>
                </div>
              </div>
            )}
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
              {content}
            </p>
          </div>
        </div>
      );
    }

    if (type === 'typing' && typingUsers.length > 0) {
      const activeTypers = typingUsers.filter(tu => Date.now() - tu.timestamp < 5000);
      const typerNames = activeTypers.map(tu => getUserName(tu.userId));

      let typingText: string;
      if (typerNames.length === 1) {
        typingText = `${typerNames[0]} is typing...`;
      } else if (typerNames.length === 2) {
        typingText = `${typerNames[0]} and ${typerNames[1]} are typing...`;
      } else {
        typingText = `${typerNames.length} people are typing...`;
      }

      return (
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {typingText}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {conversationName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                in {conversationName}
              </p>
            )}
            <div className="flex items-center space-x-1 mt-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 w-96 max-w-sm
        bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700
        rounded-lg shadow-lg
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isClosing 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
        ${onClick ? 'cursor-pointer hover:shadow-xl' : ''}
      `}
      onClick={onClick ? handleClick : undefined}
    >
      <div className="p-4">
        {renderContent()}
      </div>
      
      {/* Progress bar for auto-close */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-b-lg"
            style={{ 
              animation: `shrink ${duration}ms linear`,
              transformOrigin: 'left'
            }}
          />
        </div>
      )}
      
      <style jsx>{`
        @keyframes shrink {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
      `}</style>
    </div>
  );
};

// Notification container to manage multiple notifications
export const NotificationContainer: React.FC<{
  notifications: Array<{
    id: string;
    type: 'message' | 'typing';
    message?: Message;
    typingUsers?: TypingUser[];
    users?: User[];
    conversationName?: string;
    onClick?: () => void;
  }>;
  onRemoveNotification: (id: string) => void;
}> = ({ notifications, onRemoveNotification }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{ 
            transform: `translateY(${index * 8}px)`,
            zIndex: 50 - index
          }}
        >
          <InAppNotification
            {...notification}
            onClose={() => onRemoveNotification(notification.id)}
          />
        </div>
      ))}
    </div>
  );
};