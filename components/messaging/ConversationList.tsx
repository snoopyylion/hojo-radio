import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { Conversation, TypingUser, Message } from '../../types/messaging';
import ConversationItem from './ConversationItem';
import { createClient } from '@supabase/supabase-js';
import { useUser } from '@clerk/nextjs';
import { useGlobalTyping } from '@/context/GlobalTypingContext';

// Ultra-defensive typing approach - treating all realtime payloads as unknown
interface GenericRealtimePayload {
  [key: string]: unknown;
  new?: unknown;
  old?: unknown;
  eventType?: string;
  event?: string;
  schema?: string;
  table?: string;
  commit_timestamp?: string;
  errors?: string[];
}


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

// Comprehensive type guards with detailed validation
const isValidMessage = (obj: unknown): obj is Message => {
  if (!obj || typeof obj !== 'object' || obj === null) return false;
  
  const msgObj = obj as Record<string, unknown>;
  
  // Check required fields
  const hasRequiredFields = (
    typeof msgObj.id === 'string' &&
    typeof msgObj.conversation_id === 'string' &&
    typeof msgObj.content === 'string' &&
    typeof msgObj.sender_id === 'string' &&
    typeof msgObj.created_at === 'string'
  );
  
  if (!hasRequiredFields) return false;
  
  // Check optional fields if they exist
  if (msgObj.updated_at !== undefined && typeof msgObj.updated_at !== 'string') return false;
  if (msgObj.message_type !== undefined && typeof msgObj.message_type !== 'string') return false;
  if (msgObj.is_edited !== undefined && typeof msgObj.is_edited !== 'boolean') return false;
  if (msgObj.is_deleted !== undefined && typeof msgObj.is_deleted !== 'boolean') return false;
  
  return true;
};

const isValidConversation = (obj: unknown): obj is Conversation => {
  if (!obj || typeof obj !== 'object' || obj === null) return false;
  
  const convObj = obj as Record<string, unknown>;
  
  // Check required fields
  const hasRequiredFields = (
    typeof convObj.id === 'string' &&
    typeof convObj.type === 'string' &&
    (convObj.type === 'direct' || convObj.type === 'group')
  );
  
  if (!hasRequiredFields) return false;
  
  // Check optional fields if they exist
  if (convObj.name !== undefined && typeof convObj.name !== 'string') return false;
  if (convObj.created_at !== undefined && typeof convObj.created_at !== 'string') return false;
  if (convObj.last_message_at !== undefined && typeof convObj.last_message_at !== 'string') return false;
  if (convObj.unread_count !== undefined && typeof convObj.unread_count !== 'number') return false;
  if (convObj.participants !== undefined && !Array.isArray(convObj.participants)) return false;
  
  return true;
};

// Safe payload extraction functions
const extractMessageFromPayload = (payload: GenericRealtimePayload): Message | null => {
  try {
    const candidate = payload.new || payload.old;
    return isValidMessage(candidate) ? candidate : null;
  } catch (error) {
    console.warn('Error extracting message from payload:', error);
    return null;
  }
};

const extractConversationFromPayload = (payload: GenericRealtimePayload): Conversation | null => {
  try {
    const candidate = payload.new || payload.old;
    return isValidConversation(candidate) ? candidate : null;
  } catch (error) {
    console.warn('Error extracting conversation from payload:', error);
    return null;
  }
};

const getEventType = (payload: GenericRealtimePayload): string => {
  return (payload.eventType || payload.event || 'UNKNOWN') as string;
};

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
  const channelRefs = useRef<Array<{ unsubscribe: () => void }>>([]);

  // Initialize Supabase client
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

  // Debounced update function
  const debouncedUpdate = useCallback((newConversations: Conversation[]) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      if (onConversationsUpdate && mountedRef.current) {
        onConversationsUpdate(newConversations);
      }
    }, 100);
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

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up subscriptions');
    channelRefs.current.forEach(channel => {
      try {
        channel.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    });
    channelRefs.current = [];
  }, []);

  // Error-resistant subscription handler
  const createSubscriptionHandler = useCallback((
    handlerType: 'message' | 'conversation',
    eventType: string
  ) => {
    return (payload: unknown) => {
      if (!mountedRef.current) return;

      try {
        // Cast to our generic payload type
        const genericPayload = payload as GenericRealtimePayload;
        
        if (handlerType === 'message') {
          const message = extractMessageFromPayload(genericPayload);
          const actualEventType = getEventType(genericPayload);
          
          if (!message) {
            console.warn('Invalid message payload received:', genericPayload);
            return;
          }

          console.log(`💬 Message ${actualEventType.toLowerCase()}:`, message.conversation_id);

          setRealTimeConversations(prevConversations => {
            let updatedConversations = [...prevConversations];

            if (actualEventType === 'INSERT' && message.sender_id !== currentUserId) {
              // Handle new message from others
              updatedConversations = prevConversations.map(conv => {
                if (conv.id === message.conversation_id) {
                  return {
                    ...conv,
                    last_message: message,
                    last_message_at: message.created_at,
                    unread_count: (conv.unread_count || 0) + 1
                  };
                }
                return conv;
              });
            } else if (actualEventType === 'UPDATE') {
              // Handle message updates
              updatedConversations = prevConversations.map(conv => {
                if (conv.id === message.conversation_id &&
                    conv.last_message?.id === message.id) {
                  return {
                    ...conv,
                    last_message: message,
                    last_message_at: message.updated_at || message.created_at
                  };
                }
                return conv;
              });
            }

            const newHash = createConversationHash(updatedConversations);
            const oldHash = createConversationHash(prevConversations);
            
            if (newHash !== oldHash) {
              debouncedUpdate(updatedConversations);
            }

            return updatedConversations;
          });
        } else if (handlerType === 'conversation') {
          const conversation = extractConversationFromPayload(genericPayload);
          const actualEventType = getEventType(genericPayload);
          
          if (!conversation) {
            console.warn('Invalid conversation payload received:', genericPayload);
            return;
          }

          console.log(`🔄 Conversation ${actualEventType.toLowerCase()}:`, conversation.id);

          setRealTimeConversations(prevConversations => {
            let updatedConversations = [...prevConversations];

            switch (actualEventType) {
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

              default:
                console.log('Unknown conversation event type:', actualEventType);
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
      } catch (error) {
        console.error(`Error handling ${handlerType} ${eventType} event:`, error);
      }
    };
  }, [currentUserId, createConversationHash, debouncedUpdate]);

  // Real-time subscriptions with maximum defensive approach
  useEffect(() => {
    if (!user?.id || !mountedRef.current) return;

    console.log('🔄 Setting up real-time subscriptions for user:', user.id);
    cleanup();

    try {
      // Create channels and subscribe with proper Supabase typing
      const messageChannel = supabase.channel(`messages-${user.id}-${Date.now()}`);
      const conversationChannel = supabase.channel(`conversations-${user.id}-${Date.now()}`);

      // Subscribe to message changes
      messageChannel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${user.id}`,
        },
        createSubscriptionHandler('message', 'INSERT')
      );

      messageChannel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        createSubscriptionHandler('message', 'UPDATE')
      );

      // Subscribe to conversation changes
      conversationChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participants=cs.["${user.id}"]`,
        },
        createSubscriptionHandler('conversation', '*')
      );

      // Subscribe with error handling
      const subscriptions = [
        messageChannel.subscribe((status: string) => {
          console.log('Message channel status:', status);
          if (status === 'CHANNEL_ERROR') {
            console.error('Message channel subscription failed');
          }
        }),
        conversationChannel.subscribe((status: string) => {
          console.log('Conversation channel status:', status);
          if (status === 'CHANNEL_ERROR') {
            console.error('Conversation channel subscription failed');
          }
        })
      ];

      // Store channel references for cleanup
      channelRefs.current = [
        { unsubscribe: () => supabase.removeChannel(messageChannel) },
        { unsubscribe: () => supabase.removeChannel(conversationChannel) }
      ];

      // Wait for subscriptions to complete
      Promise.all(subscriptions).catch(error => {
        console.error('Error subscribing to channels:', error);
      });

    } catch (error) {
      console.error('Error setting up realtime subscriptions:', error);
    }

    return () => {
      console.log('🧹 Cleaning up conversation list subscriptions');
      mountedRef.current = false;
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      cleanup();
    };
  }, [user?.id, supabase, cleanup, createSubscriptionHandler]);

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
      if (conversation.last_message?.message_type === 'image') {
        // For image messages, search for "image" keyword
        if ('image'.toLowerCase().includes(searchLower)) {
          return true;
        }
      } else if (conversation.last_message?.content?.toLowerCase().includes(searchLower)) {
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
      <div className="flex-shrink-0 p-2 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" 
            size={16} 
          />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF3866] focus:border-transparent"
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

// Additional utility functions for even more defensive programming

// Utility to safely parse JSON strings from unknown sources
export const safeJsonParse = (jsonString: unknown): unknown => {
  if (typeof jsonString !== 'string') return null;
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return null;
  }
};

// Utility to safely access nested object properties
export const safeGet = (obj: unknown, path: string): unknown => {
  if (!obj || typeof obj !== 'object') return undefined;
  
  const keys = path.split('.');
  let current = obj as Record<string, unknown>;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[key] as Record<string, unknown>;
  }
  
  return current;
};

// Enhanced error boundary for realtime subscriptions
export const withErrorBoundary = <T extends unknown[]>(
  fn: (...args: T) => void,
  fallback?: () => void
) => {
  return (...args: T) => {
    try {
      fn(...args);
    } catch (error) {
      console.error('Error in subscription handler:', error);
      if (fallback) {
        fallback();
      }
    }
  };
};