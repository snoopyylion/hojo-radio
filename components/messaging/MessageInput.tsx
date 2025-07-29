'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Smile, 
  Reply,
  FileText,
  Video,
  Music,
  X
} from 'lucide-react';
import { Message } from '@/types/messaging';

interface MessageInputProps {
  onSendMessage: (content: string, type?: string, replyToId?: string, metadata?: Record<string, unknown>) => Promise<void>;
  onTypingChange: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTypingChange,
  disabled = false,
  placeholder = "Type a message...",
  replyingTo,
  onCancelReply
}) => {
  // User authentication conupdatedtext available if needed
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, []);

  // Handle typing indicators
  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      onTypingChange(true);
    }
  }, [isTyping, onTypingChange]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTypingChange(false);
    }, 1000);
  }, [onTypingChange]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Handle typing indicators
    if (value.trim() && !disabled) {
      startTyping();
    } else {
      stopTyping();
    }

    adjustTextareaHeight();
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    setAttachedFiles(prev => [...prev, ...validFiles]);
  }, []);

  // Handle image selection
  const handleImageSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    const validFiles = imageFiles.filter(file => {
      const maxSize = 5 * 1024 * 1024; // 5MB for images
      if (file.size > maxSize) {
        alert(`Image ${file.name} is too large. Maximum size is 5MB.`);
        return false;
      }
      return true;
    });

    setAttachedFiles(prev => [...prev, ...validFiles]);
  }, []);

  // Upload file to storage with improved error handling
  const uploadFile = async (file: File): Promise<string> => {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Validate file before upload
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          throw new Error('File size exceeds 5MB limit');
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error('Only image files are supported');
        }

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);
        
        // Upload to your API endpoint with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch('/api/messages/upload-file', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `Upload failed: ${response.statusText}`;
          
          // Don't retry for client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(errorMessage);
          }
          
          // Retry for server errors (5xx)
          throw new Error(`Server error (attempt ${attempt}/${maxRetries}): ${errorMessage}`);
        }

        const result = await response.json();
        
        if (!result.url) {
          throw new Error('No URL returned from upload');
        }

        return result.url;

      } catch (error) {
        lastError = error as Error;
        console.error(`Upload attempt ${attempt} failed:`, error);

        // Don't retry for certain errors
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error('Upload timed out. Please try again.');
          }
          
          if (error.message.includes('File size exceeds') || 
              error.message.includes('Only image files') ||
              error.message.includes('Unauthorized') ||
              error.message.includes('No file provided')) {
            throw error; // Don't retry client errors
          }
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw new Error(`Upload failed after ${maxRetries} attempts. ${lastError?.message || 'Please try again later.'}`);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file type icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (file.type.startsWith('audio/')) return <Music className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  // Remove attached file
  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle send message with improved error handling
  const handleSendMessage = async () => {
    if ((!message.trim() && attachedFiles.length === 0) || disabled || isLoading) return;

    setIsLoading(true);
    stopTyping();

    const errors: string[] = [];
    const successfulUploads: string[] = [];

    try {
      // Send text message if any
      if (message.trim()) {
        try {
          await onSendMessage(
            message.trim(),
            'text',
            replyingTo?.id,
            {}
          );
        } catch (error) {
          errors.push('Failed to send text message');
          console.error('Text message error:', error);
        }
      }

      // Send attached files with individual error handling
      for (const file of attachedFiles) {
        try {
          const fileUrl = await uploadFile(file);
          const messageType = file.type.startsWith('image/') ? 'image' : 'file';
          
          await onSendMessage(
            fileUrl,
            messageType,
            replyingTo?.id,
            {
              filename: file.name,
              filesize: file.size,
              filetype: file.type,
              caption: message.trim() || undefined
            }
          );
          
          successfulUploads.push(file.name);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to upload ${file.name}: ${errorMessage}`);
          console.error(`File upload error for ${file.name}:`, error);
        }
      }

      // Show success/error feedback
      if (successfulUploads.length > 0) {
        const successMessage = successfulUploads.length === 1 
          ? `Successfully sent ${successfulUploads[0]}`
          : `Successfully sent ${successfulUploads.length} files`;
        
        // You could replace this with a toast notification
        console.log(successMessage);
      }

      if (errors.length > 0) {
        const errorMessage = errors.length === 1 
          ? errors[0]
          : `Some items failed to send:\n${errors.join('\n')}`;
        
        // Show error in a more user-friendly way
        alert(errorMessage);
      }

      // Reset state only if we have some success or no files were attempted
      if (successfulUploads.length > 0 || attachedFiles.length === 0) {
        setMessage('');
        setAttachedFiles([]);
        if (onCancelReply) onCancelReply();
        
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }

        setIsTyping(false);
        onTypingChange(false);
      }

    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      {/* Reply preview */}
      {replyingTo && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-[#EF3866]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Reply className="w-4 h-4 text-[#EF3866]" />
              <span className="text-sm font-medium text-[#EF3866]">
                Replying to {replyingTo.sender?.firstName || replyingTo.sender?.username || 'Unknown'}
              </span>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4 text-[#EF3866]" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 truncate">
            {replyingTo.content}
          </p>
        </div>
      )}

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              {getFileIcon(file)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end space-x-2">
        {/* File attachment button */}
        <div className="relative">
          <button
            onClick={() => setShowFilePicker(!showFilePicker)}
            disabled={disabled}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {showFilePicker && (
            <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-10">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Photo</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <FileText className="w-4 h-4" />
                <span>Document</span>
              </button>
            </div>
          )}
        </div>

        {/* Emoji button */}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={disabled}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={startTyping}
            onBlur={stopTyping}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
            rows={1}
            maxLength={1000}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSendMessage}
          disabled={disabled || isLoading || (!message.trim() && attachedFiles.length === 0)}
          className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        accept="*/*"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        onChange={(e) => handleImageSelect(e.target.files)}
        className="hidden"
        accept="image/*"
      />

      {/* Emoji picker (placeholder) */}
      {showEmojiPicker && (
        <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-10">
          <div className="grid grid-cols-8 gap-1">
            {['😀', '😂', '❤️', '👍', '🎉', '🔥', '😎', '🤔', '😢', '😡', '👏', '🙏', '💯', '✨', '🌟', '💪'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setMessage(prev => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageInput;