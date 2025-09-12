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
 * You can reuse this for other tables, not just live_sessions.
 */
export interface SupabaseRealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  errors?: string[];
}
