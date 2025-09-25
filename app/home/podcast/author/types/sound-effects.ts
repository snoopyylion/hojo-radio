// types/sound-effects.ts
export interface SoundEffect {
  id: string;
  author_id: string;
  title: string;
  file_url: string;
  duration?: number;
  file_size?: number;
  category?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface SoundEffectUploadRequest {
  file: File;
  title: string;
  category?: string;
  tags?: string[];
}

export interface SoundEffectResponse {
  success: boolean;
  data?: SoundEffect;
  error?: string;
}

export interface AudioManager {
  id: string;
  audio: HTMLAudioElement;
  isLoaded: boolean;
  isPlaying: boolean;
}