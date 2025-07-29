'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Smile, 
  Reply,
  FileText,
  Video,
  Music,
  X,
  Plus,
  Mic,
  Camera
} from 'lucide-react';

interface Message {
  id: string;
  sender?: {
    firstName?: string;
    username?: string;
  };
  content: string;
}

interface MessageInputProps {
  onSendMessage: (content: string, type?: string, replyToId?: string, metadata?: Record<string, unknown>) => Promise<void>;
  onTypingChange: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

// Quick emoji suggestions for smart input
const QUICK_EMOJIS = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '😎', '🤔', '😢', '😡', '👏', '🙏', '💯', '✨', '🌟', '💪'];

// Smart text suggestions/shortcuts
const TEXT_SHORTCUTS = {
  ':)': '😊',
  ':(': '😢',
  ':D': '😄',
  ':|': '😐',
  ':P': '😛',
  '<3': '❤️',
  '</3': '💔',
  ':fire:': '🔥',
  ':100:': '💯',
  ':clap:': '👏',
  ':heart:': '❤️',
  ':thumbsup:': '👍',
  ':thumbsdown:': '👎'
};

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTypingChange,
  disabled = false,
  placeholder = "Type a message...",
  replyingTo,
  onCancelReply
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Smart suggestions based on input
  const smartSuggestions = useMemo(() => {
    if (!message.trim()) return [];
    
    const words = message.toLowerCase().split(' ');
    const lastWord = words[words.length - 1];
    
    // Emoji suggestions
    const emojiSuggestions = QUICK_EMOJIS.filter((emoji, index) => 
      index < 4 // Show only first 4 for space
    );
    
    // Quick responses
    const quickResponses = [];
    if (lastWord.includes('hello') || lastWord.includes('hi')) {
      quickResponses.push('Hello! 👋', 'Hey there! 😊');
    }
    if (lastWord.includes('thank')) {
      quickResponses.push('You\'re welcome! 😊', 'No problem! 👍');
    }
    if (lastWord.includes('how')) {
      quickResponses.push('I\'m doing great!', 'All good here! 👍');
    }
    
    return [...quickResponses.slice(0, 2), ...emojiSuggestions];
  }, [message]);

  // Auto-resize textarea with smooth animation
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  // Optimized typing indicators with debouncing
  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      onTypingChange(true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTypingChange(false);
    }, 1500);
  }, [isTyping, onTypingChange]);

  // Smart text processing with shortcuts
  const processSmartText = useCallback((text: string): string => {
    let processedText = text;
    
    // Replace text shortcuts with emojis
    Object.entries(TEXT_SHORTCUTS).forEach(([shortcut, emoji]) => {
      // Escape special regex characters properly
      const escapedShortcut = shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      processedText = processedText.replace(new RegExp(escapedShortcut, 'g'), emoji);
    });
    
    return processedText;
  }, []);

  // Enhanced input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const processedValue = processSmartText(value);
    
    setMessage(processedValue);

    // Handle typing indicators
    if (processedValue.trim() && !disabled) {
      startTyping();
    }

    // Show smart suggestions
    setShowSmartSuggestions(processedValue.trim().length > 0);
    setSuggestionIndex(-1);

    adjustTextareaHeight();
  }, [processSmartText, disabled, startTyping, adjustTextareaHeight]);

  // Enhanced keyboard handling
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (suggestionIndex >= 0 && smartSuggestions[suggestionIndex]) {
        applySuggestion(smartSuggestions[suggestionIndex]);
      } else {
        handleSendMessage();
      }
    } else if (e.key === 'ArrowUp' && showSmartSuggestions) {
      e.preventDefault();
      setSuggestionIndex(prev => 
        prev <= 0 ? smartSuggestions.length - 1 : prev - 1
      );
    } else if (e.key === 'ArrowDown' && showSmartSuggestions) {
      e.preventDefault();
      setSuggestionIndex(prev => 
        prev >= smartSuggestions.length - 1 ? 0 : prev + 1
      );
    } else if (e.key === 'Escape') {
      setShowSmartSuggestions(false);
      setShowEmojiPicker(false);
      setShowAttachments(false);
      setSuggestionIndex(-1);
    }
  }, [suggestionIndex, smartSuggestions, showSmartSuggestions]);

  // Apply smart suggestion
  const applySuggestion = useCallback((suggestion: string) => {
    if (QUICK_EMOJIS.includes(suggestion)) {
      setMessage(prev => prev + suggestion);
    } else {
      setMessage(suggestion);
    }
    setShowSmartSuggestions(false);
    setSuggestionIndex(-1);
    textareaRef.current?.focus();
  }, []);

  // Optimized file handling with better validation
  const handleFileSelect = useCallback((files: FileList | null, type: 'file' | 'image' = 'file') => {
    if (!files) return;

    const newFiles = Array.from(files);
    const maxSize = type === 'image' ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB for images, 10MB for files
    
    const validFiles = newFiles.filter(file => {
      if (file.size > maxSize) {
        // Use toast instead of alert for better UX
        console.warn(`File ${file.name} is too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`);
        return false;
      }
      
      if (type === 'image' && !file.type.startsWith('image/')) {
        console.warn(`${file.name} is not an image file.`);
        return false;
      }
      
      return true;
    });

    setAttachedFiles(prev => [...prev, ...validFiles]);
    setShowAttachments(false);
  }, []);

  // Optimized file upload with retry logic
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('/api/messages/upload-file', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        return result.url;

      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Upload timed out. Please try again.');
        }
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt - 1), 5000)));
        }
      }
    }

    throw new Error(`Upload failed after ${maxRetries} attempts. ${lastError?.message || 'Please try again later.'}`);
  }, []);

  // Enhanced send message handler
  const handleSendMessage = useCallback(async () => {
    if ((!message.trim() && attachedFiles.length === 0) || disabled || isLoading) return;

    setIsLoading(true);
    
    // Clear typing indicator immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    onTypingChange(false);

    try {
      // Send text message
      if (message.trim()) {
        await onSendMessage(
          message.trim(),
          'text',
          replyingTo?.id,
          {}
        );
      }

      // Send files concurrently for better performance
      if (attachedFiles.length > 0) {
        const uploadPromises = attachedFiles.map(async (file) => {
          try {
            const fileUrl = await uploadFile(file);
            const messageType = file.type.startsWith('image/') ? 'image' : 'file';
            
            return onSendMessage(
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
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            throw error;
          }
        });

        await Promise.allSettled(uploadPromises);
      }

      // Reset state
      setMessage('');
      setAttachedFiles([]);
      setShowSmartSuggestions(false);
      if (onCancelReply) onCancelReply();
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [message, attachedFiles, disabled, isLoading, onSendMessage, replyingTo, onCancelReply, uploadFile, onTypingChange]);

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Get file icon
  const getFileIcon = useCallback((file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (file.type.startsWith('audio/')) return <Music className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  }, []);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
        setShowAttachments(false);
        setShowSmartSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative border-t border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-black/80 backdrop-blur-xl"
    >
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-50/50 via-transparent to-transparent dark:from-gray-950/50 pointer-events-none"></div>
      
      <div className="relative z-10 p-4 sm:p-6">
        {/* Reply preview */}
        {replyingTo && (
          <div className="mb-4 p-4 bg-white/60 dark:bg-black/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-1 h-8 bg-[#EF3866] rounded-full"></div>
                <div>
                  <div className="flex items-center space-x-2">
                    <Reply className="w-4 h-4 text-[#EF3866]" />
                    <span className="text-sm font-semibold text-[#EF3866]">
                      Replying to {replyingTo.sender?.firstName || replyingTo.sender?.username || 'Unknown'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 truncate">
                    {replyingTo.content}
                  </p>
                </div>
              </div>
              <button
                onClick={onCancelReply}
                className="p-2 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <X className="w-4 h-4 text-[#EF3866]" />
              </button>
            </div>
          </div>
        )}

        {/* Smart suggestions */}
        {showSmartSuggestions && smartSuggestions.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {smartSuggestions.map((suggestion, index) => (
              <button
                key={suggestion + index}
                onClick={() => applySuggestion(suggestion)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                  index === suggestionIndex
                    ? 'bg-[#EF3866] text-white shadow-lg'
                    : 'bg-white/60 dark:bg-black/60 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                } backdrop-blur-sm`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-4 space-y-2">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-white/60 dark:bg-black/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm"
              >
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  {getFileIcon(file)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                  className="p-2 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main input area */}
        <div className="flex items-end space-x-3">
          {/* Attachment button */}
          <div className="relative">
            <button
              onClick={() => setShowAttachments(!showAttachments)}
              disabled={disabled}
              className="p-3 text-gray-500 dark:text-gray-400 hover:text-[#EF3866] dark:hover:text-[#EF3866] hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-2xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 backdrop-blur-sm"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Attachment menu */}
            {showAttachments && (
              <div className="absolute bottom-full left-0 mb-2 bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 p-2 min-w-[180px] z-[9999]">
                <button
                  onClick={() => {
                    imageInputRef.current?.click();
                    setShowAttachments(false);
                  }}
                  className="flex items-center space-x-3 w-full px-4 py-3 text-left text-sm hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
                >
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="font-medium">Photo</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachments(false);
                  }}
                  className="flex items-center space-x-3 w-full px-4 py-3 text-left text-sm hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
                >
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="font-medium">Document</span>
                </button>
                <button
                  onClick={() => {
                    cameraInputRef.current?.click();
                    setShowAttachments(false);
                  }}
                  className="flex items-center space-x-3 w-full px-4 py-3 text-left text-sm hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
                >
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Camera className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="font-medium">Camera</span>
                </button>
              </div>
            )}
          </div>

          {/* Text input */}
          <div className="flex-1 relative">
            <div className="relative bg-white/60 dark:bg-black/60 backdrop-blur-sm rounded-3xl border border-gray-200/50 dark:border-gray-800/50 shadow-lg hover:shadow-xl transition-all duration-300 focus-within:border-[#EF3866]/50 focus-within:shadow-xl">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full resize-none bg-transparent rounded-3xl px-6 py-4 pr-12 focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
                rows={1}
                maxLength={1000}
              />
              
              {/* Emoji button inside input */}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={disabled}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 dark:text-gray-400 hover:text-[#EF3866] dark:hover:text-[#EF3866] rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>

            {/* Character count */}
            {message.length > 800 && (
              <div className="absolute -bottom-6 right-0 text-xs text-gray-500 dark:text-gray-400">
                {message.length}/1000
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={disabled || isLoading || (!message.trim() && attachedFiles.length === 0)}
            className="p-4 bg-gradient-to-r from-[#EF3866] to-[#EF3866]/80 hover:from-[#EF3866]/90 hover:to-[#EF3866]/70 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 text-white rounded-2xl transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg hover:shadow-xl backdrop-blur-sm"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-full right-0 mb-4 bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 p-4 z-[9999] min-w-[280px]">
            <div className="grid grid-cols-8 gap-2">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setMessage(prev => prev + emoji);
                    setShowEmojiPicker(false);
                    textareaRef.current?.focus();
                  }}
                  className="p-3 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl text-xl transition-all duration-200 hover:scale-110 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e.target.files, 'file')}
          className="hidden"
          accept="*/*"
        />
        <input
          ref={imageInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e.target.files, 'image')}
          className="hidden"
          accept="image/*"
        />
        <input
          ref={cameraInputRef}
          type="file"
          capture="environment"
          onChange={(e) => handleFileSelect(e.target.files, 'image')}
          className="hidden"
          accept="image/*"
        />
      </div>
    </div>
  );
};

export default MessageInput;