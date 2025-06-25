// components/messaging/ConversationsList.tsx
import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Conversation } from '../../types/messaging';
import ConversationItem from './ConversationItem';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  currentUserId: string;
  isLoading: boolean;
  showFullPage?: boolean; // Add this new prop
}

export default function ConversationList({
  conversations,
  activeConversationId,
  onConversationSelect,
  onNewConversation,
  currentUserId,
  isLoading,
  showFullPage = false
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState('');


  const uniqueConversationsMap = new Map<string, Conversation>();

  conversations.forEach((conv) => {
    if (conv.type === 'group') {
      uniqueConversationsMap.set(conv.id, conv); // groups: use id as key
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

  const filteredConversations = uniqueConversations.filter(conversation => {
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


  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {/* Search Section */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-950">
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
                <p className="text-center text-sm font-medium text-gray-700 dark:text-gray-300">"{searchTerm}"</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-gradient-to-br from-[#EF3866]/10 to-[#EF3866]/5 rounded-full flex items-center justify-center mb-4">
                  <Plus size={24} className="text-[#EF3866]" />
                </div>
                <p className="text-center mb-2 font-medium text-gray-700 dark:text-gray-300">No conversations yet</p>
                <p className="text-center text-sm mb-4 text-gray-400 dark:text-gray-500">Start connecting with others</p>
                <button
                  onClick={onNewConversation}
                  className="px-6 py-3 bg-[#EF3866] text-white rounded-xl hover:bg-[#EF3866]/90 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg hover:scale-105"
                >
                  Start your first conversation
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1 px-3 py-2">
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
                onClick={() => onConversationSelect(conversation.id)}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
