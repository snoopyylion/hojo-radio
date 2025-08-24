// lib/supabase-helpers.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Define the ChatMessage type based on your chat_messages table structure
export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  username: string;
  message: string;
  is_host: boolean;
  created_at: string;
}

export class PodcastDatabase {
  
  // Create a new podcast session
  static async createPodcastSession(data: {
    title: string;
    description?: string;
    userId: string;
    username: string;
    isLive?: boolean;
  }) {
    const { data: session, error } = await supabase
      .from('podcast_sessions')
      .insert([{
        title: data.title,
        description: data.description,
        user_id: data.userId,
        username: data.username,
        is_live: data.isLive || false,
        status: data.isLive ? 'live' : 'draft'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create podcast session');
    }

    return session;
  }

  // Update session status (live, ended, etc.)
  static async updateSessionStatus(sessionId: string, status: string, endTime?: Date) {
    const updateData: Record<string, unknown> = { 
      status,
      updated_at: new Date().toISOString()
    };
    
    if (endTime) {
      updateData.end_time = endTime.toISOString();
      updateData.is_live = false;
    }

    const { error } = await supabase
      .from('podcast_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating session:', error);
      throw new Error('Failed to update session status');
    }
  }

  // Get live podcast sessions
  static async getLiveSessions() {
    const { data, error } = await supabase
      .from('podcast_sessions')
      .select('*')
      .eq('is_live', true)
      .eq('status', 'live')
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching live sessions:', error);
      return [];
    }

    return data;
  }

  // Get user's podcast sessions
  static async getUserSessions(userId: string) {
    const { data, error } = await supabase
      .from('podcast_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }

    return data;
  }

  // Save chat message
  static async saveChatMessage(data: {
    sessionId: string;
    userId: string;
    username: string;
    message: string;
    isHost?: boolean;
  }) {
    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert([{
        session_id: data.sessionId,
        user_id: data.userId,
        username: data.username,
        message: data.message,
        is_host: data.isHost || false
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving message:', error);
      throw new Error('Failed to save chat message');
    }

    return message;
  }

  // Get chat messages for a session
  static async getChatMessages(sessionId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return data;
  }

  // Create podcast episode (for recorded content)
  static async createPodcastEpisode(data: {
    title: string;
    description?: string;
    userId: string;
    username: string;
    audioUrl?: string;
    duration?: number;
    tags?: string[];
    isPublic?: boolean;
  }) {
    const { data: episode, error } = await supabase
      .from('podcast_episodes')
      .insert([{
        title: data.title,
        description: data.description,
        user_id: data.userId,
        username: data.username,
        audio_url: data.audioUrl,
        duration: data.duration || 0,
        tags: data.tags || [],
        is_public: data.isPublic !== false,
        status: data.audioUrl ? 'published' : 'draft'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating episode:', error);
      throw new Error('Failed to create podcast episode');
    }

    return episode;
  }

  // Get published podcast episodes
  static async getPublishedEpisodes(limit: number = 20) {
    const { data, error } = await supabase
      .from('podcast_episodes')
      .select('*')
      .eq('status', 'published')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching episodes:', error);
      return [];
    }

    return data;
  }

  // Add/remove like for session
  static async toggleSessionLike(sessionId: string, userId: string) {
    // Check if like exists
    const { data: existingLike } = await supabase
      .from('podcast_likes')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Remove like
      const { error } = await supabase
        .from('podcast_likes')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (!error) {
        // Decrement session likes
        await supabase.rpc('decrement_session_likes', { session_id: sessionId });
      }
      
      return false; // Unliked
    } else {
      // Add like
      const { error } = await supabase
        .from('podcast_likes')
        .insert([{
          session_id: sessionId,
          user_id: userId
        }]);

      if (!error) {
        // Increment session likes  
        await supabase.rpc('increment_session_likes', { session_id: sessionId });
      }
      
      return true; // Liked
    }
  }

  // Update listener count
  static async updateListenerCount(sessionId: string, count: number) {
    const { error } = await supabase
      .from('podcast_sessions')
      .update({ 
        listeners: count,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating listener count:', error);
    }
  }

  // Get user podcast statistics
  static async getUserStats(userId: string) {
    const { data, error } = await supabase
      .from('user_podcast_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') { // Not found error
      console.error('Error fetching user stats:', error);
      return null;
    }

    return data;
  }

  // Subscribe to real-time changes for a session
  static subscribeToSession(sessionId: string, callbacks: {
    onMessage?: (message: ChatMessage) => void;
    onListenerUpdate?: (count: number) => void;
    onLike?: () => void;
  }) {
    // Subscribe to chat messages
    const messagesSubscription = supabase
      .channel(`session_messages_${sessionId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (callbacks.onMessage) {
            callbacks.onMessage(payload.new as ChatMessage);
          }
        }
      )
      .subscribe();

    // Subscribe to session updates
    const sessionSubscription = supabase
      .channel(`session_updates_${sessionId}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'podcast_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          if (callbacks.onListenerUpdate && payload.new.listeners !== payload.old.listeners) {
            callbacks.onListenerUpdate(payload.new.listeners);
          }
        }
      )
      .subscribe();

    // Subscribe to likes
    const likesSubscription = supabase
      .channel(`session_likes_${sessionId}`)
      .on('postgres_changes',
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

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(messagesSubscription);
      supabase.removeChannel(sessionSubscription);
      supabase.removeChannel(likesSubscription);
    };
  }
}