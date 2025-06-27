// components/messaging/ConversationHeader.tsx
'use client';

import { useState } from 'react';
import { Conversation } from '@/types/messaging';
import { useSidebar } from '@/components/messaging/MessagingLayout';
import {
  Menu,
  Settings,
  MoreVertical,
  Phone,
  Video,
  Users
} from 'lucide-react';

interface ConversationHeaderProps {
  conversation: Conversation;
  currentUserId: string;
  onlineUsers: Set<string>;
  onSettingsClick: () => void;
}

export const ConversationHeader = ({
  conversation,
  currentUserId,
  onlineUsers,
  onSettingsClick
}: ConversationHeaderProps) => {
  const [showCallMenu, setShowCallMenu] = useState(false);
  const { toggleSidebar } = useSidebar();

  const getConversationTitle = () => {
    if (!conversation) return 'Loading...';

    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }

    const otherParticipant = conversation.participants?.find(
      (p) => p.user_id !== currentUserId
    );

    if (otherParticipant?.user) {
      const fullName = `${otherParticipant.user.firstName || ''} ${otherParticipant.user.lastName || ''}`.trim();
      return fullName || otherParticipant.user.username || 'Unknown User';
    }

    return 'Direct Message';
  };

  const getOtherParticipant = () => {
    if (!conversation || conversation.type !== 'direct') return null;
    return conversation.participants?.find((p) => p.user_id !== currentUserId);
  };

  const otherParticipant = getOtherParticipant();
  const isOtherUserOnline = otherParticipant ? onlineUsers.has(otherParticipant.user_id) : false;

  return (
    <>
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Sidebar toggle button */}
            <button
              onClick={toggleSidebar}
              className="p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
              title="Toggle sidebar"
            >
              <Menu size={20} />
            </button>

            {/* Conversation avatar and info */}
            <div className="flex items-center space-x-3">
              {/* Avatar */}
              <div className="relative">
                {conversation.type === 'group' ? (
                  <div className="w-10 h-10 bg-gradient-to-br from-[#EF3866] to-[#EF3866]/80 rounded-full flex items-center justify-center shadow-md">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                ) : otherParticipant?.user ? (
                  <>
                    <img
                      src={otherParticipant.user.imageUrl || '/default-avatar.png'}
                      alt={getConversationTitle()}
                      className="w-10 h-10 rounded-full ring-2 ring-[#EF3866]/20 object-cover"
                    />
                    {isOtherUserOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-950 rounded-full"></div>
                    )}
                  </>
                ) : (
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                      {getConversationTitle().charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Title only (no status) */}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {getConversationTitle()}
                </h2>
              </div>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center space-x-2">
            {/* Settings button */}
            <button
              onClick={onSettingsClick}
              className="p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:text-[#EF3866] hover:bg-[#EF3866]/10 transition-all duration-200"
              title="Conversation settings"
            >
              <Settings size={18} />
            </button>

            {/* Dropdown menu for calls */}
            <div className="relative">
              <button
                onClick={() => setShowCallMenu(!showCallMenu)}
                className="p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                title="Call options"
              >
                <MoreVertical size={18} />
              </button>

              {/* Dropdown menu */}
              {showCallMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50">
                  <div className="p-2">
                    {conversation.type === 'direct' && (
                      <>
                        <button
                          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-[#EF3866] hover:bg-[#EF3866]/10 transition-all duration-200"
                          onClick={() => {
                            setShowCallMenu(false);
                            // Handle voice call
                            console.log('Starting voice call...');
                          }}
                        >
                          <Phone size={16} />
                          <span className="text-sm font-medium">Voice Call</span>
                        </button>
                        <button
                          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-[#EF3866] hover:bg-[#EF3866]/10 transition-all duration-200"
                          onClick={() => {
                            setShowCallMenu(false);
                            // Handle video call
                            console.log('Starting video call...');
                          }}
                        >
                          <Video size={16} />
                          <span className="text-sm font-medium">Video Call</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showCallMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowCallMenu(false)}
        />
      )}
    </>
  );
};