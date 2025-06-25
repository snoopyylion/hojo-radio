// components/messaging/MessageActions.tsx
import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Reply, Edit, Trash2, Copy, Forward, Pin } from 'lucide-react';
import { Message, User } from '@/types/messaging';

interface MessageActionsProps {
  message: Message;
  currentUser: User;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onForward: (message: Message) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canPin?: boolean;
}

export default function MessageActions({
  message,
  currentUser,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onForward,
  canEdit = true,
  canDelete = true,
  canPin = true
}: MessageActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isOwner = message.sender_id === currentUser.id;
  const canEditMessage = canEdit && isOwner && message.message_type === 'text';
  const canDeleteMessage = canDelete && (isOwner || currentUser.id === message.sender_id);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
    setIsOpen(false);
  };

  const handleEditCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const menuItems = [
    {
      icon: Reply,
      label: 'Reply',
      onClick: () => {
        onReply(message);
        setIsOpen(false);
      },
      show: true
    },
    {
      icon: Edit,
      label: 'Edit',
      onClick: () => {
        setIsEditing(true);
        setIsOpen(false);
      },
      show: canEditMessage
    },
    {
      icon: Copy,
      label: 'Copy',
      onClick: handleCopyMessage,
      show: message.message_type === 'text'
    },
    {
      icon: Forward,
      label: 'Forward',
      onClick: () => {
        onForward(message);
        setIsOpen(false);
      },
      show: true
    },
    {
      icon: Pin,
      label: 'Pin',
      onClick: () => {
        onPin(message.id);
        setIsOpen(false);
      },
      show: canPin
    },
    {
      icon: Trash2,
      label: 'Delete',
      onClick: () => {
        if (window.confirm('Are you sure you want to delete this message?')) {
          onDelete(message.id);
        }
        setIsOpen(false);
      },
      show: canDeleteMessage,
      danger: true
    }
  ].filter(item => item.show);

  if (isEditing) {
    return (
      <div className="mt-2">
        <form onSubmit={handleEditSubmit} className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={Math.min(editContent.split('\n').length + 1, 5)}
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={!editContent.trim()}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleEditCancel}
              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded-full transition-all duration-200"
        aria-label="Message actions"
      >
        <MoreHorizontal size={16} className="text-gray-500" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]"
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={item.onClick}
                className={`w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                  item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}