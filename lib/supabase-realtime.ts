// lib/supabase-realtime.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class RealtimeService {
  async joinPodcastSession(sessionId: string) {
    // Subscribe to real-time updates for this session
    supabase
      .channel(`podcast_${sessionId}`)
      .on('broadcast', { event: 'message' }, (payload) => {
        // Handle incoming chat messages
        console.log('New message:', payload);
      })
      .on('broadcast', { event: 'listener_count' }, (payload) => {
        // Handle listener count updates
        console.log('Listeners:', payload.count);
      });
    // You can now use `channel` for further actions if needed
  }
  
  async updateListenerCount(sessionId: string, count: number) {
    // Update session in database
    await supabase
      .from('podcast_sessions')
      .update({ listeners: count })
      .eq('id', sessionId);

    // Broadcast real-time update
    const channel = supabase.channel(`podcast_${sessionId}`);
    await channel.send({
      type: 'broadcast',
      event: 'listener_count',
      payload: { count }
    });
  }
  
  async sendLike(sessionId: string, userId: string, username: string) {
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

      // Broadcast real-time update
      const channel = supabase.channel(`podcast_${sessionId}`);
      await channel.send({
        type: 'broadcast',
        event: 'like',
        payload: { userId, username, timestamp: new Date().toISOString() }
      });
    }
  }
  
  leavePodcastSession(channel: import('@supabase/supabase-js').RealtimeChannel) {
    supabase.removeChannel(channel);
  }

  async sendChatMessage(
    sessionId: string,
    message: string,
    userId: string,
    username: string
  ) {
    // Store chat message in database
    await supabase
      .from('podcast_messages')
      .insert([
        {
          session_id: sessionId,
          user_id: userId,
          username: username,
          message: message,
          created_at: new Date().toISOString()
        }
      ]);

    // Broadcast real-time update
    const channel = supabase.channel(`podcast_${sessionId}`);
    await channel.send({
      type: 'broadcast',
      event: 'message',
      payload: {
        userId,
        username,
        message,
        timestamp: new Date().toISOString()
      }
    });
  }
}

import { useUser } from '@clerk/nextjs';

// Hook for using realtime service with Clerk
export const useRealtimeService = () => {
  const { user } = useUser();
  
  return {
    joinSession: (sessionId: string) => {
      if (!user) return null;
      const service = new RealtimeService();
      return service.joinPodcastSession(
        sessionId
      );
    },
    sendMessage: async (sessionId: string, message: string) => {
      if (!user) return;
      const service = new RealtimeService();
      await service.sendChatMessage(
        sessionId, 
        message, 
        user.id, 
        user.firstName || user.username || 'Anonymous'
      );
    },
    sendLike: async (sessionId: string) => {
      if (!user) return;
      const service = new RealtimeService();
      await service.sendLike(
        sessionId, 
        user.id, 
        user.firstName || user.username || 'Anonymous'
      );
    }
  };
};
