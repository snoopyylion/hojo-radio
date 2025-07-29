import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MessageBubble } from './MessageBubble';

// Updated Message type to match MessageBubble
interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  created_at: string;
  conversation_id: string;
  updated_at: string;
  reply_to_id?: string;
  reply_to?: Message | null;
  reactions?: Array<{ id: string; emoji: string; user_id: string; message_id: string; created_at: string }>;
  metadata?: { caption?: string };
}

interface User {
  id: string;
  name?: string;
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
  conversationId?: string;
}

// TypingIndicator Component with enhanced animation
const TypingIndicator: React.FC = () => (
  <div className="flex items-center space-x-1">
    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce"></div>
    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
  </div>
);

// Enhanced LoadingSpinner Component
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

  // Enhanced reaction handler
  const handleReactToMessage = (messageId: string, emoji: string) => {
    onReactToMessage(messageId, emoji);
  };

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
      {/* Enhanced gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-black dark:to-gray-900 pointer-events-none"></div>
      
      {/* Subtle animated pattern overlay */}
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
        className="flex-1 overflow-y-auto py-4 relative z-10 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-600"
        onScroll={handleScroll}
      >
        {/* Enhanced loading indicator */}
        {loading && hasMore && (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-3 bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-xl border border-gray-200 dark:border-gray-800">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Loading messages...</span>
            </div>
          </div>
        )}

        {/* Message groups */}
        {messageGroups.map(group => (
          <div key={group.date} className="space-y-2">
            {/* Enhanced date header */}
            <div className="flex justify-center my-8">
              <div className="bg-white/90 dark:bg-black/90 backdrop-blur-sm text-gray-700 dark:text-gray-300 text-sm font-semibold px-6 py-2 rounded-full border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
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
                onReact={handleReactToMessage}
                onImageClick={() => {}}
                onDelete={onDeleteMessage}
                replyingTo={replyingTo}
              />
            ))}
          </div>
        ))}

        {/* Enhanced typing indicator */}
        {typingUsers.size > 0 && (
          <div className="flex justify-start mb-6 px-2 sm:px-4">
            <div className="flex items-center space-x-3 bg-gray-100/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full px-4 py-3 shadow-lg border border-gray-200 dark:border-gray-800">
              <TypingIndicator />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {typingUsers.size === 1 ? 'Someone is typing...' : `${typingUsers.size} people are typing...`}
              </span>
            </div>
          </div>
        )}

        {/* Enhanced empty state */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
            <div className="bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-gray-200 dark:border-gray-800 max-w-sm hover:shadow-3xl transition-shadow duration-500">
              <div className="text-6xl mb-6 opacity-20 animate-pulse">💬</div>
              <h3 className="text-xl font-bold mb-4 text-black dark:text-white">Start a conversation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Send a message to begin chatting. Your conversation will appear here.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced scroll to bottom button */}
      {!shouldAutoScroll && (
        <div className="absolute bottom-6 right-4 sm:right-6 z-20">
          <button
            onClick={scrollToBottom}
            className="bg-white/90 dark:bg-black/90 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-full p-4 shadow-2xl border border-gray-200 dark:border-gray-800 transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-sm group"
            title="Scroll to bottom"
          >
            <ChevronDown className="w-5 h-5 group-hover:animate-bounce" />
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-out {
          0% {
            opacity: 0;
            transform: translateY(-10px) scale(0.8);
          }
          20%, 80% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-10px) scale(0.8);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-fade-in-out {
          animation: fade-in-out 2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default MessagesList;