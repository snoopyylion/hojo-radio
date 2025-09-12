// types/podcast.ts

export interface User {
  id: string;
  name: string;
  role: 'author' | 'listener';
}

export interface LiveSession {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  description?: string;
  roomName: string;
  startedAt: string;
  listenerCount: number;
  isActive: boolean;
}

export interface DatabaseLiveSession {
  id: string;
  author_id: string;
  author_name: string;
  title: string;
  description?: string;
  room_name: string;
  started_at: string;
  listener_count: number;
  is_active: boolean;
}

/**
 * Generic Supabase realtime payload type.
 */
export interface SupabaseRealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  errors?: string[];
}

/**
 * Frontend ChatMessage type (used in RealtimeService)
 */
export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  isHost: boolean;
}

/**
 * Callbacks for podcast session events
 */
export interface SessionCallbacks {
  onMessage?: (message: ChatMessage) => void;
  onListenerUpdate?: (count: number) => void;
  onLike?: () => void;
}
