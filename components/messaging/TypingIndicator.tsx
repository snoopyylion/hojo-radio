// components/messaging/TypingIndicator.tsx
import React from 'react';
import { User } from '@/types/messaging';

interface TypingIndicatorProps {
  typingUsers: Set<string>;
  users: User[];
  className?: string;
}

export function TypingIndicator({ typingUsers, users, className = "" }: TypingIndicatorProps) {
  if (typingUsers.size === 0) return null;

  const getTypingUserNames = () => {
    const typingUserArray = Array.from(typingUsers);
    const names = typingUserArray
      .map(userId => {
        const user = users.find(u => u.id === userId);
        return user?.firstName || user?.username || 'Someone';
      })
      .slice(0, 3);

    if (names.length === 1) {
      return `${names[0]} is typing`;
    } else if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing`;
    } else if (names.length === 3 && typingUsers.size === 3) {
      return `${names[0]}, ${names[1]}, and ${names[2]} are typing`;
    } else if (names.length === 3 && typingUsers.size > 3) {
      return `${names[0]}, ${names[1]}, and ${typingUsers.size - 2} others are typing`;
    }
    
    return 'Several people are typing';
  };

  return (
    <div className={`flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 ${className}`}>
      <div className="flex space-x-1">
        <div className="flex space-x-1 animate-pulse">
          <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
      <span className="italic text-gray-700 dark:text-gray-300">{getTypingUserNames()}</span>
    </div>
  );
}