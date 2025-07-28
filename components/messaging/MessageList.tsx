// components/messaging/MessagesList.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Message, User } from '@/types/messaging';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { format, isToday, isYesterday } from 'date-fns';
import { ChevronDown } from 'lucide-react';

interface MessagesListProps {
    messages: Message[];
    typingUsers: Set<string>;
    users: User[];
    currentUserId: string;
    onReactToMessage: (messageId: string, emoji: string) => void;
    onReply?: (message: Message) => void;
    replyingTo?: Message | null;
    onDeleteMessage?: (messageId: string) => void;
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
    onReply = () => {},
    replyingTo,
    onDeleteMessage = () => {},
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

    // Check if messages should be grouped (same sender within 2 minutes)
    const shouldGroupMessage = (currentMessage: Message, previousMessage: Message | null) => {
        if (!previousMessage) return false;

        const isSameSender = currentMessage.sender_id === previousMessage.sender_id;
        const timeDiff = new Date(currentMessage.created_at).getTime() - new Date(previousMessage.created_at).getTime();
        const isWithinTimeLimit = timeDiff < 2 * 60 * 1000; // 2 minutes for Instagram-style grouping

        return isSameSender && isWithinTimeLimit;
    };

    const messageGroups = groupMessagesByDate(messages);

    return (
        <div className={`flex flex-col h-full relative ${className}`}>
            {/* Instagram-style pattern background */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="instagram-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                            <circle cx="30" cy="30" r="2" fill="currentColor" opacity="0.3"/>
                            <circle cx="10" cy="10" r="1" fill="currentColor" opacity="0.2"/>
                            <circle cx="50" cy="10" r="1" fill="currentColor" opacity="0.2"/>
                            <circle cx="10" cy="50" r="1" fill="currentColor" opacity="0.2"/>
                            <circle cx="50" cy="50" r="1" fill="currentColor" opacity="0.2"/>
                            <path d="M30,10 L50,30 L30,50 L10,30 Z" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#instagram-pattern)" className="text-gray-600"/>
                </svg>
            </div>

            {/* Gradient overlay for better readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-50/80 via-white/60 to-gray-50/80 pointer-events-none"></div>

            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-6 relative z-10"
                onScroll={handleScroll}
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#cbd5e1 transparent'
                }}
            >
                {/* Loading indicator at top */}
                {loading && hasMore && (
                    <div className="flex justify-center py-6">
                        <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-gray-200">
                            <LoadingSpinner size="sm" />
                            <span className="text-sm text-gray-600 font-medium">Loading messages...</span>
                        </div>
                    </div>
                )}

                {/* Message groups by date */}
                {messageGroups.map(group => (
                    <div key={group.date} className="space-y-1">
                        {/* Date header */}
                        <div className="flex justify-center my-8">
                            <div className="bg-white/90 backdrop-blur-sm text-gray-700 text-sm font-semibold px-4 py-2 rounded-full border border-gray-200/60 shadow-sm">
                                {formatDateHeader(group.date)}
                            </div>
                        </div>

                        {/* Messages for this date */}
                        {group.messages.map((message, index) => {
                            const previousMessage = index > 0 ? group.messages[index - 1] : null;
                            const nextMessage = index < group.messages.length - 1 ? group.messages[index + 1] : null;
                            const isOwnMessage = message.sender_id === currentUserId;
                            const isGrouped = shouldGroupMessage(message, previousMessage);
                            const isLastInGroup = nextMessage ? !shouldGroupMessage(nextMessage, message) : true;

                            return (
                                <MessageBubble
                                    key={message.id}
                                    message={message}
                                    isOwnMessage={message.sender_id === currentUserId}
                                    onReply={onReply}
                                    onReact={onReactToMessage}
                                    onImageClick={() => {}}
                                    replyingTo={replyingTo}
                                    onDelete={onDeleteMessage}
                                />
                            );
                        })}
                    </div>
                ))}

                {/* Typing indicator */}
                {typingUsers.size > 0 && (
                    <div className="flex justify-start mb-4">
                        <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-gray-200/60">
                            <TypingIndicator typingUsers={typingUsers} users={users} />
                            <span className="text-sm text-gray-600">
                                {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                            </span>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {messages.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center h-full text-center relative z-10">
                        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-gray-200/60">
                            <div className="text-6xl mb-4 filter grayscale">💬</div>
                            <h3 className="text-xl font-bold mb-3 text-gray-800">Start a conversation</h3>
                            <p className="text-sm text-gray-600 max-w-sm">
                                Send a message to start chatting. Your messages will appear here.
                            </p>
                        </div>
                    </div>
                )}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {!shouldAutoScroll && (
                <div className="absolute bottom-6 right-6 z-20">
                    <button
                        onClick={scrollToBottom}
                        className="
                            bg-white/90 hover:bg-white backdrop-blur-sm text-gray-700 
                            rounded-full p-3 shadow-lg border border-gray-200/60
                            transition-all duration-200 hover:scale-105 transform
                            focus:outline-none focus:ring-2 focus:ring-gray-400/50
                        "
                        title="Scroll to bottom"
                    >
                        <ChevronDown className="w-5 h-5" />
                    </button>
                </div>
            )}


        </div>
    );
}