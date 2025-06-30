// hooks/useSimplifiedMessageApi.ts
import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Message, Conversation } from '@/types/messaging';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export const useSimplifiedMessageApi = () => {
  const { getToken } = useAuth();

  // Generic API call helper
  const apiCall = useCallback(async <T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    try {
      // Get authentication token
      const token = await getToken();
      if (!token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      // Prepare request URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const url = `${baseUrl}/api${endpoint}`;
      
      console.log(`🔄 API Call: ${options.method || 'GET'} ${url}`);

      // Make the request
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        ...options,
      });

      // Handle response
      const status = response.status;
      
      if (!response.ok) {
        let errorMessage = `Request failed: ${status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        console.error(`❌ API Error ${status}:`, errorMessage);
        
        return {
          success: false,
          error: errorMessage,
          status
        };
      }

      // Parse successful response
      const data = await response.json();
      console.log(`✅ API Success:`, data);
      
      return { 
        success: true, 
        data,
        status 
      };
      
    } catch (error) {
      console.error('❌ Network error:', error);
      
      let errorMessage = 'Network error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more specific error messages for common issues
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
        } else if (error.message.includes('NetworkError')) {
          errorMessage = 'Network error. Please try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [getToken]);

  // Get conversation details
  const getConversation = useCallback(async (conversationId: string): Promise<ApiResponse<Conversation>> => {
    return apiCall<Conversation>(`/conversations/${conversationId}`);
  }, [apiCall]);

  // Get messages for a conversation - FIXED TO MATCH YOUR API
  const getMessages = useCallback(async (
    conversationId: string,
    limit: number = 50,
    before?: string
  ): Promise<ApiResponse<{ messages: Message[] }>> => {
    const params = new URLSearchParams();
    params.set('conversation_id', conversationId);
    params.set('limit', limit.toString());
    if (before) params.set('before', before);
    
    const query = params.toString();
    const endpoint = `/messages?${query}`;
    
    return apiCall<{ messages: Message[] }>(endpoint);
  }, [apiCall]);

  // Send a new message - FIXED TO MATCH YOUR API
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    type: 'text' | 'image' | 'file' = 'text',
    replyToId?: string
  ): Promise<ApiResponse<{ message: Message; success: boolean }>> => {
    if (!content.trim()) {
      return {
        success: false,
        error: 'Message content cannot be empty'
      };
    }

    const payload = {
      conversation_id: conversationId,
      content: content.trim(),
      message_type: type,
      ...(replyToId && { reply_to_id: replyToId })
    };

    return apiCall<{ message: Message; success: boolean }>(`/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }, [apiCall]);

  // Get all conversations for the current user
  const getConversations = useCallback(async (): Promise<ApiResponse<{ conversations: Conversation[] }>> => {
    return apiCall<{ conversations: Conversation[] }>('/conversations');
  }, [apiCall]);

  // Create a new conversation
  const createConversation = useCallback(async (
    participantIds: string[],
    name?: string
  ): Promise<ApiResponse<{ conversation_id: string; message: string }>> => {
    const payload = {
      participant_ids: participantIds,
      type: 'direct',
      ...(name && { name })
    };

    return apiCall<{ conversation_id: string; message: string }>('/conversations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }, [apiCall]);

  // Mark message as read - THIS ENDPOINT DOESN'T EXIST IN YOUR API
  const markMessageAsRead = useCallback(async (
    messageId: string
  ): Promise<ApiResponse<void>> => {
    console.warn('markMessageAsRead: This endpoint is not implemented in your API');
    return {
      success: false,
      error: 'Endpoint not implemented'
    };
  }, []);

  // React to a message - FIXED TO MATCH YOUR API
  const reactToMessage = useCallback(async (
    messageId: string,
    emoji: string
  ): Promise<ApiResponse<any>> => {
    return apiCall(`/message-reactions`, {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId, emoji }),
    });
  }, [apiCall]);

  // Delete a message - THIS ENDPOINT DOESN'T EXIST IN YOUR API
  const deleteMessage = useCallback(async (
    messageId: string
  ): Promise<ApiResponse<void>> => {
    console.warn('deleteMessage: This endpoint is not implemented in your API');
    return {
      success: false,
      error: 'Endpoint not implemented'
    };
  }, []);

  // Update a message - THIS ENDPOINT DOESN'T EXIST IN YOUR API
  const updateMessage = useCallback(async (
    messageId: string,
    content: string
  ): Promise<ApiResponse<Message>> => {
    console.warn('updateMessage: This endpoint is not implemented in your API');
    return {
      success: false,
      error: 'Endpoint not implemented'
    };
  }, []);

  return {
    // Core functions
    getConversation,
    getMessages,
    sendMessage,
    getConversations,
    createConversation,
    
    // Additional functions (some not implemented)
    markMessageAsRead,
    reactToMessage,
    deleteMessage,
    updateMessage,
    
    // Generic API caller for custom endpoints
    apiCall
  };
};