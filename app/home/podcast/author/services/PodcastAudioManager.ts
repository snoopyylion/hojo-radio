// app/home/podcast/author/services/PodcastAudioManager.ts - EXTRACTED AUDIO MANAGER

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export interface AudioTrackManager {
  id: string;
  file: File;
  audioElement: HTMLAudioElement;
  source: MediaElementAudioSourceNode | null;
  gainNode: GainNode | null;
  isPlaying: boolean;
}

export class PodcastAudioManager {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private destination: MediaStreamAudioDestinationNode;
  private tracks: Map<string, AudioTrackManager> = new Map();
  private currentlyPlaying: string | null = null;

  constructor() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass();
    this.masterGain = this.audioContext.createGain();
    this.destination = this.audioContext.createMediaStreamDestination();
    this.masterGain.connect(this.destination);
  }

  async addTrack(file: File): Promise<string> {
    const trackId = `track_${Date.now()}_${Math.random()}`;
    const audioUrl = URL.createObjectURL(file);
    
    const audioElement = new Audio(audioUrl);
    audioElement.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      audioElement.addEventListener('canplay', resolve, { once: true });
      audioElement.addEventListener('error', reject, { once: true });
      audioElement.load();
    });

    const trackManager: AudioTrackManager = {
      id: trackId,
      file,
      audioElement,
      source: null,
      gainNode: null,
      isPlaying: false
    };

    this.tracks.set(trackId, trackManager);
    return trackId;
  }

  async playTrack(trackId: string, volume: number = 0.7): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error('Track not found');

    if (this.currentlyPlaying && this.currentlyPlaying !== trackId) {
      await this.stopTrack(this.currentlyPlaying);
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (!track.source) {
        track.source = this.audioContext.createMediaElementSource(track.audioElement);
        track.gainNode = this.audioContext.createGain();
        
        track.source.connect(track.gainNode);
        track.gainNode.connect(this.masterGain);
      }

      if (track.gainNode) {
        track.gainNode.gain.value = volume;
      }
      
      track.audioElement.currentTime = 0;
      await track.audioElement.play();
      
      track.isPlaying = true;
      this.currentlyPlaying = trackId;

      const handleEnded = () => {
        track.isPlaying = false;
        if (this.currentlyPlaying === trackId) {
          this.currentlyPlaying = null;
        }
        track.audioElement.removeEventListener('ended', handleEnded);
      };
      
      track.audioElement.addEventListener('ended', handleEnded, { once: true });

    } catch (error) {
      console.error('Failed to play track:', error);
      throw error;
    }
  }

  async stopTrack(trackId: string): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track) return;

    track.audioElement.pause();
    track.audioElement.currentTime = 0;
    track.isPlaying = false;
    
    if (this.currentlyPlaying === trackId) {
      this.currentlyPlaying = null;
    }
  }

  async pauseTrack(trackId: string): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track || !track.isPlaying) return;

    track.audioElement.pause();
    track.isPlaying = false;
    
    if (this.currentlyPlaying === trackId) {
      this.currentlyPlaying = null;
    }
  }

  async resumeTrack(trackId: string): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track) return;

    await track.audioElement.play();
    track.isPlaying = true;
    this.currentlyPlaying = trackId;
  }

  setTrackVolume(trackId: string, volume: number): void {
    const track = this.tracks.get(trackId);
    if (!track?.gainNode) return;
    
    track.gainNode.gain.value = Math.max(0, Math.min(1, volume));
  }

  setMasterVolume(volume: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  getOutputStream(): MediaStream {
    return this.destination.stream;
  }

  getCurrentTrack(): string | null {
    return this.currentlyPlaying;
  }

  getTrackInfo(trackId: string): { name: string; isPlaying: boolean; duration: number } | null {
    const track = this.tracks.get(trackId);
    if (!track) return null;

    return {
      name: track.file.name,
      isPlaying: track.isPlaying,
      duration: track.audioElement.duration || 0
    };
  }

  getAllTracks(): { id: string; name: string; isPlaying: boolean }[] {
    return Array.from(this.tracks.values()).map(track => ({
      id: track.id,
      name: track.file.name,
      isPlaying: track.isPlaying
    }));
  }

  removeTrack(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track) return;

    if (track.isPlaying) {
      this.stopTrack(trackId);
    }

    if (track.source) {
      track.source.disconnect();
    }
    if (track.gainNode) {
      track.gainNode.disconnect();
    }

    URL.revokeObjectURL(track.audioElement.src);
    track.audioElement.remove();

    this.tracks.delete(trackId);
  }

  async cleanup(): Promise<void> {
    for (const [trackId] of this.tracks) {
      this.removeTrack(trackId);
    }
    
    if (this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
  }
}