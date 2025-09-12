'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

import {
  Send,
  Image as ImageIcon,
  Smile,
  Reply,
  FileText,
  Video,
  Music,
  X,
  Plus,
  Camera
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
  const [attachmentMenuPosition, setAttachmentMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const attachmentButtonRef = useRef<HTMLButtonElement>(null);

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

  // Improved file handling with better validation and error handling
  const handleFileSelect = useCallback((files: FileList | null, type: 'file' | 'image' = 'file') => {
    if (!files || files.length === 0) {
      return;
    }

    const newFiles = Array.from(files);
    const maxSize = 5 * 1024 * 1024; // 5MB limit for all files

    const validFiles = newFiles.filter(file => {
      if (file.size > maxSize) {
        setUploadError(`File ${file.name} is too large. Maximum size is 5MB.`);
        setTimeout(() => setUploadError(null), 5000);
        return false;
      }

      if (type === 'image' && !file.type.startsWith('image/')) {
        setUploadError(`${file.name} is not an image file.`);
        setTimeout(() => setUploadError(null), 5000);
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...validFiles]);
      setUploadError(null);
    }

    // IMPORTANT: Reset input values to allow selecting the same file again
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';

    setShowAttachments(false);
    setAttachmentMenuPosition(null);
  }, []);

  // Improved file upload with better error handling and progress tracking
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const maxRetries = 3;
    let lastError: Error | null = null;

    // Add file to uploading set
    setUploadingFiles(prev => new Set(prev).add(file.name));

    try {
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
    } finally {
      // Remove file from uploading set
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.name);
        return newSet;
      });
    }
  }, []);

  // Enhanced send message handler
  const handleSendMessage = useCallback(async () => {
    if ((!message.trim() && attachedFiles.length === 0) || disabled || isLoading) return;

    setIsLoading(true);
    setUploadError(null);

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
            setUploadError(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
          }
        });

        const results = await Promise.allSettled(uploadPromises);

        // Check if any uploads failed
        const failedUploads = results.filter(result => result.status === 'rejected');
        if (failedUploads.length > 0) {
          // Don't clear the error here, let it be displayed
          return;
        }
      }

      // Reset state only if all uploads succeeded
      setMessage('');
      setAttachedFiles([]);
      setShowSmartSuggestions(false);
      setUploadError(null);
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

  // Improved attachment button click handler with better positioning
  const handleAttachmentClick = useCallback(() => {
    if (!attachmentButtonRef.current) return;

    if (showAttachments) {
      setShowAttachments(false);
      setAttachmentMenuPosition(null);
    } else {
      const rect = attachmentButtonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      // Calculate optimal position
      let top = rect.top - 200; // Default position above
      let left = rect.left;

      // Adjust if menu would go off-screen
      if (top < 10) {
        top = rect.bottom + 10; // Position below if not enough space above
      }

      if (left + 200 > viewportWidth) {
        left = viewportWidth - 220; // Adjust if would go off right edge
      }

      if (left < 10) {
        left = 10; // Ensure minimum left margin
      }

      setAttachmentMenuPosition({ top, left });
      setShowAttachments(true);
    }
  }, [showAttachments]);

  // Improved attachment menu component with better positioning
  const AttachmentMenu = () => {
    if (!showAttachments || !attachmentMenuPosition) return null;

    return createPortal(
      <div
        className="fixed bg-white/95 dark:bg-black/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 p-2 min-w-[160px] sm:min-w-[180px] max-w-[200px] z-[999999999]"
        style={{
          top: attachmentMenuPosition.top,
          left: attachmentMenuPosition.left,
        }}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Photo button clicked - attempting to trigger file input');
            if (imageInputRef.current) {
              console.log('Image input ref found, clicking...');
              imageInputRef.current.click();
            } else {
              console.log('Image input ref not found!');
            }
            setShowAttachments(false);
            setAttachmentMenuPosition(null);
          }}
          className="flex items-center space-x-3 w-full px-4 py-3 text-left text-sm hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
        >
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-medium">Photo</span>
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Document button clicked - attempting to trigger file input');
            if (fileInputRef.current) {
              console.log('File input ref found, clicking...');
              fileInputRef.current.click();
            } else {
              console.log('File input ref not found!');
            }
            setShowAttachments(false);
            setAttachmentMenuPosition(null);
          }}
          className="flex items-center space-x-3 w-full px-4 py-3 text-left text-sm hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
        >
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <span className="font-medium">Document</span>
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Camera button clicked - attempting to trigger file input');
            if (cameraInputRef.current) {
              console.log('Camera input ref found, clicking...');
              cameraInputRef.current.click();
            } else {
              console.log('Camera input ref not found!');
            }
            setShowAttachments(false);
            setAttachmentMenuPosition(null);
          }}
          className="flex items-center space-x-3 w-full px-4 py-3 text-left text-sm hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
        >
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Camera className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="font-medium">Camera</span>
        </button>
      </div>,
      document.body
    );
  };

  // Improved click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Don't close if clicking on file inputs or attachment menu
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        !fileInputRef.current?.contains(target) &&
        !imageInputRef.current?.contains(target) &&
        !cameraInputRef.current?.contains(target)
      ) {
        // Only close menus if we're not in the middle of a file selection
        setTimeout(() => {
          setShowEmojiPicker(false);
          setShowAttachments(false);
          setShowSmartSuggestions(false);
          setAttachmentMenuPosition(null);
        }, 100);
      }
    };
  
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowEmojiPicker(false);
        setShowAttachments(false);
        setShowSmartSuggestions(false);
        setAttachmentMenuPosition(null);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
  
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 p-2 sm:p-2 max-h-[20vh] overflow-hidden">
      <div ref={containerRef} className="space-y-2">
        {/* Upload error message */}
        {uploadError && (
          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <span className="text-sm text-red-600 dark:text-red-400">{uploadError}</span>
            <button
              onClick={() => setUploadError(null)}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-800/30 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
          </div>
        )}

        {/* Reply preview */}
        {replyingTo && (
          <div className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="p-2 bg-[#EF3866]/10 rounded-xl">
                <Reply className="w-4 h-4 text-[#EF3866]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
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
        )}

        {/* Smart suggestions */}
        {showSmartSuggestions && smartSuggestions.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {smartSuggestions.map((suggestion, index) => (
              <button
                key={suggestion + index}
                onClick={() => applySuggestion(suggestion)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${index === suggestionIndex
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
                    {uploadingFiles.has(file.name) && (
                      <span className="ml-2 text-blue-600 dark:text-blue-400">
                        • Uploading...
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                  className="p-2 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                  disabled={uploadingFiles.has(file.name)}
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
              ref={attachmentButtonRef}
              onClick={handleAttachmentClick}
              disabled={disabled}
              className="p-3 text-gray-500 dark:text-gray-400 hover:text-[#EF3866] dark:hover:text-[#EF3866] hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-2xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 backdrop-blur-sm"
            >
              <Plus className="w-5 h-5" />
            </button>

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

            {/* Emoji picker - Fixed positioning */}
            {showEmojiPicker && (
              <div className="fixed bottom-20 right-2 sm:right-4 bg-white/95 dark:bg-black/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 p-4 z-[999999999] min-w-[240px] sm:min-w-[280px] max-w-[320px]">
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
          </div>

          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={disabled || isLoading || (!message.trim() && attachedFiles.length === 0) || uploadingFiles.size > 0}
            className="p-4 bg-gradient-to-r from-[#EF3866] to-[#EF3866]/80 hover:from-[#EF3866]/90 hover:to-[#EF3866]/70 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 text-white rounded-2xl transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg hover:shadow-xl backdrop-blur-sm"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : uploadingFiles.size > 0 ? (
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
          onChange={(e) => {
            console.log('Document input onChange triggered', e.target.files);
            if (e.target.files && e.target.files.length > 0) {
              handleFileSelect(e.target.files, 'file');
            }
          }}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
        />
        <input
          ref={imageInputRef}
          type="file"
          multiple
          onChange={(e) => {
            console.log('Image input onChange triggered', e.target.files);
            if (e.target.files && e.target.files.length > 0) {
              handleFileSelect(e.target.files, 'image');
            }
          }}
          className="hidden"
          accept="image/*"
        />
        <input
          ref={cameraInputRef}
          type="file"
          capture="environment"
          onChange={(e) => {
            console.log('Camera input onChange triggered', e.target.files);
            if (e.target.files && e.target.files.length > 0) {
              handleFileSelect(e.target.files, 'image');
            }
          }}
          className="hidden"
          accept="image/*"
        />
      </div>

      {/* Portal-based attachment menu */}
      <AttachmentMenu />
    </div>
  );
};

export default MessageInput;