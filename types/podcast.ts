// types/podcast.ts
export interface PodcastSession {
  id: string;
  title: string;
  description?: string;
  userId: string; // Clerk user ID as text
  username: string; // User's display name
  isLive: boolean;
  startTime: Date;
  endTime?: Date;
  duration: number;
  listeners: number;
  likes: number;
  comments: ChatMessage[];
  audioUrl?: string;
  thumbnailUrl?: string;
  status: 'draft' | 'live' | 'ended' | 'published';
  youtubeId?: string;
}

export type SessionCallbacks = {
  onMessage?: (message: ChatMessage) => void;
  onListenerUpdate?: (count: number) => void;
  onLike?: () => void;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string; // Clerk user ID as text
  username: string; // User's display name
  message: string;
  timestamp: Date;
  isHost?: boolean;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  description?: string;
  userId: string; // Clerk user ID as text
  username: string; // User's display name
  audioUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  fileSize: number;
  waveformData?: number[];
  tags: string[];
  isPublic: boolean;
  playCount: number;
  likeCount: number;
  status: 'draft' | 'processing' | 'published' | 'archived';
  scheduledFor?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LiveAnalytics {
  currentListeners: number;
  peakListeners: number;
  totalLikes: number;
  totalComments: number;
  avgWatchTime: number;
  countries: string[];
  deviceTypes: { mobile: number; desktop: number; tablet: number };
}

export interface PodcastUpload {
  file: File;
  title: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  scheduledFor?: Date;
}