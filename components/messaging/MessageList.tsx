// components/messaging/MessagesList.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Message, User } from '@/types/messaging';
import MessageBubble from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';

interface MessagesListProps {
    messages: Message[];
    typingUsers: Set<string>;
    users: User[];
    currentUserId: string;
    onReactToMessage: (messageId: string, emoji: string) => void;
    onLoadMore?: () => void;
    loading?: boolean;
    hasMore?: boolean;
    className?: string;
}

export function MessagesList({
    messages,
    typingUsers,
    users,
    currentUserId,
    onReactToMessage,
    onLoadMore,
    loading = false,
    hasMore = false,
    className = ""
}: MessagesListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (shouldAutoScroll) {
            scrollToBottom();
        }
    }, [messages, shouldAutoScroll]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Handle scroll events to determine auto-scroll behavior
    const handleScroll = () => {
        if (!messagesContainerRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        setShouldAutoScroll(isNearBottom);

        // Load more messages when scrolled to top
        if (scrollTop === 0 && hasMore && onLoadMore && !loading) {
            onLoadMore();
        }
    };

    // Group messages by date
    const groupMessagesByDate = (messages: Message[]) => {
        const groups: { date: string; messages: Message[] }[] = [];
        let currentGroup: { date: string; messages: Message[] } | null = null;

        messages.forEach(message => {
            const messageDate = new Date(message.created_at);
            const dateKey = format(messageDate, 'yyyy-MM-dd');

            if (!currentGroup || currentGroup.date !== dateKey) {
                currentGroup = { date: dateKey, messages: [] };
                groups.push(currentGroup);
            }

            currentGroup.messages.push(message);
        });

        return groups;
    };

    const formatDateHeader = (dateString: string) => {
        const date = new Date(dateString);

        if (isToday(date)) return 'Today';
        if (isYesterday(date)) return 'Yesterday';

        return format(date, 'MMMM d, yyyy');
    };

    // Check if messages should be grouped (same sender within 5 minutes)
    const shouldGroupMessage = (currentMessage: Message, previousMessage: Message | null) => {
        if (!previousMessage) return false;

        const isSameSender = currentMessage.sender_id === previousMessage.sender_id;
        const timeDiff = new Date(currentMessage.created_at).getTime() - new Date(previousMessage.created_at).getTime();
        const isWithinTimeLimit = timeDiff < 5 * 60 * 1000; // 5 minutes

        return isSameSender && isWithinTimeLimit;
    };

    const messageGroups = groupMessagesByDate(messages);

    return (
        <div className={`flex flex-col h-full bg-white dark:bg-gray-950 ${className}`}>
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-2 space-y-4 bg-gray-50 dark:bg-gray-900"
                onScroll={handleScroll}
            >
                {/* Loading indicator at top */}
                {loading && hasMore && (
                    <div className="flex justify-center py-4">
                        <LoadingSpinner size="sm" />
                    </div>
                )}

                {/* Message groups by date */}
                {messageGroups.map(group => (
                    <div key={group.date} className="space-y-2">
                        {/* Date header */}
                        <div className="flex justify-center my-4">
                            <div className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                                {formatDateHeader(group.date)}
                            </div>
                        </div>

                        {/* Messages for this date */}
                        {group.messages.map((message, index) => {
                            const previousMessage = index > 0 ? group.messages[index - 1] : null;
                            const isGrouped = shouldGroupMessage(message, previousMessage);

                            return (
                                <MessageBubble
                                    key={message.id}
                                    message={message}
                                    isOwn={message.sender_id === currentUserId}
                                    isGrouped={isGrouped}
                                    onReact={(emoji) => onReactToMessage(message.id, emoji)}
                                    onReply={() => { }}
                                    onEdit={() => { }}
                                    onDelete={() => { }}
                                />
                            );
                        })}
                    </div>
                ))}

                {/* Empty state */}
                {messages.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <div className="text-6xl mb-4">💬</div>
                        <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">No messages yet</h3>
                        <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                            Start the conversation by sending a message below
                        </p>
                    </div>
                )}

                {/* Typing indicator */}
                <TypingIndicator
                    typingUsers={typingUsers}
                    users={users}
                    className="mb-2"
                />

                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {!shouldAutoScroll && (
                <div className="absolute bottom-4 right-4 z-10">
                    <button
                        onClick={scrollToBottom}
                        className="
                            bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 
                            text-gray-700 dark:text-gray-300 rounded-full p-2 shadow-lg
                            border border-gray-200 dark:border-gray-600
                            transition-colors duration-200 focus:outline-none focus:ring-2 
                            focus:ring-gray-500 dark:focus:ring-gray-400
                        "
                        title="Scroll to bottom"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}