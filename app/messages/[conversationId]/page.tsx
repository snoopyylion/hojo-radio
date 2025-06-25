// app/messages/[conversationId]/page.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useRealTimeMessaging } from '@/hooks/useRealTimeMessaging';
import ConversationList from '@/components/messaging/ConversationList';
import { MessagesList } from '@/components/messaging/MessageList';
import MessageInput from '@/components/messaging/MessageInput';
import { TypingIndicator } from '@/components/messaging/TypingIndicator';
import UserPresence from '@/components/messaging/UserPresence';
import { ConversationSettings } from '@/components/messaging/chat/ConversationSettings';
import { MessagingLayout } from '@/components/messaging/MessagingLayout';
import { Conversation } from '@/types/messaging';
import { User } from '@/types/messaging';
import {
    ArrowLeft,
    Settings,
    MoreVertical,
    Phone,
    Video,
    Users
} from 'lucide-react';

export default function ConversationPage() {
    const router = useRouter();
    const params = useParams();
    const { userId, isLoaded } = useAuth();
    const conversationId = params.conversationId as string;

    const {
        messages,
        conversations,
        typingUsers,
        onlineUsers,
        loading,
        error,
        sendMessage,
        sendTypingIndicator,
        reactToMessage,
        loadMessages,
        loadConversations
    } = useRealTimeMessaging(conversationId);

    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const messageListRef = useRef<HTMLDivElement>(null);

    // Safely get users from conversation participants
    const users: User[] = currentConversation?.participants
        ?.map(p => p.user)
        ?.filter((u): u is User => u !== undefined && u !== null) ?? [];

    // Memoize the initialization function to prevent infinite loops
    const initializeData = useCallback(async () => {
        if (!userId || !conversationId || hasInitialized) return;

        console.log('🔄 Loading conversation data for:', conversationId);
        setHasInitialized(true);

        try {
            await Promise.all([
                loadConversations(),
                loadMessages()
            ]);
        } catch (error) {
            console.error('❌ Error initializing data:', error);
            setHasInitialized(false); // Reset on error to allow retry
        }
    }, [userId, conversationId, hasInitialized, loadConversations, loadMessages]);

    // Handle authentication and initialization
    useEffect(() => {
        if (!isLoaded) return;

        if (!userId) {
            router.push('/sign-in');
            return;
        }

        initializeData();
    }, [isLoaded, userId, initializeData, router]);

    // Handle conversation selection from the loaded conversations
    useEffect(() => {
        if (conversations.length === 0) return;

        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
            console.log('✅ Found conversation:', conversation);
            setCurrentConversation(conversation);
        } else {
            console.log('❌ Conversation not found in list:', conversationId);
            console.log('Available conversations:', conversations.map(c => c.id));
        }
    }, [conversations, conversationId]);

    const handleConversationSelect = useCallback((conversationId: string) => {
        router.push(`/messages/${conversationId}`);
    }, [router]);

    const handleSendMessage = useCallback(async (
        content: string,
        messageType: 'text' | 'image' | 'file' = 'text',
        replyToId?: string
    ) => {
        if (!content.trim() || !currentConversation) {
            console.log('❌ Cannot send message: missing content or conversation');
            return;
        }

        try {
            const result = await sendMessage(content.trim(), messageType, replyToId);
            if (result) {
                // Scroll to bottom after sending
                setTimeout(() => {
                    if (messageListRef.current) {
                        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
                    }
                }, 100);
            }
        } catch (error) {
            console.error('❌ Error sending message:', error);
        }
    }, [currentConversation, sendMessage]);

    const handleLoadMore = useCallback(async () => {
        if (isLoadingMore || messages.length === 0) return;

        setIsLoadingMore(true);
        try {
            const oldestMessage = messages[0];
            await loadMessages(20, oldestMessage.created_at);
        } catch (error) {
            console.error('❌ Error loading more messages:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, messages, loadMessages]);

    const handleTyping = useCallback((isTyping: boolean) => {
        try {
            sendTypingIndicator(isTyping);
        } catch (error) {
            console.error('❌ Error sending typing indicator:', error);
        }
    }, [sendTypingIndicator]);

    const handleReaction = useCallback(async (messageId: string, emoji: string) => {
        try {
            await reactToMessage(messageId, emoji);
        } catch (error) {
            console.error('❌ Error reacting to message:', error);
        }
    }, [reactToMessage]);
    

    useEffect(() => {
        setShowMobileMenu(false);

        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            const event = new CustomEvent('closeSidebar');
            window.dispatchEvent(event);
        }
    }, [conversationId]);

    const getConversationTitle = useCallback(() => {
        if (!currentConversation) return 'Loading...';

        if (currentConversation.type === 'group') {
            return currentConversation.name || 'Group Chat';
        }

        // For direct messages, show the other participant's name
        const otherParticipant = currentConversation.participants?.find(
            (p) => p.user_id !== userId
        );

        if (otherParticipant?.user) {
            const fullName = `${otherParticipant.user.firstName || ''} ${otherParticipant.user.lastName || ''}`.trim();
            return fullName || otherParticipant.user.username || 'Unknown User';
        }

        return 'Direct Message';
    }, [currentConversation, userId]);

    const getOtherParticipant = useCallback(() => {
        if (!currentConversation || currentConversation.type !== 'direct') return null;

        return currentConversation.participants?.find(
            (p) => p.user_id !== userId
        );
    }, [currentConversation, userId]);

    // Show loading state only when actually loading
    if (!isLoaded || (loading && !hasInitialized)) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#EF3866] to-[#EF3866]/80 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Loading conversation...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8 max-w-md">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <div className="w-8 h-8 text-red-600 dark:text-red-400">⚠️</div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Something went wrong</h3>
                    <p className="text-red-600 dark:text-red-400 mb-6 text-sm">{error}</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => {
                                setHasInitialized(false);
                                window.location.reload();
                            }}
                            className="px-6 py-3 bg-[#EF3866] text-white rounded-xl hover:bg-[#EF3866]/90 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => router.push('/messages')}
                            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                        >
                            Back to Messages
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Show conversation not found state
    if (hasInitialized && conversations.length > 0 && !currentConversation) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8 max-w-md">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <div className="w-8 h-8 text-gray-400">💬</div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Conversation not found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                        The conversation may have been deleted or you may not have access to it.
                    </p>
                    <button
                        onClick={() => router.push('/messages')}
                        className="px-6 py-3 bg-[#EF3866] text-white rounded-xl hover:bg-[#EF3866]/90 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                    >
                        Back to Messages
                    </button>
                </div>
            </div>
        );
    }

    // Show loading state while waiting for conversation to load
    if (!currentConversation && hasInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#EF3866] to-[#EF3866]/80 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Loading conversation...</p>
                </div>
            </div>
        );
    }

    // Render the sidebar content separately
    const sidebarContent = (
        <ConversationList
            conversations={conversations}
            activeConversationId={currentConversation?.id}
            onConversationSelect={handleConversationSelect}
            onNewConversation={() => router.push('/messages/new')}
            currentUserId={userId!}
            isLoading={loading}
        />
    );

    const otherParticipant = getOtherParticipant();
    const isOtherUserOnline = otherParticipant ? onlineUsers.has(otherParticipant.user_id) : false;

    return (
        <MessagingLayout sidebar={sidebarContent}>
            {/* Main chat area */}
            <div className="flex flex-col h-full bg-white dark:bg-gray-950">
                {/* Chat header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {/* Mobile back button */}
                            <button
                                onClick={() => router.push('/messages')}
                                className="lg:hidden p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                                title="Back to messages"
                            >
                                <ArrowLeft size={20} />
                            </button>

                            {/* Conversation avatar and info */}
                            <div className="flex items-center space-x-3">
                                {/* Avatar */}
                                <div className="relative">
                                    {currentConversation?.type === 'group' ? (
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

                                {/* Title and status */}
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                        {getConversationTitle()}
                                    </h2>
                                    {currentConversation?.type === 'direct' && otherParticipant && (
                                        <UserPresence
                                            userId={otherParticipant.user_id}
                                            isOnline={isOtherUserOnline}
                                        />
                                    )}
                                    {currentConversation?.type === 'group' && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {currentConversation.participants?.length || 0} members
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Header actions */}
                        <div className="flex items-center space-x-2">
                            {/* Call buttons for direct messages */}
                            {currentConversation?.type === 'direct' && (
                                <>
                                    <button
                                        className="hidden sm:flex p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:text-[#EF3866] hover:bg-[#EF3866]/10 transition-all duration-200"
                                        title="Voice call"
                                    >
                                        <Phone size={18} />
                                    </button>
                                    <button
                                        className="hidden sm:flex p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:text-[#EF3866] hover:bg-[#EF3866]/10 transition-all duration-200"
                                        title="Video call"
                                    >
                                        <Video size={18} />
                                    </button>
                                </>
                            )}

                            {/* Settings button */}
                            <button
                                onClick={() => setShowSettings(true)}
                                className="p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:text-[#EF3866] hover:bg-[#EF3866]/10 transition-all duration-200"
                                title="Conversation settings"
                            >
                                <Settings size={18} />
                            </button>

                            {/* Mobile menu */}
                            <button
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                                className="lg:hidden p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                                title="More options"
                            >
                                <MoreVertical size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Mobile menu dropdown */}
                    {showMobileMenu && (
                        <div className="lg:hidden mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                            <div className="flex items-center space-x-2">
                                {currentConversation?.type === 'direct' && (
                                    <>
                                        <button
                                            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-[#EF3866] hover:bg-[#EF3866]/10 transition-all duration-200"
                                            onClick={() => setShowMobileMenu(false)}
                                        >
                                            <Phone size={16} />
                                            <span className="text-sm font-medium">Call</span>
                                        </button>
                                        <button
                                            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-[#EF3866] hover:bg-[#EF3866]/10 transition-all duration-200"
                                            onClick={() => setShowMobileMenu(false)}
                                        >
                                            <Video size={16} />
                                            <span className="text-sm font-medium">Video</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Messages area */}
                <div className="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900/50">
                    <div ref={messageListRef} className="flex-1 overflow-y-auto">
                        <MessagesList
                            messages={messages}
                            typingUsers={typingUsers}
                            users={users}
                            currentUserId={userId!}
                            onReactToMessage={handleReaction}
                            onLoadMore={handleLoadMore}
                            loading={isLoadingMore}
                        />
                    </div>

                    {/* Typing indicator */}
                    {typingUsers.size > 0 && (
                        <div className="px-4 py-2 bg-white dark:bg-gray-950">
                            <TypingIndicator
                                typingUsers={typingUsers}
                                users={users}
                            />
                        </div>
                    )}

                    {/* Message input */}
                    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
                        <MessageInput
                            onSendMessage={handleSendMessage}
                            onTyping={handleTyping}
                            disabled={loading}
                        />
                    </div>
                </div>
            </div>

            {/* Settings modal */}
            {showSettings && currentConversation && (
                <ConversationSettings
                    conversation={currentConversation}
                    currentUserId={userId!}
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    onUpdateConversation={async (updates) => {
                        console.log("Update conversation", updates);
                        // You can call your update logic here
                    }}
                    onLeaveConversation={async () => {
                        console.log("Leave conversation");
                        // You can handle the leave action here
                    }}
                    onRemoveParticipant={async (userId) => {
                        console.log("Remove participant", userId);
                        // You can handle removing a participant here
                    }}
                    onAddParticipants={async (userIds) => {
                        console.log("Add participants", userIds);
                        // You can handle adding participants here
                    }}
                    onPromoteToAdmin={async (userId) => {
                        console.log("Promote to admin", userId);
                        // You can handle promoting here
                    }}
                />
            )}
        </MessagingLayout>
    );
}