// lib/supabase-realtime.ts
import { createClient } from '@supabase/supabase-js';
import { YouTubeLiveService } from './youtube-live';
import { useUser } from '@clerk/nextjs';
import { ChatMessage, SessionCallbacks } from '@/types/podcast';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Database ChatMessage interface (matching your Supabase schema)
interface DatabaseChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
  is_host?: boolean;
}

// YouTube Chat Message interface
interface YouTubeChatMessage {
  id: string;
  snippet?: {
    type: string;
    publishedAt: string;
    textMessageDetails?: {
      messageText: string;
    };
  };
  authorDetails?: {
    displayName: string;
  };
}

// YouTube Chat Response interface
interface YouTubeChatResponse {
  messages: YouTubeChatMessage[];
  nextPageToken?: string | null;
  pollingIntervalMillis: number;
}

export class RealtimeService {
  private youtubeService?: YouTubeLiveService;
  private youtubeChatInterval?: NodeJS.Timeout;

  constructor(youtubeAccessToken?: string) {
    if (youtubeAccessToken) {
      this.youtubeService = new YouTubeLiveService(youtubeAccessToken);
    }
  }

  // Convert database message to frontend ChatMessage format
  private convertDatabaseMessage(dbMessage: DatabaseChatMessage): ChatMessage {
    return {
      id: dbMessage.id,
      sessionId: dbMessage.session_id,
      userId: dbMessage.user_id,
      username: dbMessage.username,
      message: dbMessage.message,
      timestamp: new Date(dbMessage.created_at),
      isHost: dbMessage.is_host || false
    };
  }

  async joinPodcastSession(sessionId: string, callbacks: SessionCallbacks) {
    // Subscribe to Supabase real-time updates
    const channel = supabase
      .channel(`podcast_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (callbacks.onMessage) {
            // Convert database message format to frontend ChatMessage format
            const dbMessage = payload.new as DatabaseChatMessage;
            const frontendMessage = this.convertDatabaseMessage(dbMessage);
            callbacks.onMessage(frontendMessage);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'podcast_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const newData = payload.new as { listeners: number };
          const oldData = payload.old as { listeners: number };
          
          if (callbacks.onListenerUpdate && newData.listeners !== oldData.listeners) {
            callbacks.onListenerUpdate(newData.listeners);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'podcast_likes',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          if (callbacks.onLike) {
            callbacks.onLike();
          }
        }
      )
      .subscribe();

    return channel;
  }

  // Start polling YouTube Live Chat
  async startYouTubeChatPolling(liveChatId: string, onYouTubeMessage: (message: ChatMessage) => void) {
    if (!this.youtubeService || !liveChatId) return;

    let nextPageToken: string | undefined;
    
    const pollMessages = async () => {
      try {
        const chatData = await this.youtubeService!.getChatMessages(liveChatId, nextPageToken) as YouTubeChatResponse;
        
        // Process new messages
        chatData.messages.forEach((message: YouTubeChatMessage) => {
          if (message.snippet?.type === 'textMessageEvent') {
            const chatMessage: ChatMessage = {
              id: message.id,
              sessionId: liveChatId, // Using liveChatId as sessionId for YouTube messages
              userId: `youtube_${message.authorDetails?.displayName || 'anonymous'}`,
              username: message.authorDetails?.displayName || 'Anonymous',
              message: message.snippet.textMessageDetails?.messageText || '',
              timestamp: new Date(message.snippet.publishedAt),
              isHost: false
            };
            onYouTubeMessage(chatMessage);
          }
        });

        // Handle null nextPageToken
        nextPageToken = chatData.nextPageToken || undefined;
        
        // Schedule next poll
        this.youtubeChatInterval = setTimeout(pollMessages, chatData.pollingIntervalMillis);
      } catch (error) {
        console.error('YouTube chat polling error:', error);
        // Retry after 10 seconds
        this.youtubeChatInterval = setTimeout(pollMessages, 10000);
      }
    };

    // Start polling
    pollMessages();
  }

  stopYouTubeChatPolling() {
    if (this.youtubeChatInterval) {
      clearTimeout(this.youtubeChatInterval);
      this.youtubeChatInterval = undefined;
    }
  }

  async updateListenerCount(sessionId: string, count: number) {
    // Update session in database
    await supabase
      .from('podcast_sessions')
      .update({ listeners: count, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  async sendLike(sessionId: string, userId: string) {
    // Store like in database
    const { error } = await supabase
      .from('podcast_likes')
      .upsert([{
        session_id: sessionId,
        user_id: userId
      }], { onConflict: 'user_id,session_id' });

    if (!error) {
      // Update session like count
      await supabase.rpc('increment_session_likes', { session_id: sessionId });
    }
  }

  leavePodcastSession(channel: import('@supabase/supabase-js').RealtimeChannel) {
    supabase.removeChannel(channel);
    this.stopYouTubeChatPolling();
  }

  async sendChatMessage(
    sessionId: string,
    message: string,
    userId: string,
    username: string
  ) {
    // Store chat message in database
    await supabase
      .from('chat_messages')
      .insert([{
        session_id: sessionId,
        user_id: userId,
        username: username,
        message: message
      }]);
  }

  // Send message to YouTube Live Chat
  async sendYouTubeChatMessage(liveChatId: string, message: string) {
    if (!this.youtubeService) return false;
    
    return await this.youtubeService.sendChatMessage(liveChatId, message);
  }
}

// Hook for using realtime service with Clerk
export const useRealtimeService = (youtubeAccessToken?: string) => {
  const { user } = useUser();

  return {
    createService: () => new RealtimeService(youtubeAccessToken),
    
    joinSession: (sessionId: string, callbacks: SessionCallbacks) => {
      if (!user) return null;
      const service = new RealtimeService(youtubeAccessToken);
      return service.joinPodcastSession(sessionId, callbacks);
    },
    
    sendMessage: async (sessionId: string, message: string) => {
      if (!user) return;
      const service = new RealtimeService(youtubeAccessToken);
      await service.sendChatMessage(
        sessionId,
        message,
        user.id,
        user.firstName || user.username || 'Anonymous'
      );
    },
    
    sendLike: async (sessionId: string) => {
      if (!user) return;
      const service = new RealtimeService(youtubeAccessToken);
      await service.sendLike(sessionId, user.id);
    }
  };
};