'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Reply, Smile, MoreHorizontal, Copy, Trash2 } from 'lucide-react';

// Updated Message type to match both files
interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  created_at: string;
  conversation_id: string;
  updated_at: string;
  reply_to_id?: string;
  reply_to?: Message;
  reactions?: Array<{ id: string; emoji: string; user_id: string; message_id: string; created_at: string }>;
  metadata?: { caption?: string };
}

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onReply?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onImageClick?: (imageUrl: string) => void;
  onDelete?: (messageId: string, message: Message) => void;
  replyingTo?: Message;
}

// MessageReactions Component
const MessageReactions: React.FC<{
  reactions: Array<{ id: string; emoji: string; user_id: string; message_id: string; created_at: string }>;
  currentUserId: string;
  onReact: (emoji: string) => void;
}> = ({ onReact }) => {
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
  onImageClick
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
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

  const handleCopy = async () => {
    try {
      if (message.content) {
        await navigator.clipboard.writeText(message.content);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    setShowActions(false);
  };

  const handleReact = (emoji: string) => {
    onReact?.(message.id, emoji);
    setShowReactions(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      onDelete?.(message.id, message);
    }
    setShowActions(false);
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

  // Group reactions by emoji and count them
  const groupedReactions = message.reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = { count: 0, users: [] };
    }
    acc[reaction.emoji].count += 1;
    acc[reaction.emoji].users.push(reaction.user_id);
    return acc;
  }, {} as Record<string, { count: number; users: string[] }>);

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
            {Object.entries(groupedReactions || {}).map(([emoji, data]) => (
              <button
                key={emoji}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 cursor-pointer flex items-center gap-1 ${
                  isOwnMessage 
                    ? 'bg-white/20 text-white hover:bg-white/30' 
                    : 'bg-white dark:bg-black text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => handleReact(emoji)}
                title={`${data.count} reaction${data.count > 1 ? 's' : ''}`}
              >
                <span>{emoji}</span>
                {data.count > 1 && <span className="text-xs opacity-80">{data.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Actions Menu */}
      {showActions && (
        <div
          className={`fixed z-[9999] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}
          style={{
            maxWidth: '280px',
            minWidth: '240px'
          }}
        >
          <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 p-2">
            <div className="space-y-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReply?.(message);
                  setShowActions(false);
                }}
                className="w-full flex items-center gap-4 px-4 py-3 text-sm text-black dark:text-white hover:bg-gray-100/50 dark:hover:bg-gray-900/50 rounded-2xl transition-all duration-200"
              >
                <Reply className="w-5 h-5" />
                <span>Reply</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReactions(!showReactions);
                  setShowActions(false);
                }}
                className="w-full flex items-center gap-4 px-4 py-3 text-sm text-black dark:text-white hover:bg-gray-100/50 dark:hover:bg-gray-900/50 rounded-2xl transition-all duration-200"
              >
                <Smile className="w-5 h-5" />
                <span>React</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className="w-full flex items-center gap-4 px-4 py-3 text-sm text-black dark:text-white hover:bg-gray-100/50 dark:hover:bg-gray-900/50 rounded-2xl transition-all duration-200"
              >
                <Copy className="w-5 h-5" />
                <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
              </button>
              
              {isOwnMessage && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 text-sm text-[#EF3866] hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-2xl transition-all duration-200"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Reactions Picker */}
      {showReactions && (
        <div className={`fixed z-[9998] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}>
          <MessageReactions
            reactions={message.reactions || []}
            currentUserId={message.sender_id}
            onReact={handleReact}
          />
        </div>
      )}

      {/* Copy success notification */}
      {copySuccess && (
        <div className={`absolute -top-12 ${
          isOwnMessage ? 'right-0' : 'left-0'
        } bg-green-500 text-white text-xs px-3 py-1 rounded-full shadow-lg z-50 animate-fade-in-out`}>
          Copied to clipboard!
        </div>
      )}
    </div>
  );
};

export { MessageBubble };