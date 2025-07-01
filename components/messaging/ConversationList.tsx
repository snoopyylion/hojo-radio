// components/messaging/ConversationsList.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { Conversation, TypingUser, Message } from '../../types/messaging';
import ConversationItem from './ConversationItem';
import { createClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useUser } from '@clerk/nextjs';
import { useGlobalTyping } from '@/context/GlobalTypingContext';

// Define simplified types for better compatibility
interface MessagePayload {
  new: any;
  old?: any;
  eventType: string;
}

interface ConversationPayload {
  new: any;
  old?: any;
  eventType: string;
}

// Type guards
const isValidMessage = (obj: any): obj is Message => {
  return obj && typeof obj === 'object' && 'id' in obj && 'conversation_id' in obj;
};

const isValidConversation = (obj: any): obj is Conversation => {
  return obj && typeof obj === 'object' && 'id' in obj && 'type' in obj;
};

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
}: ConversationListProps) {
  const { typingUsers } = useGlobalTyping();
  const [searchTerm, setSearchTerm] = useState('');
  const [realTimeConversations, setRealTimeConversations] = useState<Conversation[]>([]);

  const { user } = useUser();
  const mountedRef = useRef(true);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const lastUpdateRef = useRef<string>('');
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelsRef = useRef<RealtimeChannel[]>([]);

  // Initialize Supabase client once
  const supabase = useMemo(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    return supabaseRef.current;
  }, []);

  // Helper function to create a stable hash for comparison
  const createConversationHash = useCallback((convs: Conversation[]): string => {
    return convs
      .map(c => `${c.id}-${c.last_message_at}-${c.unread_count || 0}-${c.last_message?.id || ''}`)
      .sort()
      .join('|');
  }, []);

  // Debounced update function to prevent rapid successive calls
  const debouncedUpdate = useCallback((newConversations: Conversation[]) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      if (onConversationsUpdate && mountedRef.current) {
        onConversationsUpdate(newConversations);
      }
    }, 100); // 100ms debounce
  }, [onConversationsUpdate]);

  // Update conversations when props change
  useEffect(() => {
    const newHash = createConversationHash(conversations);
    if (newHash !== lastUpdateRef.current && conversations.length > 0) {
      console.log('📋 Updating conversations from props:', conversations.length);
      lastUpdateRef.current = newHash;
      setRealTimeConversations(conversations);
    }
  }, [conversations, createConversationHash]);

  // Cleanup function for channels
  const cleanupChannels = useCallback(() => {
    console.log('🧹 Cleaning up channels');
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel).catch(console.error);
    });
    channelsRef.current = [];
  }, [supabase]);

  // Real-time message subscriptions
  useEffect(() => {
    if (!user?.id || !mountedRef.current) return;

    console.log('🔄 Setting up real-time subscriptions for user:', user.id);

    // Clean up existing channels first
    cleanupChannels();

    // Message INSERT subscription
    const messageChannel = supabase
      .channel(`messages-${user.id}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      })
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${user.id}`,
        },
        (payload: any) => {
          if (!mountedRef.current) return;
          const newMessage = payload.new;
          
          // Type guard to ensure we have a valid message
          if (!isValidMessage(newMessage)) {
            console.warn('Invalid message payload received:', newMessage);
            return;
          }
          
          console.log('💬 New message received:', newMessage.conversation_id);

          setRealTimeConversations(prevConversations => {
            const updatedConversations = prevConversations.map(conv => {
              if (conv.id === newMessage.conversation_id) {
                return {
                  ...conv,
                  last_message: newMessage,
                  last_message_at: newMessage.created_at,
                  unread_count: (conv.unread_count || 0) + 1
                };
              }
              return conv;
            });

            const newHash = createConversationHash(updatedConversations);
            const oldHash = createConversationHash(prevConversations);
            
            if (newHash !== oldHash) {
              debouncedUpdate(updatedConversations);
            }

            return updatedConversations;
          });
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          if (!mountedRef.current) return;
          const updatedMessage = payload.new;
          
          // Type guard to ensure we have a valid message
          if (!isValidMessage(updatedMessage)) {
            console.warn('Invalid message update payload received:', updatedMessage);
            return;
          }
          
          console.log('✏️ Message updated:', updatedMessage.conversation_id);

          setRealTimeConversations(prevConversations => {
            const updatedConversations = prevConversations.map(conv => {
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

            const newHash = createConversationHash(updatedConversations);
            const oldHash = createConversationHash(prevConversations);
            
            if (newHash !== oldHash) {
              debouncedUpdate(updatedConversations);
            }

            return updatedConversations;
          });
        }
      );

    // Conversation updates subscription
    const conversationChannel = supabase
      .channel(`conversations-${user.id}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      })
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participants=cs.["${user.id}"]`,
        },
        (payload: any) => {
          if (!mountedRef.current) return;
          console.log('🔄 Conversation event:', payload.eventType);
          
          const conversation = payload.new;
          
          // Type guard to ensure we have a valid conversation
          if (!isValidConversation(conversation)) {
            console.warn('Invalid conversation payload received:', conversation);
            return;
          }
          
          setRealTimeConversations(prevConversations => {
            let updatedConversations = [...prevConversations];

            switch (payload.eventType) {
              case 'INSERT':
                console.log('🆕 Adding new conversation:', conversation.id);
                updatedConversations = [...prevConversations, conversation];
                break;
              
              case 'UPDATE':
                console.log('📝 Updating conversation:', conversation.id);
                updatedConversations = prevConversations.map(conv => 
                  conv.id === conversation.id ? conversation : conv
                );
                break;
              
              case 'DELETE':
                console.log('🗑️ Removing conversation:', conversation.id);
                updatedConversations = prevConversations.filter(conv => conv.id !== conversation.id);
                break;
            }

            const newHash = createConversationHash(updatedConversations);
            const oldHash = createConversationHash(prevConversations);
            
            if (newHash !== oldHash) {
              debouncedUpdate(updatedConversations);
            }

            return updatedConversations;
          });
        }
      );

    // Subscribe to channels
    messageChannel.subscribe();
    conversationChannel.subscribe();

    // Store channel references
    channelsRef.current = [messageChannel, conversationChannel];

    return () => {
      console.log('🧹 Cleaning up conversation list subscriptions');
      mountedRef.current = false;
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      cleanupChannels();
    };
  }, [user?.id, supabase, createConversationHash, debouncedUpdate, cleanupChannels]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Process conversations with proper memoization
  const processedConversations = useMemo(() => {
    console.log('🔄 Processing conversations:', realTimeConversations.length);

    if (realTimeConversations.length === 0) return [];

    // Filter conversations with messages or recent activity
    const conversationsWithActivity = realTimeConversations.filter(conversation => {
      return conversation.last_message || 
             conversation.last_message_at || 
             conversation.created_at;
    });

    // Remove duplicates efficiently
    const uniqueConversationsMap = new Map<string, Conversation>();

    conversationsWithActivity.forEach((conv) => {
      if (conv.type === 'group') {
        uniqueConversationsMap.set(conv.id, conv);
      } else {
        // For direct messages, create a consistent key
        const participantIds = conv.participants
          ?.map(p => p.user_id)
          .sort() || [];
        const key = participantIds.join('-');

        const existing = uniqueConversationsMap.get(key);
        const convTime = new Date(conv.last_message_at || conv.created_at).getTime();
        const existingTime = existing ? new Date(existing.last_message_at || existing.created_at).getTime() : 0;

        if (!existing || convTime > existingTime) {
          uniqueConversationsMap.set(key, conv);
        }
      }
    });

    // Sort by most recent activity
    return Array.from(uniqueConversationsMap.values()).sort((a, b) => {
      const aTime = new Date(a.last_message_at || a.created_at).getTime();
      const bTime = new Date(b.last_message_at || b.created_at).getTime();
      return bTime - aTime;
    });
  }, [realTimeConversations]);

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return processedConversations;

    const searchLower = searchTerm.toLowerCase().trim();

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

  // Get typing indicator for a conversation
  const getTypingIndicator = useCallback((conversationId: string): string | null => {
    if (!typingUsers?.[conversationId]) return null;
    
    const activeTypingUsers = typingUsers[conversationId].filter(typingUser => {
      const isNotCurrentUser = typingUser.userId !== currentUserId;
      const isRecent = Date.now() - typingUser.timestamp < 3000; // 3 second timeout
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

  // Handle conversation selection
  const handleConversationSelect = useCallback((conversationId: string) => {
    console.log('🎯 Selecting conversation:', conversationId);

    // Clear unread count optimistically
    setRealTimeConversations(prevConversations => {
      const updatedConversations = prevConversations.map(conv => {
        if (conv.id === conversationId && (conv.unread_count || 0) > 0) {
          return { ...conv, unread_count: 0 };
        }
        return conv;
      });

      // Only call update if there are changes
      const hasChanges = updatedConversations.some((conv, index) => 
        conv.unread_count !== prevConversations[index]?.unread_count
      );

      if (hasChanges) {
        debouncedUpdate(updatedConversations);
      }

      return updatedConversations;
    });
    
    onConversationSelect(conversationId);
  }, [onConversationSelect, debouncedUpdate]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {/* Search Section */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" 
            size={18} 
          />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#EF3866] focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
          />
        </div>
      </div>

      {/* Conversations List */}
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
                  <p className="text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    &quot;{searchTerm}&quot;
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-gradient-to-br from-[#EF3866]/10 to-[#EF3866]/5 rounded-full flex items-center justify-center mb-4">
                    <Plus size={24} className="text-[#EF3866]" />
                  </div>
                  <p className="text-center mb-2 font-medium text-gray-700 dark:text-gray-300">
                    No active conversations
                  </p>
                  <p className="text-center text-sm mb-4 text-gray-400 dark:text-gray-500">
                    Start messaging to see conversations here
                  </p>
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
                  key={`${conversation.id}-${conversation.last_message_at || conversation.created_at}-${conversation.unread_count || 0}`}
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