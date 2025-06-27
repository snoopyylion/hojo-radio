// components/messaging/MessageInput.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, Smile, X, Reply } from 'lucide-react';
import { Message } from '@/types/messaging';
import { EmojiPicker } from './EmojiPicker';
import FileUpload from './FileUpload';
import Image from 'next/image';
import { useTypingIndicator } from '../../hooks/useTypingIndicator';

interface MessageMetadata {
  filename?: string;
  filesize?: string;
  filetype?: string;
  caption?: string;
}

interface MessageInputProps {
  onSendMessage: (
    content: string,
    type?: 'text' | 'image' | 'file',
    replyToId?: string,
    metadata?: MessageMetadata
  ) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  replyingTo?: Message;
  onCancelReply?: () => void;
  placeholder?: string;
  conversationId: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  disabled = false,
  replyingTo,
  onCancelReply,
  placeholder = "Type a message...",
  conversationId
}) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileUploadRef = useRef<HTMLDivElement>(null);

  const { startTyping, stopTyping } = useTypingIndicator({
    conversationId,
    isEnabled: !disabled
  });

  // Handle click outside emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (fileUploadRef.current && !fileUploadRef.current.contains(event.target as Node)) {
        setShowFileUpload(false);
      }
    };

    if (showEmojiPicker || showFileUpload) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker, showFileUpload]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping(false);
    }, 1000);
  }, [isTyping, onTyping]);

  // Handle blur event
  const handleBlur = useCallback(() => {
    stopTyping();
    setIsTyping(false);
    onTyping(false);
  }, [stopTyping, onTyping]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Handle typing indicators
    if (value.trim() && !disabled) {
      startTyping();
      handleTyping();
    } else {
      stopTyping();
    }

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if ((!message.trim() && attachedFiles.length === 0) || disabled) return;

    setIsLoading(true);
    stopTyping();

    try {
      if (message.trim()) {
        await onSendMessage(
          message.trim(),
          'text',
          replyingTo?.id,
          {}
        );
      }

      for (const file of attachedFiles) {
        const fileUrl = await uploadFile(file);
        if (fileUrl) {
          const messageType = file.type.startsWith('image/') ? 'image' : 'file';
          await onSendMessage(
            fileUrl,
            messageType,
            replyingTo?.id,
            {
              filename: file.name,
              filesize: formatFileSize(file.size),
              filetype: file.type
            }
          );
        }
      }

      setMessage('');
      setAttachedFiles([]);
      if (onCancelReply) onCancelReply();

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      setIsTyping(false);
      onTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newMessage);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setMessage(prev => prev + emoji);
    }
    
    // Auto-resize after emoji
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    }, 0);
  };

  // Handle file attachment
  const handleFileSelect = (files: File[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
    setShowFileUpload(false);
  };

  // Remove attached file
  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload file (placeholder)
  const uploadFile = async (file: File): Promise<string | null> => {
    return URL.createObjectURL(file);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canSend = (message.trim().length > 0 || attachedFiles.length > 0) && !disabled;

  return (
    <div className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 p-4 relative z-10">
      {/* Reply context */}
      {replyingTo && (
        <div className="mb-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-start justify-between border border-gray-200 dark:border-gray-600 shadow-sm">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Reply className="w-4 h-4 text-[#EF3866]" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Replying to {replyingTo.sender?.firstName || 'Unknown'}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {replyingTo.content}
            </p>
          </div>
          {onCancelReply && (
            <button
              onClick={onCancelReply}
              className="ml-3 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-all duration-200 hover:scale-110"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
      )}

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-3 border border-blue-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              {file.type.startsWith('image/') ? (
                <div className="flex-shrink-0">
                  <Image
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    width={40}
                    height={40}
                    className="rounded-xl object-cover shadow-sm"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white text-lg">📄</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={() => removeAttachedFile(index)}
                className="flex-shrink-0 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition-all duration-200 hover:scale-110"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main input container - */}
      <div className="flex items-end space-x-3 relative">
        {/* File attachment button */}
        <div className="relative flex-shrink-0" ref={fileUploadRef}>
          <button
            onClick={() => setShowFileUpload(!showFileUpload)}
            className={`
              w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 shadow-sm
              ${showFileUpload 
                ? 'bg-[#EF3866] text-white shadow-lg' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-[#EF3866]'
              }
            `}
            disabled={disabled}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {showFileUpload && (
            <div className="absolute bottom-full left-0 mb-3 z-50">
              <FileUpload
                onFileSelect={handleFileSelect}
                maxFiles={5}
                maxSize={10 * 1024 * 1024}
                accept="image/*,.pdf,.doc,.docx,.txt"
                onClose={() => setShowFileUpload(false)}
              />
            </div>
          )}
        </div>

        {/* Text input container */}
        <div className="flex-1 relative">
          <div className="relative bg-gray-100 dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-[#EF3866]/20 focus-within:border-[#EF3866] overflow-hidden">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}          
              onBlur={handleBlur}
              placeholder={placeholder}
              disabled={disabled || isLoading}
              rows={1}
              className="w-full px-6 py-4 pr-14 bg-transparent resize-none text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
              style={{ minHeight: '52px', lineHeight: '1.5' }}
            />
            
            {/* Emoji button inside input */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`
                absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110
                ${showEmojiPicker 
                  ? 'bg-[#EF3866] text-white shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-[#EF3866]'
                }
              `}
              disabled={disabled}
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Send button */}
        <div className="flex-shrink-0">
          <button
            onClick={handleSendMessage}
            disabled={!canSend || isLoading}
            className={`
              w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 transform shadow-sm
              ${canSend && !isLoading
                ? 'bg-gradient-to-r from-[#EF3866] to-[#d8325b] text-white hover:scale-105 hover:shadow-lg active:scale-95' 
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <Send className="w-5 h-5 ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-full right-4 mb-3 z-50" ref={emojiPickerRef}>
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}
    </div>
  );
};

export default MessageInput;