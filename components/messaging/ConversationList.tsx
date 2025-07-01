// components/messaging/ConversationsList.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus } from 'lucide-react';
import { Conversation, TypingUser, Message } from '../../types/messaging';
import ConversationItem from './ConversationItem';
import { createClient } from '@supabase/supabase-js';
import { useUser } from '@clerk/nextjs';
import { useGlobalNotifications } from '@/context/GlobalNotificationsContext';
import { useGlobalTyping } from '@/context/GlobalTypingContext';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  currentUserId: string;
  isLoading: boolean;
  showFullPage?: boolean;
  onConversationsUpdate?: (conversations: Conversation[]) => void;
  typingUsers?: Record<string, TypingUser[]>;
  realtimeMessages?: Message[];
}

export default function ConversationList({
  conversations,
  activeConversationId,
  onConversationSelect,
  onNewConversation,
  currentUserId,
  isLoading,
  onConversationsUpdate,
  realtimeMessages,
}: ConversationListProps) {
  const { typingUsers } = useGlobalTyping();
  const [searchTerm, setSearchTerm] = useState('');
  const [realTimeConversations, setRealTimeConversations] = useState<Conversation[]>(conversations);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());

  const { user } = useUser();
  const { isGlobalConnected } = useGlobalNotifications();
  const mountedRef = useRef(true);
  const supabaseRef = useRef<any>(null);

  // Initialize Supabase client with ref to prevent recreation
  if (!supabaseRef.current) {
    supabaseRef.current = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  const supabase = supabaseRef.current;

  // Update conversations when prop changes
  useEffect(() => {
    if (JSON.stringify(conversations) !== JSON.stringify(realTimeConversations)) {
      console.log('📋 Updating conversations from props:', conversations.length);
      setRealTimeConversations(conversations);
      setLastUpdateTime(Date.now());
    }
  }, [conversations]);

  // Add this effect to handle conversation updates
  useEffect(() => {
    if (onConversationsUpdate && realTimeConversations !== conversations) {
      onConversationsUpdate(realTimeConversations);
    }
  }, [realTimeConversations, onConversationsUpdate]);

  // Enhanced real-time subscriptions
  useEffect(() => {
    if (!user?.id || !mountedRef.current) return;

    console.log('🔄 Setting up real-time subscriptions for user:', user.id);

    // Subscribe to message updates
    const messageChannel = supabase
      .channel('conversations-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          if (!mountedRef.current) return;

          const newMessage = payload.new as Message;
          console.log('💬 New message received in conversation list:', newMessage);

          // Compute the new state first
          const updated = realTimeConversations.map(conv => {
            if (conv.id === newMessage.conversation_id) {
              const updatedConv = {
                ...conv,
                last_message: newMessage,
                last_message_at: newMessage.created_at,
                unread_count: newMessage.sender_id !== user.id
                  ? (conv.unread_count || 0) + 1
                  : conv.unread_count || 0
              };

              console.log('📝 Updated conversation:', updatedConv.id, 'unread:', updatedConv.unread_count);
              return updatedConv;
            }
            return conv;
          });

          // Then update state
          setRealTimeConversations(updated);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          if (!mountedRef.current) return;

          const updatedMessage = payload.new as Message;
          console.log('✏️ Message updated in conversation list:', updatedMessage);

          // Compute the new state first
          const updated = realTimeConversations.map(conv => {
            if (conv.id === updatedMessage.conversation_id &&
              conv.last_message?.id === updatedMessage.id) {
              return {
                ...conv,
                last_message: updatedMessage,
                last_message_at: updatedMessage.updated_at || updatedMessage.created_at
              };
            }
            return conv;
          });

          // Then update state
          setRealTimeConversations(updated);
        }
      )
      .subscribe();

    // Subscribe to conversation updates - Enhanced with your new logic
    const conversationChannel = supabase
      .channel('conversations-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, (payload: { eventType: string; new: Conversation; old: Conversation }) => {
        if (!mountedRef.current) return;

        const updatedConversation = payload.new as Conversation;
        console.log('🔄 Conversation event:', payload.eventType, updatedConversation);
        
        setRealTimeConversations(prev => {
          // Handle INSERT
          if (payload.eventType === 'INSERT') {
            if (updatedConversation.participants?.some(p => p.user_id === user.id)) {
              console.log('🆕 Adding new conversation:', updatedConversation.id);
              return [...prev, updatedConversation];
            }
            return prev;
          }
          
          // Handle UPDATE
          if (payload.eventType === 'UPDATE') {
            console.log('📝 Updating conversation:', updatedConversation.id);
            return prev.map(conv => 
              conv.id === updatedConversation.id ? updatedConversation : conv
            );
          }
          
          // Handle DELETE
          if (payload.eventType === 'DELETE') {
            console.log('🗑️ Removing conversation:', updatedConversation.id);
            return prev.filter(conv => conv.id !== updatedConversation.id);
          }
          
          return prev;
        });
      })
      .subscribe();

    // Subscribe to typing indicators with better error handling
    const typingChannel = supabase
      .channel('typing-indicators')
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        if (!mountedRef.current) return;

        const { conversation_id, user_id, username, is_typing } = payload.payload;

        // Don't show typing indicator for current user
        if (user_id === user.id) return;

        console.log('⌨️ Typing indicator received:', { conversation_id, user_id, is_typing });
      })
      .subscribe();

    // Subscribe to read receipts
    const readReceiptChannel = supabase
      .channel('read-receipts')
      .on('broadcast', { event: 'message_read' }, (payload: any) => {
        if (!mountedRef.current) return;

        const { conversation_id, user_id } = payload.payload;

        // If someone else read messages in a conversation, we might want to update unread counts
        if (user_id !== user.id) {
          console.log('👁️ Message read by other user:', { conversation_id, user_id });
          // You can implement additional logic here if needed
        }
      })
      .subscribe();

    // Clean up typing indicators periodically
    const cleanupInterval = setInterval(() => {
      if (!mountedRef.current) return;

      const now = Date.now();
    }, 2000);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up conversation list subscriptions');
      mountedRef.current = false;

      messageChannel.unsubscribe();
      conversationChannel.unsubscribe();
      typingChannel.unsubscribe();
      readReceiptChannel.unsubscribe();

      clearInterval(cleanupInterval);
    };
  }, [user?.id, supabase, realTimeConversations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Optimized conversation processing with memoization
  const processedConversations = React.useMemo(() => {
    console.log('🔄 Processing conversations:', realTimeConversations.length);

    // Filter out conversations with no messages (optional)
    const conversationsWithMessages = realTimeConversations.filter(conversation => {
      return conversation.last_message || conversation.last_message_at || conversation.created_at;
    });

    // Remove duplicate conversations more efficiently
    const uniqueConversationsMap = new Map<string, Conversation>();

    conversationsWithMessages.forEach((conv) => {
      if (conv.type === 'group') {
        uniqueConversationsMap.set(conv.id, conv);
      } else {
        // For direct messages, use a sorted pair of user IDs as the key
        const participantIds = conv.participants?.map(p => p.user_id).sort() || [];
        const key = participantIds.join('-');

        // Keep the most recent conversation if duplicates exist
        const existing = uniqueConversationsMap.get(key);
        if (!existing || new Date(conv.last_message_at || conv.created_at) > new Date(existing.last_message_at || existing.created_at)) {
          uniqueConversationsMap.set(key, conv);
        }
      }
    });

    const uniqueConversations = Array.from(uniqueConversationsMap.values());

    // Sort conversations by last message time (most recent first)
    return uniqueConversations.sort((a, b) => {
      const aTime = new Date(a.last_message_at || a.created_at).getTime();
      const bTime = new Date(b.last_message_at || b.created_at).getTime();
      return bTime - aTime;
    });
  }, [realTimeConversations, lastUpdateTime]);

  // Optimized search filtering
  const filteredConversations = React.useMemo(() => {
    if (!searchTerm) return processedConversations;

    const searchLower = searchTerm.toLowerCase();

    return processedConversations.filter(conversation => {
      // Search in conversation name
      if (conversation.name?.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in participant names for direct messages
      if (conversation.type === 'direct') {
        const otherParticipant = conversation.participants?.find(
          p => p.user_id !== currentUserId
        );
        if (otherParticipant?.user?.username?.toLowerCase().includes(searchLower)) {
          return true;
        }
      }

      // Search in last message content
      if (conversation.last_message?.content?.toLowerCase().includes(searchLower)) {
        return true;
      }

      return false;
    });
  }, [processedConversations, searchTerm, currentUserId]);

  // Update the typing indicator getter function to use the new structure
const getTypingIndicator = useCallback((conversationId: string) => {
  if (!typingUsers) return null;
  
  // Since we're now receiving typing users as Record<string, TypingUser[]>
  const currentTypingUsers = typingUsers[conversationId] || [];
  
  // Filter out current user and check timestamps
  const activeTypingUsers = currentTypingUsers.filter(user => {
    const isNotCurrentUser = user.userId !== currentUserId;
    const isRecent = Date.now() - user.timestamp < 3000; // 3 second timeout
    return isNotCurrentUser && isRecent;
  });

  if (activeTypingUsers.length === 0) return null;

  const usernames = activeTypingUsers.map(user => user.username);
  
  if (usernames.length === 1) {
    return `${usernames[0]} is typing...`;
  } else if (usernames.length === 2) {
    return `${usernames[0]} and ${usernames[1]} are typing...`;
  } else {
    return `${usernames.length} people are typing...`;
  }
}, [typingUsers, currentUserId]);


  // Enhanced conversation selection with optimistic updates
  const handleConversationSelect = useCallback((conversationId: string) => {
    console.log('🎯 Selecting conversation:', conversationId);

    // Compute the new state first
    const updated = realTimeConversations.map(conv => {
      if (conv.id === conversationId && conv.unread_count && conv.unread_count > 0) {
        return { ...conv, unread_count: 0 };
      }
      return conv;
    });
    
    // Then update state
    setRealTimeConversations(updated);
    
    // Finally call the callbacks
    if (onConversationsUpdate) {
      onConversationsUpdate(updated);
    }
    onConversationSelect(conversationId);
  }, [realTimeConversations, onConversationSelect, onConversationsUpdate]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {/* Search Section */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#EF3866] focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
          />
        </div>
      </div>

      {/* Conversations List - Fixed scrolling */}
      <div className="flex-1 min-h-0 bg-white dark:bg-gray-950">
        <div className="h-full overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#EF3866] border-t-transparent"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
              {searchTerm ? (
                <>
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Search size={24} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-center text-sm">No conversations found matching</p>
                  <p className="text-center text-sm font-medium text-gray-700 dark:text-gray-300">&quot;{searchTerm}&quot;</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-gradient-to-br from-[#EF3866]/10 to-[#EF3866]/5 rounded-full flex items-center justify-center mb-4">
                    <Plus size={24} className="text-[#EF3866]" />
                  </div>
                  <p className="text-center mb-2 font-medium text-gray-700 dark:text-gray-300">No active conversations</p>
                  <p className="text-center text-sm mb-4 text-gray-400 dark:text-gray-500">Start messaging to see conversations here</p>
                  <button
                    onClick={onNewConversation}
                    className="px-6 py-3 bg-[#EF3866] text-white rounded-xl hover:bg-[#EF3866]/90 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg hover:scale-105"
                  >
                    Start a conversation
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredConversations.map((conversation) => (
                <ConversationItem
                  key={`${conversation.id}-${conversation.last_message_at}-${conversation.unread_count}`}
                  conversation={conversation}
                  isActive={conversation.id === activeConversationId}
                  onClick={() => handleConversationSelect(conversation.id)}
                  currentUserId={currentUserId}
                  typingIndicator={getTypingIndicator(conversation.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}