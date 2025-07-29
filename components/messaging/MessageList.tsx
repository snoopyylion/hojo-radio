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

interface User {
  id: string;
  name: string;
}

interface MessagesListProps {
  messages?: Message[];
  typingUsers?: Set<string>;
  users?: User[];
  currentUserId?: string;
  onReactToMessage?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onDeleteMessage?: (messageId: string, message: Message) => void;
  onLoadMore?: () => void;
  loading?: boolean;
  hasMore?: boolean;
  className?: string;
  replyingTo?: Message | null;
}

// MessageReactions Component
const MessageReactions: React.FC<{
  reactions: Array<{ emoji: string; user_id: string }>;
  currentUserId: string;
  onReact: (emoji: string) => void;
}> = ({ reactions, currentUserId, onReact }) => {
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
const MessageBubble: React.FC<{
  message: Message;
  isOwnMessage: boolean;
  onReply?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string, message: Message) => void;
  onImageClick?: (imageUrl: string) => void;
  replyingTo?: Message | null;
}> = ({
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

// TypingIndicator Component
const TypingIndicator: React.FC = () => (
  <div className="flex items-center space-x-1">
    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce"></div>
    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
  </div>
);

// LoadingSpinner Component
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 dark:border-gray-700 border-t-[#EF3866]`}></div>
  );
};

// MessagesList Component
const MessagesList: React.FC<MessagesListProps> = ({
  messages = [],
  typingUsers = new Set(),
  users = [],
  currentUserId = 'user1',
  onReactToMessage = () => {},
  onReply = () => {},
  onDeleteMessage = () => {},
  onLoadMore,
  loading = false,
  hasMore = false,
  className = "",
  replyingTo
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, shouldAutoScroll]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setShouldAutoScroll(isNearBottom);

    if (scrollTop === 0 && hasMore && onLoadMore && !loading) {
      onLoadMore();
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentGroup: { date: string; messages: Message[] } | null = null;

    messages.forEach(message => {
      const messageDate = new Date(message.created_at);
      const dateKey = messageDate.toDateString();

      if (!currentGroup || currentGroup.date !== dateKey) {
        currentGroup = { date: dateKey, messages: [] };
        groups.push(currentGroup);
      }

      currentGroup.messages.push(message);
    });

    return groups;
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className={`flex flex-col h-full relative bg-white dark:bg-black ${className}`}>
      {/* Modern gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-black dark:to-gray-900 pointer-events-none"></div>
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="16" cy="16" r="1" fill="currentColor" className="text-gray-600 dark:text-gray-400"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)"/>
        </svg>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto py-4 relative z-10 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
        onScroll={handleScroll}
      >
        {/* Loading indicator */}
        {loading && hasMore && (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-3 bg-white dark:bg-black backdrop-blur-sm rounded-full px-6 py-3 shadow-xl border border-gray-200 dark:border-gray-800">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Loading messages...</span>
            </div>
          </div>
        )}

        {/* Message groups */}
        {messageGroups.map(group => (
          <div key={group.date} className="space-y-2">
            {/* Date header */}
            <div className="flex justify-center my-8">
              <div className="bg-white dark:bg-black backdrop-blur-sm text-gray-700 dark:text-gray-300 text-sm font-semibold px-6 py-2 rounded-full border border-gray-200 dark:border-gray-800 shadow-lg">
                {formatDateHeader(group.date)}
              </div>
            </div>

            {/* Messages */}
            {group.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.sender_id === currentUserId}
                onReply={onReply}
                onReact={onReactToMessage}
                onImageClick={() => {}}
                onDelete={onDeleteMessage}
                replyingTo={replyingTo}
              />
            ))}
          </div>
        ))}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="flex justify-start mb-6 px-2 sm:px-4">
            <div className="flex items-center space-x-3 bg-gray-100 dark:bg-gray-900 backdrop-blur-sm rounded-full px-4 py-3 shadow-lg border border-gray-200 dark:border-gray-800">
              <TypingIndicator />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Someone is typing...
              </span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="bg-white dark:bg-black backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-gray-200 dark:border-gray-800 max-w-sm">
              <div className="text-6xl mb-6 opacity-20">💬</div>
              <h3 className="text-xl font-bold mb-4 text-black dark:text-white">Start a conversation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Send a message to begin chatting. Your conversation will appear here.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!shouldAutoScroll && (
        <div className="absolute bottom-6 right-4 sm:right-6 z-20">
          <button
            onClick={scrollToBottom}
            className="bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-full p-4 shadow-2xl border border-gray-200 dark:border-gray-800 transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-sm"
            title="Scroll to bottom"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MessagesList;