// app/messages/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useRealtimeMessaging } from '@/hooks/useRealTimeMessaging';
import { useSidebar } from '@/components/messaging/MessagingLayout';
import { MessageCircle, Users, Search, Plus, ArrowRight, Menu } from 'lucide-react';
import { Conversation } from '@/types/messaging';
import Image from 'next/image';

export default function MessagesPage() {
    const router = useRouter();
    const { user, isLoaded } = useUser();
    const { conversations, loadConversations, loading, error } = useRealtimeMessaging();
    const [, setSelectedConversation] = useState<Conversation | null>(null);
    const { toggleSidebar } = useSidebar();

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



    const handleNewConversation = () => {
        router.push('/messages/new');
    };

    // Loading state
    if (!isLoaded || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8">
                    <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Loading conversations...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8 max-w-md">
                    <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="w-6 h-6 text-red-500 dark:text-red-400">⚠️</div>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Unable to load conversations</h3>
                    <p className="text-red-600 dark:text-red-400 mb-6 text-sm">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-sm font-medium"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen">
            {/* Main content area */}
            <div className="flex flex-col h-full bg-white dark:bg-gray-950">
                {/* Simple Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center justify-between space-x-3">
                            <button
                                onClick={toggleSidebar}
                                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                title="Toggle sidebar"
                            >
                                <Menu size={20} />
                            </button>
                            <div className="w-10 h-10 rounded-xl relative overflow-hidden flex-shrink-0 shadow-md border border-gray-200/60 dark:border-gray-300/20 group-hover:shadow-lg transition-shadow">
                                <Image
                                    src="/img/logo.jpg"
                                    alt="logo"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Messages
                            </h1>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center max-w-lg mx-auto">
                        {conversations.length > 0 ? (
                            // Has conversations - encourage to start new chat or select existing
                            <>
                                {/* Simple Icon */}
                                <div className="mb-8">
                                    <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                        <MessageCircle className="w-8 h-8 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
                                    </div>
                                </div>

                                {/* Welcome Message */}
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                                    Welcome back
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                                    Select a conversation from the sidebar or start a new chat.
                                </p>

                                {/* Action Button */}
                                <button
                                    onClick={handleNewConversation}
                                    className="group inline-flex items-center space-x-2 px-6 py-3 bg-[#EF3866] dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>New Chat</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </button>

                                {/* Simple Stats */}
                                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
                                    <div className="flex justify-center space-x-8 text-sm">
                                        <div className="text-center">
                                            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                {conversations.length}
                                            </div>
                                            <div className="text-gray-500 dark:text-gray-400">
                                                Total chats
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                {conversations.filter(c => c.type === 'direct').length}
                                            </div>
                                            <div className="text-gray-500 dark:text-gray-400">
                                                Direct
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                {conversations.filter(c => c.type === 'group').length}
                                            </div>
                                            <div className="text-gray-500 dark:text-gray-400">
                                                Groups
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // No conversations - first time user experience
                            <>
                                {/* Simple Icon */}
                                <div className="mb-8">
                                    <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                        <MessageCircle className="w-8 h-8 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
                                    </div>
                                </div>

                                {/* Welcome Message */}
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                                    Start messaging
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                                    Send a message to start a conversation with your friends and colleagues.
                                </p>

                                {/* Action Button */}
                                <button
                                    onClick={handleNewConversation}
                                    className="group inline-flex items-center space-x-2 px-6 py-3 bg-[#EF3866] dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Start Your First Chat</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </button>

                                {/* Simple Feature List */}
                                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
                                    <div className="flex justify-center space-x-8 text-sm">
                                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                            <MessageCircle className="w-4 h-4" />
                                            <span>Direct messages</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                            <Users className="w-4 h-4" />
                                            <span>Group chats</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                            <Search className="w-4 h-4" />
                                            <span>Search</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}