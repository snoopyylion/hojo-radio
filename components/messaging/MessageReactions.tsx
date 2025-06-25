// components/messaging/MessageReactions.tsx
import React, { useState } from 'react';
import { MessageReaction } from '@/types/messaging';
import { EmojiPicker } from './EmojiPicker';

interface MessageReactionsProps {
  reactions: MessageReaction[];
  onReact: (emoji: string) => void;
  currentUserId: string;
  className?: string;
}

export function MessageReactions({ 
  reactions, 
  onReact, 
  currentUserId, 
  className = "" 
}: MessageReactionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        hasCurrentUser: false
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.user?.firstName || reaction.user?.username || 'Unknown');
    if (reaction.user_id === currentUserId) {
      acc[reaction.emoji].hasCurrentUser = true;
    }
    return acc;
  }, {} as Record<string, { emoji: string; count: number; users: string[]; hasCurrentUser: boolean }>);

  const reactionEntries = Object.values(groupedReactions);

  const handleEmojiSelect = (emoji: string) => {
    onReact(emoji);
    setShowEmojiPicker(false);
  };

  const getUsersText = (users: string[]) => {
    if (users.length === 1) return users[0];
    if (users.length === 2) return `${users[0]} and ${users[1]}`;
    if (users.length <= 5) {
      return `${users.slice(0, -1).join(', ')}, and ${users[users.length - 1]}`;
    }
    return `${users.slice(0, 3).join(', ')}, and ${users.length - 3} others`;
  };

  return (
    <div className={`flex items-center space-x-1 relative ${className}`}>
      {/* Existing Reactions */}
      {reactionEntries.map(({ emoji, count, users, hasCurrentUser }) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className={`
            flex items-center space-x-1 px-2 py-1 rounded-full text-xs
            transition-all duration-200 hover:scale-105
            ${hasCurrentUser 
              ? 'bg-blue-100 border border-blue-300 text-blue-700' 
              : 'bg-gray-100 hover:bg-gray-200 border border-gray-300'
            }
          `}
          title={`${getUsersText(users)} reacted with ${emoji}`}
        >
          <span>{emoji}</span>
          <span className="font-medium">{count}</span>
        </button>
      ))}

      {/* Add Reaction Button */}
      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="
            flex items-center justify-center w-7 h-7 rounded-full
            bg-gray-100 hover:bg-gray-200 border border-gray-300
            transition-colors duration-200 text-gray-500 hover:text-gray-700
          "
          title="Add reaction"
        >
          <span className="text-sm">😊</span>
        </button>

        {showEmojiPicker && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowEmojiPicker(false)}
            />
            <div className="absolute bottom-full left-0 mb-2 z-20">
              <EmojiPicker onEmojiSelect={handleEmojiSelect} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}