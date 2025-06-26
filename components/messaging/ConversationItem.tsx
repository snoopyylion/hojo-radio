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
    typingIndicator?: string | null;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
    conversation,
    isActive = false,
    onClick,
    currentUserId,
    typingIndicator
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

    const truncateMessage = (message: string, maxLength: number = 40) => {
        if (message.length <= maxLength) return message;
        return message.substring(0, maxLength) + '...';
    };

    const hasUnreadMessages = conversation.unread_count && conversation.unread_count > 0;

    return (
        <div
            onClick={onClick}
            className={`
                flex items-center p-4 cursor-pointer transition-all duration-200
                hover:bg-gray-50 dark:hover:bg-gray-900/50
                ${isActive
                    ? 'bg-gradient-to-r from-[#EF3866]/5 to-transparent border-r-2 border-r-[#EF3866] dark:from-[#EF3866]/10'
                    : 'hover:shadow-sm'
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
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800"
                    />
                ) : (
                    <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg
                        shadow-md ring-2 ring-gray-100 dark:ring-gray-800
                        ${conversation.type === 'group' 
                            ? 'bg-gradient-to-br from-[#EF3866] to-[#d63157]' 
                            : 'bg-gradient-to-br from-gray-500 to-gray-600'
                        }
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
                        className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white dark:ring-gray-950"
                    />
                )}
            </div>

            <div className="flex-1 ml-4 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <h3 className={`
                        font-semibold truncate text-sm
                        ${isActive 
                            ? 'text-[#EF3866] dark:text-[#EF3866]' 
                            : hasUnreadMessages 
                                ? 'text-gray-900 dark:text-white' 
                                : 'text-gray-700 dark:text-gray-300'
                        }
                    `}>
                        {getConversationName()}
                    </h3>
                    
                    <div className="flex items-center gap-2">
                        {formatTime(conversation.last_message_at) && (
                            <span className={`
                                text-xs flex-shrink-0
                                ${hasUnreadMessages 
                                    ? 'text-[#EF3866] font-medium' 
                                    : 'text-gray-500 dark:text-gray-400'
                                }
                            `}>
                                {formatTime(conversation.last_message_at)}
                            </span>
                        )}
                        
                        {hasUnreadMessages && (
                            <div className="relative">
                                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-[#EF3866] text-white text-xs font-semibold rounded-full shadow-md">
                                    {conversation.unread_count! > 99 ? '99+' : conversation.unread_count}
                                </span>
                                <span className="absolute inset-0 rounded-full bg-[#EF3866] animate-ping opacity-20"></span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center">
                    {typingIndicator ? (
                        <div className="flex items-center text-[#EF3866] text-xs font-medium">
                            <div className="flex space-x-1 mr-2">
                                <div className="w-1 h-1 bg-[#EF3866] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-1 h-1 bg-[#EF3866] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-1 h-1 bg-[#EF3866] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className="truncate">{typingIndicator}</span>
                        </div>
                    ) : (
                        <p className={`
                            text-xs truncate
                            ${hasUnreadMessages 
                                ? 'text-gray-600 dark:text-gray-300 font-medium' 
                                : 'text-gray-500 dark:text-gray-400'
                            }
                        `}>
                            {conversation.last_message?.content
                                ? truncateMessage(conversation.last_message.content)
                                : 'No messages yet'
                            }
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConversationItem;