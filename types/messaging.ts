// types/messaging.ts

// ---------------------------
// User-related Interfaces
// ---------------------------
export interface User {
  id: string;
  username: string;
  imageUrl?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface SendMessageRequest {
  conversation_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'file';
  reply_to_id?: string;
  metadata?: Record<string, any>;
}

// ---------------------------
// Conversation Request Types
// ---------------------------
export interface CreateConversationRequest {
  participant_ids: string[];
  type?: 'direct' | 'group';
  name?: string;
  description?: string;
  image_url?: string;
}

// ---------------------------
// Messaging & Reactions
// ---------------------------
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: "text" | "image" | "file" | "system";
  reply_to_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  sender?: User;
  reply_to?: Message | null;
  reactions?: MessageReaction[];
  isRead?: boolean;
  read_by?: string[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: User;
}

export interface MessageFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

// ---------------------------
// Conversations & Participants
// ---------------------------
export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_at?: string;
  left_at?: string;
  user?: User;
}

export interface Conversation {
  id: string;
  name?: string;
  description?: string;
  type: 'direct' | 'group';
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  image_url?: string;
  participants: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
  typingUsers?: TypingUser[];
}

// ---------------------------
// API Response Types
// ---------------------------
export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface CreateConversationResponse {
  conversation_id: string;
  message: string;
}

// ---------------------------
// Utility Interfaces
// ---------------------------
export interface TypingUser {
  userId: string;
  username: string;
  timestamp: number;
}

export interface EmojiData {
  emoji: string;
  name: string;
  category: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  sound_enabled: boolean;
  conversation_notifications: Record<string, boolean>;
}