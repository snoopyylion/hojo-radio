// Updated ConversationHeader.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Conversation } from '@/types/messaging';
import { useSidebar } from '@/components/messaging/MessagingLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  Menu,
  Settings,
  MoreVertical,
  Phone,
  Video,
  Users,
  ChevronRight
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
  const router = useRouter();

  // Get the other participant for direct messages
  const otherParticipant = conversation.type === 'direct' 
    ? conversation.participants?.find(p => p.user_id !== currentUserId)
    : null;

  // Use the hook to get user profile data
  const { imageUrl, displayName } = useUserProfile(otherParticipant?.user_id || '');

  const getConversationTitle = () => {
    if (!conversation) return 'Loading...';

    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }

    // Use the displayName from the hook
    return displayName;
  };

  const getParticipantCount = () => {
    if (conversation.type === 'group') {
      return `${conversation.participants?.length || 0} members`;
    }
    return null;
  };

  const isOtherUserOnline = otherParticipant ? onlineUsers.has(otherParticipant.user_id) : false;

  const handleProfileClick = () => {
    if (conversation.type === 'direct' && otherParticipant?.user_id) {
      router.push(`/user/${otherParticipant.user_id}`);
    } else if (conversation.type === 'group') {
      onSettingsClick(); // Open group settings for group chats
    }
  };

  const isClickable = conversation.type === 'direct' || conversation.type === 'group';

  return (
    <>
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 shrink-0"
              title="Toggle sidebar"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                {conversation.type === 'group' ? (
                  <button
                    onClick={handleProfileClick}
                    className="relative focus:outline-none focus:ring-2 focus:ring-[#EF3866]/50 rounded-full transition-all duration-200 hover:scale-105"
                    title="View group settings"
                  >
                    <div className="w-11 h-11 bg-gradient-to-br from-[#EF3866] to-[#EF3866]/80 rounded-full flex items-center justify-center shadow-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={handleProfileClick}
                    className="relative focus:outline-none focus:ring-2 focus:ring-[#EF3866]/50 rounded-full transition-all duration-200 hover:scale-105"
                    title="View profile"
                  >
                    <img
                      src={imageUrl}
                      alt={getConversationTitle()}
                      className="w-11 h-11 rounded-full ring-2 ring-[#EF3866]/20 object-cover shadow-sm"
                    />
                    {isOtherUserOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-950 rounded-full shadow-sm"></div>
                    )}
                  </button>
                )}
              </div>
                  
              <div className="min-w-0 flex-1">
                <button
                  onClick={isClickable ? handleProfileClick : undefined}
                  className={`block w-full text-left ${
                    isClickable 
                      ? 'hover:text-[#EF3866] transition-colors duration-200 cursor-pointer' 
                      : 'cursor-default'
                  }`}
                  title={
                    conversation.type === 'direct' 
                      ? 'View profile' 
                      : conversation.type === 'group' 
                        ? 'View group settings' 
                        : ''
                  }
                >
                  <div className="flex items-center space-x-1">
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {getConversationTitle()}
                    </h1>
                    {isClickable && (
                      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                    )}
                  </div>
                  {conversation.type === 'group' && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {getParticipantCount()}
                    </p>
                  )}
                  {conversation.type === 'direct' && isOtherUserOnline && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Online
                    </p>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={onSettingsClick}
              className="p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:text-[#EF3866] hover:bg-[#EF3866]/10 transition-all duration-200"
              title="Conversation settings"
            >
              <Settings size={18} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowCallMenu(!showCallMenu)}
                className="p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                title="Call options"
              >
                <MoreVertical size={18} />
              </button>

              {showCallMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50">
                  <div className="p-2">
                    {conversation.type === 'direct' && (
                      <>
                        <button
                          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:text-[#EF3866] hover:bg-[#EF3866]/10 transition-all duration-200"
                          onClick={() => {
                            setShowCallMenu(false);
                            console.log('Starting voice call...');
                          }}
                        >
                          <Phone size={16} />
                          <span className="text-sm font-medium">Voice Call</span>
                        </button>
                        <button
                          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:text-[#EF3866] hover:bg-[#EF3866]/10 transition-all duration-200"
                          onClick={() => {
                            setShowCallMenu(false);
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

      {showCallMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowCallMenu(false)}
        />
      )}
    </>
  );
};