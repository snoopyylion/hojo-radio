// components/MessageReactions.tsx
import React from 'react';
import { MessageReaction } from '../../types/messaging';

interface MessageReactionsProps {
  reactions: MessageReaction[];
  onReactionClick: (emoji: string) => void;
  currentUserId: string;
  className?: string;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onReactionClick,
  currentUserId,
  className = ''
}) => {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, MessageReaction[]>);

  return (
    <div className={`flex flex-wrap gap-1 mt-2 ${className}`}>
      {Object.entries(groupedReactions).map(([emoji, reactionList]) => {
        const hasUserReacted = reactionList.some(r => r.user_id === currentUserId);
        const count = reactionList.length;
        
        return (
          <button
            key={emoji}
            onClick={() => onReactionClick(emoji)}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
              border transition-colors duration-200
              ${hasUserReacted 
                ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200' 
                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
              }
            `}
            title={reactionList.map(r => r.user?.username || 'Unknown').join(', ')}
          >
            <span>{emoji}</span>
            <span className="font-medium">{count}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MessageReactions;