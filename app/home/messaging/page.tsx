// app/messages/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useRealtimeMessaging } from '@/hooks/useRealTimeMessaging';
import { MessageCircle, Users, Search, Plus, ArrowRight, Zap } from 'lucide-react';
import { Conversation } from '@/types/messaging';

export default function MessagesPage() {
    const router = useRouter();
    const { user, isLoaded } = useUser();
    const { conversations, loadConversations, loading, error } = useRealtimeMessaging();
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

    useEffect(() => {
        setSelectedConversation(null);
    }, []);

    const handleNewConversation = () => {
        router.push('/home/messaging/new');
    };

    // Loading state
    if (!isLoaded || loading) {
        return (
            <div className="h-[calc(100vh-120px)] bg-white dark:bg-gray-950 rounded-xl   flex items-center justify-center">
                <div className="text-center p-8">
                    <div className="w-12 h-12 border-3 border-[#EF3866] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Loading your conversations...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="h-[calc(100vh-120px)] bg-white dark:bg-gray-950 rounded-xl flex items-center justify-center">
                <div className="text-center p-8 max-w-md">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <div className="w-8 h-8 text-red-500 dark:text-red-400 text-2xl">⚠️</div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Connection Error</h3>
                    <p className="text-red-600 dark:text-red-400 mb-6 text-sm">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-[#EF3866] text-white rounded-xl hover:bg-[#EF3866]/90 transition-all text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-120px)] bg-white dark:bg-gray-950 rounded-lg overflow-hidden">
            {/* Modern Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#EF3866] to-[#EF3866]/80 rounded-xl flex items-center justify-center shadow-lg">
                                <MessageCircle size={20} className="text-white" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                                    <Zap size={12} className="text-green-500" />
                                    <span>Stay connected instantly</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleNewConversation}
                            className="group flex items-center space-x-2 px-5 py-3 bg-[#EF3866] text-white rounded-xl hover:bg-[#EF3866]/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                        >
                            <Plus size={18} strokeWidth={2.5} />
                            <span className="font-semibold">New Chat</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0 flex items-center justify-center p-8 bg-white dark:bg-gray-950">
                <div className="text-center max-w-lg mx-auto">
                    {conversations.length > 0 ? (
                        // Has conversations - modern welcome back experience
                        <>
                            {/* Animated Icon */}
                            <div className="mb-8 relative">
                                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center relative overflow-hidden">
                                    <MessageCircle className="w-10 h-10 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#EF3866]/10 to-transparent rounded-2xl"></div>
                                </div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                            </div>

                            {/* Welcome Message */}
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                                Welcome back!
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed text-lg">
                                Ready to continue your conversations? Select a chat from the sidebar or start something new.
                            </p>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                                <button
                                    onClick={handleNewConversation}
                                    className="group flex items-center justify-center space-x-3 px-8 py-4 bg-[#EF3866] text-white rounded-xl hover:bg-[#EF3866]/90 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                                >
                                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                                    <span>Start New Chat</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button
                                    onClick={() => (document.querySelector('[role="searchbox"]') as HTMLElement)?.focus()}
                                    className="flex items-center justify-center space-x-3 px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-all font-semibold"
                                >
                                    <Search className="w-5 h-5" />
                                    <span>Search Chats</span>
                                </button>
                            </div>

                            {/* Modern Stats Cards */}
                            <div className="grid grid-cols-3 gap-6">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-700/50">
                                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                                        {conversations.length}
                                    </div>
                                    <div className="text-blue-800 dark:text-blue-300 font-medium text-sm">
                                        Total Chats
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 p-6 rounded-2xl border border-green-200 dark:border-green-700/50">
                                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                                        {conversations.filter(c => c.type === 'direct').length}
                                    </div>
                                    <div className="text-green-800 dark:text-green-300 font-medium text-sm">
                                        Direct Messages
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 p-6 rounded-2xl border border-purple-200 dark:border-purple-700/50">
                                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                                        {conversations.filter(c => c.type === 'group').length}
                                    </div>
                                    <div className="text-purple-800 dark:text-purple-300 font-medium text-sm">
                                        Group Chats
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        // No conversations - modern onboarding experience
                        <>
                            {/* Animated Icon */}
                            <div className="mb-8">
                                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#EF3866]/10 to-[#EF3866]/20 rounded-3xl flex items-center justify-center relative overflow-hidden">
                                    <MessageCircle className="w-12 h-12 text-[#EF3866]" strokeWidth={1.5} />
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent rounded-3xl"></div>
                                </div>
                            </div>

                            {/* Welcome Message */}
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                                Start Your Journey
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed text-lg">
                                Connect instantly with friends, family, and colleagues. Your conversations start here.
                            </p>

                            {/* Primary Action */}
                            <button
                                onClick={handleNewConversation}
                                className="group flex items-center justify-center space-x-3 px-10 py-5 bg-gradient-to-r from-[#EF3866] to-[#EF3866]/90 text-white rounded-2xl hover:from-[#EF3866]/90 hover:to-[#EF3866]/80 transition-all font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95 mb-12"
                            >
                                <Plus className="w-6 h-6" strokeWidth={2.5} />
                                <span>Create Your First Chat</span>
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </button>

                            {/* Feature Highlights */}
                            <div className="grid grid-cols-3 gap-8">
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                                        <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Direct Messages</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Private one-on-one conversations</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                                        <Users className="w-6 h-6 text-green-600 dark:text-green-400" strokeWidth={2} />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Group Chats</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Collaborate with multiple people</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                                        <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" strokeWidth={2} />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Real-time</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Instant message delivery</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modern Footer */}
            <div className="flex-shrink-0 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-medium">Connected</span>
                        </div>
                        <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                        <span>{conversations.length} conversations</span>
                    </div>
                    <div className="text-sm font-medium text-gray-400 dark:text-gray-500">
                        Hojo Messages
                    </div>
                </div>
            </div>
        </div>
    );
}