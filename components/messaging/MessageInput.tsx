// components/messaging/MessageInput.tsx
import React, { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Image, Smile, X, Reply } from 'lucide-react';
import { Message } from '@/types/messaging';
import { EmojiPicker } from './EmojiPicker';
import FileUpload from './FileUpload';

interface MessageInputProps {
  onSendMessage: (content: string, type?: 'text' | 'image' | 'file', replyToId?: string, metadata?: Record<string, any>) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  replyingTo?: Message;
  onCancelReply?: () => void;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  disabled = false,
  replyingTo,
  onCancelReply,
  placeholder = "Type a message..."
}) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
    handleTyping();
  };

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if ((!message.trim() && attachedFiles.length === 0) || disabled) return;

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
    adjustTextareaHeight();
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
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-start justify-between border border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
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
              className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
      )}

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-2 border border-gray-200 dark:border-gray-700"
            >
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-8 h-8 rounded object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center">
                  📄
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={() => removeAttachedFile(index)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
            onClick={() => setShowFileUpload(!showFileUpload)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-[#EF3866] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            disabled={disabled}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {showFileUpload && (
            <div className="absolute bottom-full left-0 mb-2 z-50">
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

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-full resize-none 
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-white 
                       focus:outline-none focus:ring-2 focus:ring-[#EF3866] focus:border-transparent
                       placeholder:text-gray-400 dark:placeholder:text-gray-500 
                       max-h-28 overflow-y-auto transition-colors"
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 
                       text-gray-500 dark:text-gray-400 hover:text-[#EF3866] 
                       hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            disabled={disabled}
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Send button */}
        <button
          onClick={handleSendMessage}
          disabled={!canSend}
          className={`p-2 rounded-full transition-colors shadow-sm ${
            canSend
              ? 'bg-[#EF3866] text-white hover:bg-[#d8325b] shadow-md hover:shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-full right-4 mb-2 z-50">
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