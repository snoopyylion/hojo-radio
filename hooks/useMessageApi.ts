// hooks/useMessageApi.ts
import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Message } from '@/types/messaging';

export const useMessageApi = () => {
  const { getToken: getClerkToken } = useAuth();

  const getToken = useCallback(async () => {
    try {
      const token = await getClerkToken();
      return token || '';
    } catch (error) {
      console.error('Failed to get token:', error);
      return '';
    }
  }, [getClerkToken]);

  const loadConversationsFromAPI = useCallback(async () => {
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/conversations', { headers });
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

      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/messages?${params}`, { headers });
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
      console.log('🔄 Sending message:', { conversationId, content, messageType, replyToId });
      
      // Get token with fallback
      let token = '';
      try {
        token = await getToken();
        console.log('🔐 Token obtained:', token ? 'Yes' : 'No');
      } catch (tokenError) {
        console.warn('⚠️ Token error, trying without auth:', tokenError);
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Prepare request body
      const requestBody = {
        conversation_id: conversationId,
        content: content.trim(),
        message_type: messageType,
        ...(replyToId && { reply_to_id: replyToId })
      };

      console.log('📤 Request details:', {
        url: '/api/messages',
        method: 'POST',
        headers: Object.keys(headers),
        body: requestBody
      });

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use the text as is
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Message sent successfully:', data);
      return data.message;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
      } else if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Unknown error occurred while sending message');
      }
    }
  }, [getToken]);

  const reactToMessage = useCallback(async (messageId: string, emoji: string, currentUserReactions: string[] = []) => {
    try {
      const token = await getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // If the user already reacted with a different emoji, remove it first
      if (currentUserReactions.length > 0 && !currentUserReactions.includes(emoji)) {
        for (const oldEmoji of currentUserReactions) {
          await fetch('/api/message-reactions', {
            method: 'POST',
            headers,
            body: JSON.stringify({ message_id: messageId, emoji: oldEmoji })
          });
        }
      }
      // Now add/toggle the new reaction
      const response = await fetch('/api/message-reactions', {
        method: 'POST',
        headers,
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