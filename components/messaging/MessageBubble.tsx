'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Reply, Heart, Smile, MoreHorizontal, ChevronDown, Copy, Trash2 } from 'lucide-react';

// Types
interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image';
  created_at: string;
  reply_to_id?: string;
  reply_to?: Message | null;
  reactions?: Array<{ emoji: string; user_id: string }>;
  metadata?: { caption?: string };
}

interface MessageReactionsProps {
  reactions: Array<{ emoji: string; user_id: string }>;
  currentUserId: string;
  onReact: (emoji: string) => void;
}

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onReply?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string, message: Message) => void;
  onImageClick?: (imageUrl: string) => void;
  replyingTo?: Message | null;
}

// MessageReactions Component
const MessageReactions: React.FC<MessageReactionsProps> = ({ reactions, currentUserId, onReact }) => {
  const commonEmojis = ['❤️', '👍', '😂', '😮', '😢', '😡', '👏', '🔥'];
  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-3 backdrop-blur-md">
      <div className="grid grid-cols-4 gap-2">
        {commonEmojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            className="p-2 text-xl hover:bg-gray-100 dark:hover:bg-gray-900 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

// MessageBubble Component
const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  onReply,
  onReact,
  onDelete,
  onImageClick,
  replyingTo
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setIsLongPressed(true);
      setShowActions(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleClick = () => {
    if (!isLongPressed) {
      setShowActions(!showActions);
    }
    setIsLongPressed(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
        setShowActions(false);
        setShowReactions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isImageMessage = message.message_type === 'image';
  const hasReactions = message.reactions && message.reactions.length > 0;

  return (
    <div
      ref={bubbleRef}
      className={`group relative flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-1 px-2 sm:px-4`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      {/* Message Container */}
      <div
        className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] lg:max-w-[55%] xl:max-w-[50%] ${
          isOwnMessage 
            ? 'bg-[#EF3866] text-white' 
            : 'bg-gray-100 dark:bg-gray-900 text-black dark:text-white border border-gray-200 dark:border-gray-800'
        } rounded-3xl px-4 py-3 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]`}
      >
        {/* Reply indicator */}
        {(message.reply_to || message.reply_to_id) && (
          <div className={`mb-3 p-3 rounded-2xl text-xs ${
            isOwnMessage 
              ? 'bg-white/10 text-white/80' 
              : 'bg-white dark:bg-black text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Reply className="w-3 h-3" />
              <span className="font-medium">Replying to</span>
            </div>
            <p className="truncate opacity-80">
              {message.reply_to?.content || 'Original message'}
            </p>
          </div>
        )}

        {/* Message content */}
        <div className="space-y-2">
          {isImageMessage ? (
            <div 
              className="relative cursor-pointer group/image"
              onClick={() => onImageClick?.(message.content)}
            >
              <img
                src={message.content}
                alt={message.metadata?.caption || 'Shared image'}
                className="rounded-2xl max-w-full h-auto object-cover hover:opacity-90 transition-opacity w-full max-h-80"
              />
              <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-all duration-200 rounded-2xl" />
              {message.metadata?.caption && (
                <p className="text-sm mt-2 opacity-90">{message.metadata.caption}</p>
              )}
            </div>
          ) : (
            <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
        </div>

        {/* Message metadata and quick actions */}
        <div className={`flex items-center justify-between mt-3 text-xs ${
          isOwnMessage ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
        }`}>
          <span className="text-xs">
            {new Date(message.created_at).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}
          </span>
          
          {/* Quick actions - visible on hover/mobile */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity duration-300">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReact?.(message.id, '❤️');
              }}
              className={`p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
                isOwnMessage 
                  ? 'hover:bg-white/20 text-white/80' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
              title="React with heart"
            >
              <Heart className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onReply?.(message);
              }}
              className={`p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
                isOwnMessage 
                  ? 'hover:bg-white/20 text-white/80' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
              title="Reply"
            >
              <Reply className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className={`p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
                isOwnMessage 
                  ? 'hover:bg-white/20 text-white/80' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
              title="More actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reactions display */}
        {hasReactions && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.reactions?.map((reaction, idx) => (
              <div
                key={reaction.emoji + '-' + idx}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 cursor-pointer ${
                  isOwnMessage 
                    ? 'bg-white/20 text-white' 
                    : 'bg-white dark:bg-black text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800'
                }`}
              >
                {reaction.emoji}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Actions Menu */}
      {showActions && (
        <div
          className={`absolute z-50 top-0`}
          style={{
            left: isOwnMessage ? 'auto' : '50%',
            right: isOwnMessage ? '50%' : 'auto',
            transform: isOwnMessage 
              ? 'translateX(calc(50% + 8px))' 
              : 'translateX(calc(-50% - 8px))',
            maxWidth: '280px',
            minWidth: '240px'
          }}
        >
          <div className="bg-white dark:bg-black rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-2 backdrop-blur-md">
            <div className="space-y-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReactions(!showReactions);
                  setShowActions(false);
                }}
                className="w-full flex items-center gap-4 px-4 py-3 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900 rounded-2xl transition-all duration-200"
              >
                <Smile className="w-5 h-5" />
                <span>React</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReply?.(message);
                  setShowActions(false);
                }}
                className="w-full flex items-center gap-4 px-4 py-3 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900 rounded-2xl transition-all duration-200"
              >
                <Reply className="w-5 h-5" />
                <span>Reply</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (message.content) {
                    navigator.clipboard.writeText(message.content);
                  }
                  setShowActions(false);
                }}
                className="w-full flex items-center gap-4 px-4 py-3 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900 rounded-2xl transition-all duration-200"
              >
                <Copy className="w-5 h-5" />
                <span>Copy</span>
              </button>
              
              {isOwnMessage && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this message?')) {
                      onDelete(message.id, message);
                    }
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 text-sm text-[#EF3866] hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl transition-all duration-200"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reactions Picker */}
      {showReactions && (
        <div className={`absolute top-0 z-40 ${
          isOwnMessage ? 'right-full mr-4' : 'left-full ml-4'
        }`}>
          <MessageReactions
            reactions={message.reactions || []}
            currentUserId={message.sender_id}
            onReact={(emoji: string) => {
              onReact?.(message.id, emoji);
              setShowReactions(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

export { MessageBubble };