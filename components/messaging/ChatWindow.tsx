// components/messaging/ChatWindow.tsx
'use client';

import React, { useState } from 'react';
import {
  Phone,
  Video,
  Info,
  MoreHorizontal,
  ArrowLeft,
  Search,
  UserPlus,
  VolumeX,
  Archive
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Conversation } from '@/types/messaging';
import Image from 'next/image';

interface ChatWindowProps {
  conversation: Conversation | null;
  currentUserId: string;
  onlineUsers: Set<string>;
  children: React.ReactNode;
  onShowInfo?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  currentUserId,
  onlineUsers,
  children,
  onShowInfo
}) => {
  const router = useRouter();
  const [showOptions, setShowOptions] = useState(false);

  const getConversationTitle = () => {
    if (!conversation) return 'Select a conversation';

    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }

    // For direct messages, show the other participant's name
    const otherParticipant = conversation.participants?.find(
      (p) => p.user_id !== currentUserId
    );

    if (otherParticipant?.user) {
      const fullName = `${otherParticipant.user.firstName || ''} ${otherParticipant.user.lastName || ''}`.trim();
      return fullName || otherParticipant.user.username || 'Unknown User';
    }

    return 'Direct Message';
  };

  const getConversationSubtitle = () => {
    if (!conversation) return '';

    if (conversation.type === 'group') {
      const participantCount = conversation.participants?.length || 0;
      const onlineCount = conversation.participants?.filter(p =>
        onlineUsers.has(p.user_id)
      ).length || 0;
      return `${participantCount} members, ${onlineCount} online`;
    }

    const otherParticipant = conversation.participants?.find(
      (p) => p.user_id !== currentUserId
    );

    if (otherParticipant) {
      const isOnline = onlineUsers.has(otherParticipant.user_id);
      return isOnline ? 'Active now' : 'Last seen recently';
    }

    return '';
  };

  const getConversationAvatar = () => {
    if (!conversation) return null;

    if (conversation.type === 'group') {
      // For groups, show group avatar or first few participants
      return (
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {conversation.name?.charAt(0).toUpperCase() || 'G'}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
        </div>
      );
    }

    // For direct messages, show the other participant's avatar
    const otherParticipant = conversation.participants?.find(
      (p) => p.user_id !== currentUserId
    );

    if (otherParticipant?.user) {
      const isOnline = onlineUsers.has(otherParticipant.user_id);
      return (
        <div className="relative">
          <Image
            src={otherParticipant.user.imageUrl || '/default-avatar.svg'}
            alt={otherParticipant.user.firstName || 'User'}
            width={40}
            height={40}
            className="rounded-full object-cover ring-2 ring-white dark:ring-gray-800"
          />

          {isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
          )}
        </div>
      );
    }

    return (
      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
        <span className="text-gray-600 text-sm">?</span>
      </div>
    );
  };

  const handleAction = (action: string) => {
    console.log(`Action: ${action}`);
    setShowOptions(false);
    // Implement action handlers
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
            <svg className="w-12 h-12 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Welcome to Messages
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm">
            Select a conversation from the sidebar to start messaging, or create a new conversation to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
      {/* Chat Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center space-x-3">
          {/* Back button for mobile */}
          <button
            onClick={() => router.push('/messages')}
            className="lg:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>

          {/* Avatar */}
          {getConversationAvatar()}

          {/* Conversation Info */}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
              {getConversationTitle()}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-none mt-0.5">
              {getConversationSubtitle()}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {conversation.type === 'direct' && (
            <>
              <button
                onClick={() => handleAction('call')}
                className="p-2.5 rounded-full text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                title="Voice call"
              >
                <Phone size={20} />
              </button>

              <button
                onClick={() => handleAction('video')}
                className="p-2.5 rounded-full text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200"
                title="Video call"
              >
                <Video size={20} />
              </button>
            </>
          )}

          <button
            onClick={onShowInfo}
            className="p-2.5 rounded-full text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
            title="Conversation info"
          >
            <Info size={20} />
          </button>

          {/* More options */}
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2.5 rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              title="More options"
            >
              <MoreHorizontal size={20} />
            </button>

            {showOptions && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                <button
                  onClick={() => handleAction('search')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3"
                >
                  <Search size={16} />
                  <span>Search in conversation</span>
                </button>

                <button
                  onClick={() => handleAction('addPeople')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3"
                >
                  <UserPlus size={16} />
                  <span>Add people</span>
                </button>

                <button
                  onClick={() => handleAction('mute')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3"
                >
                  <VolumeX size={16} />
                  <span>Mute notifications</span>
                </button>

                <button
                  onClick={() => handleAction('archive')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3"
                >
                  <Archive size={16} />
                  <span>Archive conversation</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
};