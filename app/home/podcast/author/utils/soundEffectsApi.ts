// app/home/podcast/author/utils/soundEffectsApi.ts
import { SoundEffect } from '../hooks/useSoundEffects';

interface SoundEffectResponse {
  success: boolean;
  data?: SoundEffect[];
  error?: string;
}

export class SoundEffectsAPI {
  /**
   * Fetch all sound effects from the database
   */
  static async fetchAllSoundEffects(): Promise<SoundEffect[]> {
    const response = await fetch('/api/podcast/sound-effects', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sound effects: ${response.statusText}`);
    }

    const result: SoundEffectResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch sound effects');
    }

    return result.data || [];
  }

  /**
   * Fetch sound effects uploaded by the current user
   */
  static async fetchUserSoundEffects(): Promise<SoundEffect[]> {
    const response = await fetch('/api/podcast/sound-effects/my', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Handle unauthorized (not logged in)
    if (response.status === 401) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch user sound effects: ${response.statusText}`);
    }

    const result: SoundEffectResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch user sound effects');
    }

    return result.data || [];
  }

  /**
   * Upload a new sound effect
   */
  static async uploadSoundEffect(data: {
    file: File;
    title: string;
    category?: string;
    tags?: string;
  }): Promise<{ success: boolean; file_url?: string; error?: string }> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('title', data.title);
    if (data.category) {
      formData.append('category', data.category);
    }
    if (data.tags) {
      formData.append('tags', data.tags);
    }

    const response = await fetch('/api/podcast/sound-effects/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Delete a sound effect (if you want to add this feature)
   */
  static async deleteSoundEffect(effectId: string): Promise<void> {
    const response = await fetch(`/api/podcast/sound-effects/${effectId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `Delete failed: ${response.statusText}`);
    }
  }
}

// Helper function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper function to format duration
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${seconds}s`;
}

// Helper function to validate audio file
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/m4a'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload MP3, WAV, OGG, or M4A files.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size too large. Please upload files smaller than 10MB.',
    };
  }

  return { valid: true };
}