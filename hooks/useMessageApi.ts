// hooks/useMessageApi.ts
import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Message } from '@/types/messaging';

export const useMessageApi = () => {
  const { getToken: getClerkToken } = useAuth();

  const getToken = useCallback(async () => {
    try {
      return await getClerkToken();
    } catch (error) {
      console.error('Failed to get token:', error);
      return '';
    }
  }, [getClerkToken]);

  const loadConversationsFromAPI = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${await getToken()}`
        }
      });
      const data = await response.json();
      return data.conversations || [];
    } catch (error) {
      console.error('Failed to load conversations:', error);
      return [];
    }
  }, [getToken]);

  const loadMessagesFromAPI = useCallback(async (
    conversationId: string,
    limit = 50,
    before?: string
  ) => {
    try {
      const params = new URLSearchParams({
        conversation_id: conversationId,
        limit: limit.toString(),
        ...(before && { before })
      });

      const response = await fetch(`/api/messages?${params}`, {
        headers: {
          'Authorization': `Bearer ${await getToken()}`
        }
      });
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Failed to load messages:', error);
      return [];
    }
  }, [getToken]);

  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    replyToId?: string
  ) => {
    try {
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
      return data.message;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }, [getToken]);

  const reactToMessage = useCallback(async (messageId: string, emoji: string) => {
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
      return data.reaction;
    } catch (error) {
      console.error('❌ Error reacting to message:', error);
      throw error;
    }
  }, [getToken]);

  const pollMessages = useCallback(async (
    conversationId: string,
    messages: Message[]
  ) => {
    try {
      const response = await fetch(
        `/api/messages?conversation_id=${conversationId}&limit=1&after=${messages[messages.length - 1]?.created_at || ''}`
      );
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Polling error:', error);
      return [];
    }
  }, []);

  return {
    loadConversationsFromAPI,
    loadMessagesFromAPI,
    sendMessage,
    reactToMessage,
    pollMessages
  };
};