// components/messaging/ConversationsList.tsx
import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { Conversation, TypingUser, Message } from '../../types/messaging';
import ConversationItem from './ConversationItem';
import { createClient } from '@supabase/supabase-js';
import { useUser } from '@clerk/nextjs';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  currentUserId: string;
  isLoading: boolean;
  showFullPage?: boolean;
}

export default function ConversationList({
  conversations,
  activeConversationId,
  onConversationSelect,
  onNewConversation,
  currentUserId,
  isLoading,
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser[]>>({});
  const [realTimeConversations, setRealTimeConversations] = useState<Conversation[]>(conversations);
  const { user } = useUser();

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setRealTimeConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to real-time message updates
    const messageChannel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Update conversations with new message
          setRealTimeConversations(prev => 
            prev.map(conv => {
              if (conv.id === newMessage.conversation_id) {
                return {
                  ...conv,
                  last_message: newMessage,
                  last_message_at: newMessage.created_at,
                  unread_count: newMessage.sender_id !== user.id 
                    ? (conv.unread_count || 0) + 1 
                    : conv.unread_count
                };
              }
              return conv;
            })
          );
        }
      )
      .subscribe();

    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel('typing')
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { conversation_id, user_id, username, is_typing } = payload.payload;
        
        // Don't show typing indicator for current user
        if (user_id === user.id) return;

        setTypingUsers(prev => {
          const conversationTyping = prev[conversation_id] || [];
          
          if (is_typing) {
            // Add user to typing list if not already there
            const existingUser = conversationTyping.find(u => u.userId === user_id);
            if (!existingUser) {
              return {
                ...prev,
                [conversation_id]: [
                  ...conversationTyping,
                  { userId: user_id, username, timestamp: Date.now() }
                ]
              };
            }
          } else {
            // Remove user from typing list
            return {
              ...prev,
              [conversation_id]: conversationTyping.filter(u => u.userId !== user_id)
            };
          }
          
          return prev;
        });
      })
      .subscribe();

    // Clean up typing indicators periodically (remove stale ones)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(conversationId => {
          updated[conversationId] = updated[conversationId].filter(
            user => now - user.timestamp < 5000 // Remove after 5 seconds
          );
          if (updated[conversationId].length === 0) {
            delete updated[conversationId];
          }
        });
        return updated;
      });
    }, 2000);

    return () => {
      messageChannel.unsubscribe();
      typingChannel.unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, [user?.id, supabase]);

  // Filter out conversations with no messages
  const conversationsWithMessages = realTimeConversations.filter(conversation => {
    return conversation.last_message || conversation.last_message_at;
  });

  // Remove duplicate conversations
  const uniqueConversationsMap = new Map<string, Conversation>();

  conversationsWithMessages.forEach((conv) => {
    if (conv.type === 'group') {
      uniqueConversationsMap.set(conv.id, conv);
    } else {
      // For direct messages, use a sorted pair of user IDs as the key
      const participantIds = conv.participants.map(p => p.user_id).sort();
      const key = participantIds.join('-');
      if (!uniqueConversationsMap.has(key)) {
        uniqueConversationsMap.set(key, conv);
      }
    }
  });

  const uniqueConversations = Array.from(uniqueConversationsMap.values());

  // Sort conversations by last message time (most recent first)
  const sortedConversations = uniqueConversations.sort((a, b) => {
    const aTime = new Date(a.last_message_at || a.created_at).getTime();
    const bTime = new Date(b.last_message_at || b.created_at).getTime();
    return bTime - aTime;
  });

  const filteredConversations = sortedConversations.filter(conversation => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();

    if (conversation.name?.toLowerCase().includes(searchLower)) {
      return true;
    }

    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(
        p => p.user_id !== currentUserId
      );
      if (otherParticipant?.user?.username?.toLowerCase().includes(searchLower)) {
        return true;
      }
    }

    if (conversation.last_message?.content?.toLowerCase().includes(searchLower)) {
      return true;
    }

    return false;
  });

  const getTypingIndicator = (conversationId: string) => {
    const typing = typingUsers[conversationId];
    if (!typing || typing.length === 0) return null;

    if (typing.length === 1) {
      return `${typing[0].username} is typing...`;
    } else if (typing.length === 2) {
      return `${typing[0].username} and ${typing[1].username} are typing...`;
    } else {
      return `${typing.length} people are typing...`;
    }
  };

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

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
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
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
                onClick={() => onConversationSelect(conversation.id)}
                currentUserId={currentUserId}
                typingIndicator={getTypingIndicator(conversation.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}