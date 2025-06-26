// app/messages/[conversationId]/page.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useRealtimeMessaging } from '@/hooks/useRealTimeMessaging';
import ConversationList from '@/components/messaging/ConversationList';
import { MessagesList } from '@/components/messaging/MessageList';
import MessageInput from '@/components/messaging/MessageInput';
import { TypingIndicator } from '@/components/messaging/TypingIndicator';
import UserPresence from '@/components/messaging/UserPresence';
import { ConversationSettings } from '@/components/messaging/chat/ConversationSettings';
import { MessagingLayout } from '@/components/messaging/MessagingLayout';
import { Conversation, Message, TypingUser, User } from '@/types/messaging';
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
    const { userId, isLoaded, getToken: getClerkToken } = useAuth();
    const conversationId = params.conversationId as string;

    // Use the hook once with proper configuration
    const {
        messages,
        conversations,
        typingUsers,
        loading,
        error,
        sendMessage,
        sendTypingIndicator,
        reactToMessage,
        loadMessages,
        loadConversations,
        isSupabaseReady,
        setMessages,
        setConversations,
        setTypingUsers
    } = useRealtimeMessaging(conversationId);

    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const messageListRef = useRef<HTMLDivElement>(null);

    // Fix: Get typing users for current conversation and convert to Set if needed
    const currentTypingUsers = Array.isArray(typingUsers) ? typingUsers : (typingUsers[conversationId] || []);

    // Convert to Set if your TypingIndicator expects a Set
    const typingUsersSet = new Set(currentTypingUsers.map(user => user.userId));

    // For edge case fetching (API routes instead of Supabase direct)
    const [isConnected, setIsConnected] = useState(false);
    const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

    // WebSocket connection for real-time updates (alternative to Supabase realtime)
    useEffect(() => {
    if (!conversationId || !userId) return;

    // Create WebSocket connection for real-time updates
    const connectWebSocket = () => {
        // Add this check first
        if (!process.env.NEXT_PUBLIC_WS_URL) {
            console.error('❌ WebSocket URL not configured');
            return;
        }

        const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/conversations/${conversationId}?userId=${userId}`);
        
        ws.onopen = () => {
            console.log('🔌 WebSocket connected');
            setIsConnected(true);
            setWsConnection(ws);
        };

        ws.onmessage = async (event) => {
            try {
                let messageData;
                
                // Handle different data types
                if (event.data instanceof Blob) {
                    // Convert Blob to text
                    const text = await event.data.text();
                    messageData = text;
                } else if (typeof event.data === 'string') {
                    // Already a string
                    messageData = event.data;
                } else {
                    // Convert to string if it's something else
                    messageData = event.data.toString();
                }
                
                console.log('📨 Raw WebSocket message:', messageData);
                
                // Parse JSON
                const data = JSON.parse(messageData);
                console.log('📊 Parsed data:', data);

                switch (data.type) {
                    case 'new_message':
                        console.log('💬 New message received:', data.message);
                        // Handle new message
                        setMessages((prev) => {
                            // Check if message already exists to prevent duplicates
                            const exists = prev.some(msg => msg.id === data.message.id);
                            if (exists) return prev;
                            return [...prev, data.message];
                        });
                        
                        // Update conversation's last message
                        setConversations((prev) =>
                            prev.map((conv) =>
                                conv.id === data.message.conversation_id
                                    ? { 
                                        ...conv, 
                                        last_message: data.message, 
                                        last_message_at: data.message.created_at 
                                      }
                                    : conv
                            )
                        );
                        break;

                    case 'typing_update':
                        console.log('⌨️ Typing update:', data);
                        // Handle typing indicator
                        if (data.userId !== userId) {
                            // Convert to TypingUser format for compatibility
                            const typingUser = {
                                userId: data.userId,
                                username: data.username || 'Unknown User',
                                timestamp: Date.now()
                            };

                            setTypingUsers((prev) => {
                                const conversationTyping = prev[conversationId] || [];
                                if (data.isTyping) {
                                    const filtered = conversationTyping.filter((u) => u.userId !== data.userId);
                                    return {
                                        ...prev,
                                        [conversationId]: [...filtered, typingUser]
                                    };
                                } else {
                                    return {
                                        ...prev,
                                        [conversationId]: conversationTyping.filter((u) => u.userId !== data.userId)
                                    };
                                }
                            });
                        }
                        break;

                    case 'user_presence':
                        console.log('👤 User presence update:', data);
                        // Handle user online/offline status
                        setOnlineUsers(prev => {
                            const newSet = new Set(prev);
                            if (data.isOnline) {
                                newSet.add(data.userId);
                            } else {
                                newSet.delete(data.userId);
                            }
                            return newSet;
                        });
                        break;

                    default:
                        console.log('❓ Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('❌ Error parsing WebSocket message:', error);
                console.error('Raw event data:', event.data);
                console.error('Event data type:', typeof event.data);
                console.error('Event data constructor:', event.data?.constructor?.name);
            }
        };

        ws.onclose = (event) => {
            console.log('🔌 WebSocket disconnected:', event.code, event.reason);
            setIsConnected(false);
            setWsConnection(null);
            
            // Only reconnect if it wasn't a clean close
            if (event.code !== 1000) {
                console.log('🔄 Attempting to reconnect in 3 seconds...');
                setTimeout(connectWebSocket, 3000);
            }
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            console.error('WebSocket error details:', {
                url: ws.url,
                readyState: ws.readyState,
                protocol: ws.protocol
            });
            setIsConnected(false);
        };

        return ws;
    };

    const ws = connectWebSocket();

    // Cleanup function (this fixes the useEffect error)
    return () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('🧹 Cleaning up WebSocket connection');
            ws.close(1000, 'Component unmounting');
        }
    };
}, [conversationId, userId, setMessages, setConversations, setTypingUsers]);

    // Clean up typing indicators - this should work with the hook's typing users
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setTypingUsers((prev: Record<string, TypingUser[]>) => {
                const updated = { ...prev };
                Object.keys(updated).forEach(key => {
                    updated[key] = updated[key].filter((u: TypingUser) => now - u.timestamp < 5000);
                });
                return updated;
            });
        }, 2000);

        return () => clearInterval(interval);
    }, [setTypingUsers]);

    // Add polling as backup when WebSocket fails
    useEffect(() => {
        if (isConnected || !conversationId || !hasInitialized) return;

        const pollMessages = async () => {
            try {
                const response = await fetch(`/api/messages?conversation_id=${conversationId}&limit=1&after=${messages[messages.length - 1]?.created_at || ''}`);
                const data = await response.json();

                if (data.messages && data.messages.length > 0) {
                    setMessages(prev => {
                        const newMessages = data.messages.filter((msg: Message) =>
                            !prev.some(existingMsg => existingMsg.id === msg.id)
                        );
                        return newMessages.length > 0 ? [...prev, ...newMessages] : prev;
                    });
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        };

        const interval = setInterval(pollMessages, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, [isConnected, conversationId, hasInitialized, messages, setMessages]);

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
            // Use API routes instead of direct Supabase calls
            await Promise.all([
                loadConversationsFromAPI(),
                loadMessagesFromAPI()
            ]);
        } catch (error) {
            console.error('❌ Error initializing data:', error);
            setHasInitialized(false);
        }
    }, [userId, conversationId, hasInitialized]);

    // API call functions (edge case approach)
    const loadConversationsFromAPI = async () => {
        try {
            const response = await fetch('/api/conversations', {
                headers: {
                    'Authorization': `Bearer ${await getToken()}` // If using custom auth
                }
            });
            const data = await response.json();
            setConversations(data.conversations || []);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    };

    const loadMessagesFromAPI = async (limit = 50, before?: string) => {
        try {
            const params = new URLSearchParams({
                conversation_id: conversationId,
                limit: limit.toString(),
                ...(before && { before })
            });

            const response = await fetch(`/api/messages?${params}`, {
                headers: {
                    'Authorization': `Bearer ${await getToken()}` // If using custom auth
                }
            });
            const data = await response.json();

            if (before) {
                setMessages((prev: Message[]) => [...data.messages, ...prev]);
            } else {
                setMessages(data.messages || []);
            }

            return data.messages;
        } catch (error) {
            console.error('Failed to load messages:', error);
            return [];
        }
    };

    // Helper function to get auth token (implement based on your auth system)
    const getToken = async () => {
        try {
            return await getClerkToken();
        } catch (error) {
            console.error('Failed to get token:', error);
            return '';
        }
    };

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

        const conversation = conversations.find((c: Conversation) => c.id === conversationId);
        if (conversation) {
            console.log('✅ Found conversation:', conversation);
            setCurrentConversation(conversation);
        } else {
            console.log('❌ Conversation not found in list:', conversationId);
            console.log('Available conversations:', conversations.map((c: Conversation) => c.id));
        }
    }, [conversations, conversationId]);

    const handleConversationSelect = useCallback((conversationId: string) => {
        router.push(`/messages/${conversationId}`);
    }, [router]);

    const handleLoadMore = useCallback(async () => {
        if (isLoadingMore || messages.length === 0) return;

        setIsLoadingMore(true);
        try {
            const oldestMessage = messages[0];
            await loadMessagesFromAPI(20, oldestMessage.created_at);
        } catch (error) {
            console.error('❌ Error loading more messages:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, messages, loadMessagesFromAPI]);

    const handleTyping = useCallback((isTyping: boolean) => {
    try {
        // Send typing indicator via WebSocket
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
            const message = {
                type: 'typing_update',
                conversationId,
                userId,
                username: 'Current User', // Get from user context if available
                isTyping
            };
            
            console.log('📤 Sending typing update:', message);
            wsConnection.send(JSON.stringify(message));
        } else {
            console.log('❌ Cannot send typing update - WebSocket not ready');
        }
    } catch (error) {
        console.error('❌ Error sending typing indicator:', error);
    }
}, [wsConnection, conversationId, userId]);

// Fixed message sending
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
        // Send via API route instead of Supabase
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getToken()}`
            },
            body: JSON.stringify({
                conversation_id: conversationId,
                content: content.trim(),
                message_type: messageType,
                reply_to_id: replyToId
            })
        });

        const data = await response.json();

        if (data.message) {
            // Add message to local state immediately
            setMessages((prev) => [...prev, data.message]);

            // Send real-time update via WebSocket
            if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
                const wsMessage = {
                    type: 'new_message',
                    message: data.message
                };
                
                console.log('📤 Sending new message via WebSocket:', wsMessage);
                wsConnection.send(JSON.stringify(wsMessage));
            }

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
}, [currentConversation, conversationId, wsConnection, setMessages, getToken]);

    const handleReaction = useCallback(async (messageId: string, emoji: string) => {
        try {
            const response = await fetch('/api/message-reactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getToken()}`
                },
                body: JSON.stringify({ message_id: messageId, emoji })
            });

            const data = await response.json();

            if (data.reaction) {
                setMessages((prev: Message[]) =>
                    prev.map((msg: Message) => msg.id === messageId
                        ? { ...msg, reactions: [...(msg.reactions || []), data.reaction] }
                        : msg
                    )
                );
            }
        } catch (error) {
            console.error('❌ Error reacting to message:', error);
        }
    }, [setMessages, getToken]);

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
            {/* Connection status indicator */}
            {!isConnected && (
                <div className="bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-3 text-sm">
                    <div className="flex items-center">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
                        <span className="text-yellow-800 dark:text-yellow-200">Reconnecting...</span>
                    </div>
                </div>
            )}

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
                            typingUsers={typingUsersSet}
                            users={users}
                            currentUserId={userId!}
                            onReactToMessage={handleReaction}
                            onLoadMore={handleLoadMore}
                            loading={isLoadingMore}
                        />
                    </div>

                    {/* Typing indicator */}
                    {currentTypingUsers.length > 0 && (
                        <div className="px-4 py-2 bg-white dark:bg-gray-950">
                            <TypingIndicator
                                typingUsers={typingUsersSet}
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
                            conversationId={conversationId}
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
                    }}
                    onLeaveConversation={async () => {
                        console.log("Leave conversation");
                    }}
                    onRemoveParticipant={async (userId) => {
                        console.log("Remove participant", userId);
                    }}
                    onAddParticipants={async (userIds) => {
                        console.log("Add participants", userIds);
                    }}
                    onPromoteToAdmin={async (userId) => {
                        console.log("Promote to admin", userId);
                    }}
                />
            )}
        </MessagingLayout>
    );
}