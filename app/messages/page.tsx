// app/messages/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useRealTimeMessaging } from '@/hooks/useRealTimeMessaging';
import ConversationList from '@/components/messaging/ConversationList';
import { MessagingLayout } from '@/components/messaging/MessagingLayout';
import { MessageCircle, Users, Search, Sparkles, Plus, ArrowRight } from 'lucide-react';
import { Conversation } from '@/types/messaging';

export default function MessagesPage() {
    const router = useRouter();
    const { user, isLoaded } = useUser();
    const { conversations, loadConversations, loading, error } = useRealTimeMessaging();
    const [, setSelectedConversation] = useState<Conversation | null>(null);

    useEffect(() => {
        if (isLoaded && !user) {
            router.push('/sign-in');
            return;
        }

        if (user) {
            loadConversations();
        }
    }, [isLoaded, user, loadConversations, router]);

    // Don't auto-redirect - let users see the main interface
    useEffect(() => {
        // Clear any selected conversation since we're on the main page
        setSelectedConversation(null);
    }, []);

    const handleConversationSelect = (conversationId: string) => {
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
            setSelectedConversation(conversation);
            router.push(`/messages/${conversationId}`);
        }
    };

    const handleNewConversation = () => {
        router.push('/messages/new');
    };

    // Loading state
    if (!isLoaded || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#EF3866] to-[#EF3866]/80 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Loading conversations...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8 max-w-md">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <div className="w-8 h-8 text-red-600 dark:text-red-400">⚠️</div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Something went wrong</h3>
                    <p className="text-red-600 dark:text-red-400 mb-6 text-sm">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-[#EF3866] text-white rounded-xl hover:bg-[#EF3866]/90 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Render the sidebar content
    const sidebarContent = (
        <ConversationList
            conversations={conversations}
            activeConversationId={undefined} // No active conversation on main page
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            currentUserId={user?.id || ''}
            isLoading={loading}
        />
    );

    return (
        <MessagingLayout sidebar={sidebarContent}>
            {/* Main content area - Start New Chat interface */}
            <div className="flex flex-col h-full bg-white dark:bg-gray-950">
                {/* Main content */}
                <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 p-6">
                    <div className="text-center max-w-2xl mx-auto">
                        {conversations.length > 0 ? (
                            // Has conversations - encourage to start new chat or select existing
                            <>
                                {/* Hero Icon */}
                                <div className="relative mb-8">
                                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#EF3866]/10 to-[#EF3866]/5 dark:from-[#EF3866]/20 dark:to-[#EF3866]/10 rounded-3xl flex items-center justify-center">
                                        <MessageCircle className="w-12 h-12 text-[#EF3866]" strokeWidth={1.5} />
                                    </div>
                                </div>

                                {/* Welcome Message */}
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                                    Ready to chat?
                                </h1>
                                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                                    Select a conversation from the sidebar or start a new chat with someone special.
                                </p>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                                    <button
                                        onClick={handleNewConversation}
                                        className="group px-8 py-4 bg-[#EF3866] text-white rounded-xl hover:bg-[#EF3866]/90 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                                    >
                                        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        <span>Start New Chat</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                                    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                                        <div className="text-2xl font-bold text-[#EF3866] mb-1">
                                            {conversations.length}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Conversation{conversations.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                                        <div className="text-2xl font-bold text-[#EF3866] mb-1">
                                            {conversations.filter(c => c.type === 'direct').length}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Direct Chats
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 col-span-2 md:col-span-1">
                                        <div className="text-2xl font-bold text-[#EF3866] mb-1">
                                            {conversations.filter(c => c.type === 'group').length}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Group Chats
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // No conversations - first time user experience
                            <>
                                {/* Hero Icon */}
                                <div className="relative mb-8">
                                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#EF3866]/10 to-[#EF3866]/5 dark:from-[#EF3866]/20 dark:to-[#EF3866]/10 rounded-3xl flex items-center justify-center">
                                        <MessageCircle className="w-12 h-12 text-[#EF3866]" strokeWidth={1.5} />
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#EF3866] rounded-full flex items-center justify-center">
                                        <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                </div>

                                {/* Welcome Message */}
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                                    Welcome to Messages
                                </h1>
                                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                                    Connect with friends, family, and colleagues. Start meaningful conversations that matter.
                                </p>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                                    <button
                                        onClick={handleNewConversation}
                                        className="group px-8 py-4 bg-[#EF3866] text-white rounded-xl hover:bg-[#EF3866]/90 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                                    >
                                        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        <span>Start Your First Chat</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>

                                {/* Feature Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                    <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-[#EF3866]/30 transition-colors">
                                        <div className="w-12 h-12 bg-[#EF3866]/10 dark:bg-[#EF3866]/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                                            <MessageCircle className="w-6 h-6 text-[#EF3866]" />
                                        </div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Direct Messages</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Send private messages to individuals</p>
                                    </div>

                                    <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-[#EF3866]/30 transition-colors">
                                        <div className="w-12 h-12 bg-[#EF3866]/10 dark:bg-[#EF3866]/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                                            <Users className="w-6 h-6 text-[#EF3866]" />
                                        </div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Group Chats</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Create groups for team discussions</p>
                                    </div>

                                    <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-[#EF3866]/30 transition-colors">
                                        <div className="w-12 h-12 bg-[#EF3866]/10 dark:bg-[#EF3866]/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                                            <Search className="w-6 h-6 text-[#EF3866]" />
                                        </div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Discover</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Find and connect with new people</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </MessagingLayout>
    );
}