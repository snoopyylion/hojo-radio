import React from 'react';
import { Conversation } from '../../types/messaging';
import UserPresence from './UserPresence';
import Image from 'next/image';
import { useUserProfile } from '@/hooks/useUserProfile';

interface ConversationItemProps {
    conversation: Conversation;
    isActive?: boolean;
    onClick: () => void;
    currentUserId: string;
    typingIndicator?: string | null;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
    conversation,
    isActive = false,
    onClick,
    currentUserId,
    typingIndicator
}) => {
    // Get the other participant for direct messages
    const otherParticipant = conversation.type === 'direct'
        ? conversation.participants.find(p => p.user_id !== currentUserId)
        : null;

    // Use the hook to get user profile data
    const { imageUrl, displayName } = useUserProfile(otherParticipant?.user_id || '');

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
        // Use the displayName from the hook instead of participant data
        return displayName;
    };

    const getConversationImage = () => {
        if (conversation.image_url) {
            return conversation.image_url;
        }

        if (conversation.type === 'direct') {
            // Use the imageUrl from the hook
            return imageUrl;
        }

        return '/default-avatar.png';
    };

    const isOnline = () => {
        if (conversation.type === 'group') return false;
        return otherParticipant?.user?.isOnline || false;
    };

    const truncateMessage = (message: string, maxLength: number = 30) => {
        if (message.length <= maxLength) return message;
        return message.substring(0, maxLength) + '...';
    };

    // Only show unread count if it's greater than 0 AND the last message wasn't sent by the current user
    const hasUnreadMessages =
        Number(conversation.unread_count) > 0 &&
        conversation.last_message?.sender_id !== currentUserId;


    return (
        <div
            onClick={onClick}
            className={`
                flex items-center px-4 py-3 cursor-pointer transition-all duration-200 font-sora
                hover:bg-gray-50 dark:hover:bg-gray-900/50
                ${isActive
                    ? 'bg-gray-100 dark:bg-gray-800/50'
                    : ''
                }
            `}
        >
            <div className="relative flex-shrink-0">
                <div className="relative">
                    <Image
                        src={getConversationImage()}
                        alt={getConversationName()}
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-full object-cover"
                    />

                    {/* Story ring effect for unread messages */}
                    {hasUnreadMessages && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 p-0.5">
                            <div className="w-full h-full rounded-full bg-white dark:bg-gray-950 p-0.5">
                                <Image
                                    src={getConversationImage()}
                                    alt={getConversationName()}
                                    width={56}
                                    height={56}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {conversation.type === 'direct' && (
                    <UserPresence
                        userId={otherParticipant?.user_id ?? ''}
                        isOnline={isOnline()}
                        className="absolute bottom-0 right-0 ring-2 ring-white dark:ring-gray-950"
                    />
                )}
            </div>

            <div className="flex-1 ml-3 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <h3 className={`
                        font-semibold truncate text-sm font-sora
                        ${hasUnreadMessages
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-900 dark:text-gray-300'
                        }
                    `}>
                        {getConversationName()}
                    </h3>

                    <div className="flex items-center gap-1.5">
                        {formatTime(conversation.last_message_at) && (
                            <span className={`
                                text-xs flex-shrink-0 font-sora
                                ${hasUnreadMessages
                                    ? 'text-gray-900 dark:text-white font-medium'
                                    : 'text-gray-500 dark:text-gray-400'
                                }
                            `}>
                                {formatTime(conversation.last_message_at)}
                            </span>
                        )}

                        {hasUnreadMessages && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-[#EF3866] text-white text-xs font-semibold rounded-full font-sora">
                                {conversation.unread_count! > 99 ? '99+' : conversation.unread_count}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center">
                    {typingIndicator ? (
                        <div className="flex items-center text-[#EF3866] text-sm font-medium font-sora">
                            <div className="flex space-x-1 mr-2">
                                <div className="w-1 h-1 bg-[#EF3866] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-1 h-1 bg-[#EF3866] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-1 h-1 bg-[#EF3866] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className="truncate">{typingIndicator}</span>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-1 min-w-0">
                            {/* Show "You:" prefix for messages sent by current user */}
                            {conversation.last_message?.sender_id === currentUserId && (
                                <span className="text-sm text-gray-500 dark:text-gray-400 font-sora flex-shrink-0">
                                    You:
                                </span>
                            )}
                            <p className={`
                                text-sm truncate font-sora min-w-0
                                ${hasUnreadMessages
                                    ? 'text-gray-900 dark:text-white font-medium'
                                    : 'text-gray-500 dark:text-gray-400'
                                }
                            `}>
                                {conversation.last_message?.content
                                    ? truncateMessage(conversation.last_message.content)
                                    : 'Start a conversation'
                                }
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConversationItem;