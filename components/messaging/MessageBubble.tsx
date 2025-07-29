'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Message } from '@/types/messaging';
import { MessageReactions } from './MessageReactions';
import { Reply, Heart, Smile, MoreHorizontal, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onReply?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string, message: Message) => void;
  onImageClick?: (imageUrl: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
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
  const bubbleRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Handle long press for mobile
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

  // Handle click for desktop
  const handleClick = () => {
    if (!isLongPressed) {
      setShowActions(!showActions);
    }
    setIsLongPressed(false);
  };

  // Close actions when clicking outside
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
  const hasReactions = message.reactions && Object.keys(message.reactions).length > 0;

  return (
    <div
      ref={bubbleRef}
      className={`group relative flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      {/* Message Container */}
      <div
        className={`relative max-w-[75%] sm:max-w-[65%] md:max-w-[60%] lg:max-w-[55%] ${
          isOwnMessage 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
        } rounded-2xl px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200`}
      >
        {/* Reply indicator */}
        {message.reply_to && (
          <div className={`mb-2 p-2 rounded-lg text-xs ${
            isOwnMessage 
              ? 'bg-blue-400/20 text-blue-100' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            <div className="flex items-center gap-1 mb-1">
              <Reply className="w-3 h-3" />
              <span className="font-medium">Replying to message</span>
            </div>
            <p className="truncate">{message.reply_to.content}</p>
          </div>
        )}

        {/* Message content */}
        <div className="space-y-2">
          {isImageMessage ? (
            <div 
              className="relative cursor-pointer group/image"
              onClick={() => onImageClick?.(message.content)}
            >
              <Image
                src={message.content}
                alt={message.metadata?.caption || 'Shared image'}
                width={300}
                height={300}
                className="rounded-lg max-w-full h-auto object-cover hover:opacity-90 transition-opacity"
              />
              <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-all duration-200 rounded-lg" />
              {message.metadata?.caption && (
                <p className="text-sm mt-2 opacity-90">{message.metadata.caption}</p>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
        </div>

        {/* Message metadata */}
        <div className={`flex items-center justify-between mt-2 text-xs ${
          isOwnMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
        }`}>
          <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
          
          {/* Quick action buttons - always visible on mobile */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {/* Quick React Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReact?.(message.id, '❤️');
              }}
              className={`p-1.5 rounded-full transition-all duration-200 ${
                isOwnMessage 
                  ? 'hover:bg-blue-400/30 text-blue-100' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
              title="React with heart"
            >
              <Heart className="w-3.5 h-3.5" />
            </button>

            {/* Quick Reply Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReply?.(message);
              }}
              className={`p-1.5 rounded-full transition-all duration-200 ${
                isOwnMessage 
                  ? 'hover:bg-blue-400/30 text-blue-100' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>

            {/* More Actions Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className={`p-1.5 rounded-full transition-all duration-200 ${
                isOwnMessage 
                  ? 'hover:bg-blue-400/30 text-blue-100' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
              title="More actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Reactions display */}
        {hasReactions && Array.isArray(message.reactions) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.reactions.map((reaction, idx) => (
              <div
                key={reaction.emoji + '-' + idx}
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isOwnMessage 
                    ? 'bg-blue-400/20 text-blue-100' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {reaction.emoji} {reaction.user_id ? 1 : ''}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Actions Menu */}
      {showActions && (
        <div
          className={`fixed z-30`}
          style={{
              top: bubbleRef.current && bubbleRef.current.getBoundingClientRect().top !== undefined
                ? Math.min(
                    bubbleRef.current.getBoundingClientRect().top + window.scrollY,
                    window.innerHeight - 220 // clamp to bottom
                  )
                : undefined,
              left: !isOwnMessage && bubbleRef.current
                ? Math.min(
                    bubbleRef.current.getBoundingClientRect().left + (bubbleRef.current.offsetWidth || 0) + 12,
                    window.innerWidth - 240 // clamp to right
                  )
                : undefined,
              right: isOwnMessage && bubbleRef.current
                ? Math.max(
                    window.innerWidth - (bubbleRef.current.getBoundingClientRect().right || 0) + 12,
                    12
                  )
                : undefined,
            minWidth: 200,
            maxWidth: 240,
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 min-w-[200px] max-w-[240px]">
            <div className="space-y-1">
              {/* React Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReactions(!showReactions);
                  setShowActions(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <Smile className="w-4 h-4" />
                <span>React</span>
              </button>
              {/* Reply Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReply?.(message);
                  setShowActions(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <Reply className="w-4 h-4" />
                <span>Reply</span>
              </button>
              {/* Copy Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(message.content);
                  setShowActions(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy</span>
              </button>
              {/* Delete Button (own messages only) */}
              {isOwnMessage && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this message?')) {
                      onDelete(message.id, message);
                    }
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Reactions Picker */}
      {showReactions && (
          <div className={`absolute top-0 z-20 ${
            isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'
          }`}>
            <MessageReactions
              onReact={(emoji) => {
                onReact?.(message.id, emoji);
                setShowReactions(false);
              }}
            />
          </div>
        )}
    </div>
  );
};