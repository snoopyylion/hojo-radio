// components/ConversationItem.tsx
import React from 'react';
import { Conversation } from '../../types/messaging';
import UserPresence from './UserPresence';
import Image from 'next/image';

interface ConversationItemProps {
    conversation: Conversation;
    isActive?: boolean;
    onClick: () => void;
    currentUserId: string;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
    conversation,
    isActive = false,
    onClick,
    currentUserId
}) => {
    const formatTime = (dateString?: string) => {
        if (!dateString) return '';

        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInDays === 1) {
            return 'Yesterday';
        } else if (diffInDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const getConversationName = () => {
        if (conversation.type === 'group') {
            return conversation.name || 'Group Chat';
        }

        // For direct messages, show the other participant's name
        const otherParticipant = conversation.participants.find(
            p => p.user_id !== currentUserId
        );
        return otherParticipant?.user?.username || 'Unknown User';
    };

    const getConversationImage = () => {
        if (conversation.image_url) {
            return conversation.image_url;
        }

        if (conversation.type === 'direct') {
            const otherParticipant = conversation.participants.find(
                p => p.user_id !== currentUserId
            );
            return otherParticipant?.user?.imageUrl;
        }

        return null;
    };

    const isOnline = () => {
        if (conversation.type === 'group') return false;

        const otherParticipant = conversation.participants.find(
            p => p.user_id !== currentUserId
        );
        return otherParticipant?.user?.isOnline || false;
    };

    const truncateMessage = (message: string, maxLength: number = 50) => {
        if (message.length <= maxLength) return message;
        return message.substring(0, maxLength) + '...';
    };

    return (
        <div
            onClick={onClick}
            className={`
        flex items-center p-3 cursor-pointer transition-colors duration-200
        hover:bg-gray-50 border-l-4
        ${isActive
                    ? 'bg-blue-50 border-l-[#EF3866]'
                    : 'border-l-transparent hover:border-l-gray-200'
                }
      `}
        >
            <div className="relative flex-shrink-0">
                {getConversationImage() ? (
                    <Image
                        src={getConversationImage() ?? '/default-avatar.png'}
                        alt={getConversationName()}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover"
                    />
                ) : (
                    <div className={`
            w-12 h-12 rounded-full flex items-center justify-center text-white font-medium
            ${conversation.type === 'group' ? 'bg-[#EF3866]' : 'bg-gray-500'}
          `}>
                        {getConversationName().charAt(0).toUpperCase()}
                    </div>
                )}

                {conversation.type === 'direct' && (
                    <UserPresence
                        userId={
                            conversation.participants.find(p => p.user_id !== currentUserId)?.user_id ?? ''
                        }
                        isOnline={isOnline()}
                        className="absolute -bottom-1 -right-1"
                    />
                )}
            </div>

            <div className="flex-1 ml-3 min-w-0">
                <div className="flex items-center justify-between">
                    <h3 className={`
            font-medium truncate
            ${isActive ? 'text-pink-900' : 'text-gray-900'}
          `}>
                        {getConversationName()}
                    </h3>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatTime(conversation.last_message_at)}
                    </span>
                </div>

                <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-600 truncate">
                        {conversation.last_message?.content
                            ? truncateMessage(conversation.last_message.content)
                            : 'No messages yet'
                        }
                    </p>

                    {conversation.unread_count && conversation.unread_count > 0 && (
                        <span className="bg-[#EF3866] text-white text-xs rounded-full px-2 py-1 ml-2 flex-shrink-0">
                            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConversationItem;