// hooks/useTypingIndicator.ts
import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseTypingIndicatorProps {
  conversationId: string;
  isEnabled?: boolean;
}

export const useTypingIndicator = ({
  conversationId,
  isEnabled = true
}: UseTypingIndicatorProps) => {
  const { user } = useUser();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Fixed type
  const isTypingRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null); // Store channel reference

  
  // Initialize channel
  useEffect(() => {
    if (!user?.id || !isEnabled) return;

    channelRef.current = supabase.channel(`typing-${conversationId}`);
    channelRef.current.subscribe();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [conversationId, user?.id, isEnabled]);

  const sendTypingStatus = (isTyping: boolean) => {
    if (!user?.id || !isEnabled || !channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        conversation_id: conversationId,
        user_id: user.id,
        username: user.username || user.firstName || 'Unknown',
        is_typing: isTyping
      }
    });
  };

  const startTyping = () => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingStatus(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTypingStatus(false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null; // Set to null instead of undefined
    }
  };

  // Cleanup on unmount or conversation change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        sendTypingStatus(false);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [conversationId]);

  return {
    startTyping,
    stopTyping
  };
};