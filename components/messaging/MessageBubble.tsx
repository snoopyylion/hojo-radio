'use client';

import React, { useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  MoreVertical, 
  Reply, 
  Smile, 
  Image as ImageIcon,
  FileText,
  Download,
  Play,
  Trash2,
} from 'lucide-react';
import { Message } from '@/types/messaging';
import { useAuth } from '@clerk/nextjs';
import Image from 'next/image';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onImageClick: (imageUrl: string) => void;
  onDelete?: (messageId: string) => void;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🙏', '🔥', '💯'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  onReply,
  onReact,
  onImageClick,
  onDelete = () => {}
}) => {
  const { userId } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isImage = message.message_type === 'image';
  const isFile = message.message_type === 'file';
  const isAudio = message.metadata?.type === 'audio';
  const isVideo = message.metadata?.type === 'video';

  const handleReaction = useCallback((emoji: string) => {
    onReact(message.id, emoji);
    setShowReactions(false);
  }, [message.id, onReact]);

  const handleReply = useCallback(() => {
    onReply(message);
    setShowMenu(false);
  }, [message, onReply]);

  const handleImageClick = useCallback(() => {
    if (isImage && message.content) {
      onImageClick(message.content);
    }
  }, [isImage, message.content, onImageClick]);

  const handleImageLoad = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsImageLoading(false);
    setImageError(true);
  }, []);

  const getFileIcon = () => {
    if (isAudio) return <Play className="w-4 h-4" />;
    if (isVideo) return <Play className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMessageContent = () => {
    if (isImage) {
      return (
        <div className="relative group">
          <div className="relative overflow-hidden rounded-lg">
            {isImageLoading && (
              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
            {imageError ? (
              <div className="w-64 h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Image failed to load</p>
                </div>
              </div>
            ) : (
              <Image
                src={message.content}
                alt="Shared image"
                width={256}
                height={192}
                className="max-w-64 max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onLoad={handleImageLoad}
                onError={handleImageError}
                onClick={handleImageClick}
                onLoadStart={() => setIsImageLoading(true)}
              />
            )}
          </div>
          {message.metadata?.caption && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {message.metadata.caption}
            </p>
          )}
        </div>
      );
    }

    if (isFile) {
      return (
        <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="flex-shrink-0">
            {getFileIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {message.metadata?.filename || 'File'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {message.metadata?.filesize && getFileSize(message.metadata.filesize)}
            </p>
          </div>
          <button className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
            <Download className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {message.content}
      </p>
    );
  };

  const renderReactions = () => {
    if (!message.reactions || message.reactions.length === 0) return null;

    const reactionGroups = message.reactions.reduce((acc, reaction) => {
      acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {Object.entries(reactionGroups).map(([emoji, count]) => (
          <div
            key={emoji}
            className={`px-2 py-1 rounded-full text-xs flex items-center space-x-1 ${
              message.reactions?.some(r => r.user_id === userId && r.emoji === emoji)
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            <span>{emoji}</span>
            <span>{count}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div className={`relative max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        {/* Reply preview */}
        {message.reply_to && (
          <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border-l-4 border-[#EF3866]">
            <p className="text-xs text-[#EF3866] font-medium mb-1">
              Replying to {message.reply_to.sender?.firstName || message.reply_to.sender?.username || 'Unknown'}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {message.reply_to.content}
            </p>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`relative p-3 rounded-2xl ${
            isOwnMessage
              ? 'bg-blue-500 text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'
          }`}
        >
          {/* Sender name for group chats */}
          {!isOwnMessage && message.sender && (
            <p className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
              {message.sender.firstName || message.sender.username || 'Unknown'}
            </p>
          )}

          {renderMessageContent()}

          {/* Timestamp */}
          <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            {message.edited_at && ' (edited)'}
          </div>

          {/* Reactions */}
          {renderReactions()}

          {/* Message actions menu */}
          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 min-w-32">
                  <button
                    onClick={handleReply}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Reply className="w-4 h-4" />
                    <span>Reply</span>
                  </button>
                  <button
                    onClick={() => setShowReactions(!showReactions)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Smile className="w-4 h-4" />
                    <span>React</span>
                  </button>
                  {isOwnMessage && (
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this message?')) onDelete(message.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-red-100 dark:hover:bg-red-900/20 flex items-center space-x-2 text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reaction picker */}
          {showReactions && (
            <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-10">
              <div className="flex space-x-1">
                {EMOJI_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-lg transition-transform hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};