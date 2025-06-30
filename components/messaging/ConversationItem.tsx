import React, { memo, useMemo, useCallback } from 'react';
import { Conversation, TypingUser } from '../../types/messaging';
import UserPresence from './UserPresence';
import Image from 'next/image';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useGlobalNotifications } from '@/context/GlobalNotificationsContext';
import { useGlobalTyping } from '@/context/GlobalTypingContext';

interface ConversationItemProps {
    conversation: Conversation;
    isActive?: boolean;
    onClick: () => void;
    currentUserId: string;
    typingIndicator?: string | null;
}

const ConversationItem: React.FC<ConversationItemProps> = memo(({
    conversation,
    isActive = false,
    onClick,
    currentUserId
}) => {
    const { typingUsers } = useGlobalTyping();
    // Get the other participant for direct messages
    const otherParticipant = useMemo(() => 
        conversation.type === 'direct'
            ? conversation.participants?.find(p => p.user_id !== currentUserId)
            : null,
        [conversation.participants, conversation.type, currentUserId]
    );

    // Use the hook to get user profile data
    const { imageUrl, displayName, isLoading: profileLoading } = useUserProfile(otherParticipant?.user_id || '');
    const { state } = useGlobalNotifications();

    // Get typing users for this conversation with timestamp filtering
    const currentTypingUsers = useMemo(() => {
        if (!typingUsers || !conversation.id) return [];
        
        const users = typingUsers[conversation.id] || [];
        const now = Date.now();
        
        return users.filter(user => 
            user.userId !== currentUserId && 
            now - user.timestamp < 3000 // 3 second timeout
        );
    }, [typingUsers, conversation.id, currentUserId]);

    // Generate typing indicator text
    const typingIndicator = useMemo(() => {
        if (currentTypingUsers.length === 0) return null;
        
        // For now, use the username from the typing data
        // You can enhance this later by storing display names in your typing context
        // or by using a separate user cache/context
        const names = currentTypingUsers
            .slice(0, 3)
            .map(user => user.username || 'Someone');
        
        if (names.length === 1) return `typing...`;
        if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
        if (names.length === 3) {
            return currentTypingUsers.length === 3 
                ? `${names[0]}, ${names[1]}, and ${names[2]} are typing...`
                : `${names[0]}, ${names[1]}, and ${currentTypingUsers.length - 2} others are typing...`;
        }
        
        return 'Several people are typing...';
    }, [currentTypingUsers]);

    // Memoized time formatting function
    const formatTime = useMemo(() => {
        const formatTimeString = (dateString?: string) => {
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
        
        return formatTimeString(conversation.last_message_at);
    }, [conversation.last_message_at]);

    // Memoized conversation name
    const conversationName = useMemo(() => {
        if (conversation.type === 'group') {
            return conversation.name || 'Group Chat';
        }
        return displayName || otherParticipant?.user?.username || 'Unknown User';
    }, [conversation.type, conversation.name, displayName, otherParticipant?.user?.username]);

    // Memoized conversation image
    const conversationImage = useMemo(() => {
        if (conversation.image_url) {
            return conversation.image_url;
        }

        if (conversation.type === 'direct') {
            return imageUrl || otherParticipant?.user?.imageUrl || '/default-avatar.png';
        }

        return '/default-avatar.png';
    }, [conversation.image_url, conversation.type, imageUrl, otherParticipant?.user?.imageUrl]);

    // Memoized online status
    const isOnline = useMemo(() => {
        if (conversation.type === 'group') return false;
        return otherParticipant?.user?.isOnline || false;
    }, [conversation.type, otherParticipant?.user?.isOnline]);

    // Memoized message truncation
    const truncateMessage = useMemo(() => {
        const truncate = (message: string, maxLength: number = 35) => {
            if (!message) return '';
            if (message.length <= maxLength) return message;
            return message.substring(0, maxLength) + '...';
        };
        
        return conversation.last_message?.content 
            ? truncate(conversation.last_message.content)
            : 'Start a conversation';
    }, [conversation.last_message?.content]);

    // Only show unread count if it's greater than 0 AND the last message wasn't sent by the current user
    const hasUnreadMessages = useMemo(() =>
        Number(conversation.unread_count) > 0 &&
        conversation.last_message?.sender_id !== currentUserId,
        [conversation.unread_count, conversation.last_message?.sender_id, currentUserId]
    );

    // Memoized unread count display
    const unreadCountDisplay = useMemo(() => {
        const count = Number(conversation.unread_count);
        if (count > 99) return '99+';
        return count.toString();
    }, [conversation.unread_count]);

    // Memoized styling classes
    const containerClasses = useMemo(() => `
        flex items-center px-4 py-3 cursor-pointer transition-all duration-200 font-sora
        hover:bg-gray-50 dark:hover:bg-gray-900/50
        ${isActive ? 'bg-gray-100 dark:bg-gray-800/50' : ''}
    `.trim(), [isActive]);

    const nameClasses = useMemo(() => `
        font-semibold truncate text-sm font-sora
        ${hasUnreadMessages
            ? 'text-gray-900 dark:text-white'
            : 'text-gray-900 dark:text-gray-300'
        }
    `.trim(), [hasUnreadMessages]);

    const timeClasses = useMemo(() => `
        text-xs flex-shrink-0 font-sora
        ${hasUnreadMessages
            ? 'text-gray-900 dark:text-white font-medium'
            : 'text-gray-500 dark:text-gray-400'
        }
    `.trim(), [hasUnreadMessages]);

    const messageClasses = useMemo(() => `
        text-sm truncate font-sora min-w-0
        ${hasUnreadMessages
            ? 'text-gray-900 dark:text-white font-medium'
            : 'text-gray-500 dark:text-gray-400'
        }
    `.trim(), [hasUnreadMessages]);

    // Optimized click handler
    const handleClick = useCallback(() => {
        onClick();
    }, [onClick]);

    // Optimized keyboard handler
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    }, [onClick]);

    // Optimized image error handler
    const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.target as HTMLImageElement;
        target.src = '/default-avatar.png';
    }, []);

    // Show skeleton loading state while profile is loading for new conversations
    if (profileLoading && !displayName && conversation.type === 'direct') {
        return (
            <div className={containerClasses}>
                <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>
                <div className="flex-1 ml-3 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                        {formatTime && (
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse"></div>
                        )}
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={handleClick}
            className={containerClasses}
            role="button"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            aria-label={`Conversation with ${conversationName}`}
        >
            <div className="relative flex-shrink-0">
                <div className="relative">
                    <Image
                        src={conversationImage}
                        alt={conversationName}
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-full object-cover"
                        priority={hasUnreadMessages}
                        onError={handleImageError}
                    />

                    {/* Story ring effect for unread messages */}
                    {hasUnreadMessages && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 p-0.5 animate-pulse">
                            <div className="w-full h-full rounded-full bg-white dark:bg-gray-950 p-0.5">
                                <Image
                                    src={conversationImage}
                                    alt={conversationName}
                                    width={56}
                                    height={56}
                                    className="w-full h-full rounded-full object-cover"
                                    onError={handleImageError}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {conversation.type === 'direct' && (
                    <UserPresence
                        userId={otherParticipant?.user_id ?? ''}
                        isOnline={isOnline}
                        className="absolute bottom-0 right-0 ring-2 ring-white dark:ring-gray-950"
                    />
                )}
            </div>

            <div className="flex-1 ml-3 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <h3 className={nameClasses}>
                        {conversationName}
                    </h3>

                    <div className="flex items-center gap-1.5">
                        {formatTime && (
                            <span className={timeClasses}>
                                {formatTime}
                            </span>
                        )}

                        {hasUnreadMessages && (
                            <span 
                                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-[#EF3866] text-white text-xs font-semibold rounded-full font-sora animate-pulse"
                                aria-label={`${unreadCountDisplay} unread messages`}
                            >
                                {unreadCountDisplay}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center">
                    {typingIndicator ? (
                        <div className="flex items-center text-[#EF3866] text-sm font-medium font-sora">
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
                            <p className={messageClasses}>
                                {truncateMessage}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

// Add display name for debugging
ConversationItem.displayName = 'ConversationItem';

export default ConversationItem;