// app/home/podcast/author/types/audio.ts - TYPES
export interface NetworkQualityStats {
  quality: 'excellent' | 'good' | 'medium' | 'poor' | 'offline';
  latency: number;
  jitter: number;
  packetLoss: number;
  bandwidth: number;
}

export interface AudioTrack {
  id: number;
  name: string;
  volume: number;
  muted: boolean;
  type: 'mic' | 'music' | 'sfx';
}