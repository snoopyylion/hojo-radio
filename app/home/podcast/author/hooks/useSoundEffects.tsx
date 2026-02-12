// app/home/podcast/author/hooks/useSoundEffects.ts
import { useState, useRef, useCallback, useEffect } from 'react';

export interface SoundEffect {
  id: string;
  title: string;
  url: string;
  category?: string;
  duration?: number;
  author_id?: string;
  tags?: string[];
  file_size?: number;
  created_at?: string;
  updated_at?: string;
  isOwned?: boolean;
}

export interface UseSoundEffectsReturn {
  effects: SoundEffect[];
  userEffects: SoundEffect[];
  loading: boolean;
  error: string | null;
  playSound: (effectId: string) => Promise<void>;
  stopSound: (effectId: string) => void;
  stopAllSounds: () => void;
  isPlaying: (effectId: string) => boolean;
  volume: number;
  setVolume: (volume: number) => void;
  refetch: () => Promise<void>;
  activeEffects: string[];
}

export interface SoundEffectsOptions {
  playEffect?: (effectId: string, url: string, volume: number) => Promise<void>;
  stopEffect?: (effectId: string) => void;
  stopAllEffects?: () => void;
}

export function useSoundEffects(options?: SoundEffectsOptions): UseSoundEffectsReturn {
  const [effects, setEffects] = useState<SoundEffect[]>([]);
  const [userEffects, setUserEffects] = useState<SoundEffect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(75);
  
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const playingSounds = useRef<Set<string>>(new Set());
  const [activeEffects, setActiveEffects] = useState<string[]>([]);

  // Fetch all sound effects
  const fetchAllSoundEffects = useCallback(async () => {
    try {
      console.log('Fetching all sound effects...');
      const response = await fetch('/api/podcast/sound-effects');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, response.statusText, errorData);
        throw new Error(`Failed to fetch sound effects: ${response.statusText}${errorData.details ? ` - ${errorData.details}` : ''}`);
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.success) {
        console.log(`Successfully fetched ${result.data?.length || 0} sound effects`);
        setEffects(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch sound effects');
      }
    } catch (err) {
      console.error('Error fetching sound effects:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sound effects');
    }
  }, []);

  // Fetch user's sound effects
  const fetchUserSoundEffects = useCallback(async () => {
    try {
      console.log('Fetching user sound effects...');
      const response = await fetch('/api/podcast/sound-effects/my');
      
      if (!response.ok) {
        // If unauthorized, just set empty array (user not logged in)
        if (response.status === 401) {
          console.log('User not authenticated, skipping user effects');
          setUserEffects([]);
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error('User API Error:', response.status, response.statusText, errorData);
        throw new Error(`Failed to fetch user sound effects: ${response.statusText}${errorData.details ? ` - ${errorData.details}` : ''}`);
      }
      
      const result = await response.json();
      console.log('User API Response:', result);
      
      if (result.success) {
        console.log(`Successfully fetched ${result.data?.length || 0} user sound effects`);
        setUserEffects(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch user sound effects');
      }
    } catch (err) {
      console.error('Error fetching user sound effects:', err);
      // Don't set error for user effects as it's optional
      setUserEffects([]);
    }
  }, []);

  // Refetch all data
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchAllSoundEffects(),
        fetchUserSoundEffects(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchAllSoundEffects, fetchUserSoundEffects]);

  // Initial data fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllSounds();
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, []);

  const markEffectStart = useCallback((effectId: string) => {
    playingSounds.current.add(effectId);
    setActiveEffects(prev => (prev.includes(effectId) ? prev : [...prev, effectId]));
  }, []);

  const markEffectEnd = useCallback((effectId: string) => {
    playingSounds.current.delete(effectId);
    setActiveEffects(prev => prev.filter(id => id !== effectId));
  }, []);

  const getOrCreateAudio = useCallback((effect: SoundEffect): HTMLAudioElement => {
    if (audioRefs.current.has(effect.id)) {
      return audioRefs.current.get(effect.id)!;
    }

    const audio = new Audio(effect.url);
    audio.volume = volume / 100;
    audio.preload = 'auto';
    
    audio.addEventListener('ended', () => {
      markEffectEnd(effect.id);
    });

    audio.addEventListener('error', (e) => {
      console.error(`Failed to load sound effect: ${effect.title}`, e);
      markEffectEnd(effect.id);
    });

    audioRefs.current.set(effect.id, audio);
    return audio;
  }, [volume, markEffectEnd]);

  const playSound = useCallback(async (effectId: string) => {
    // Find effect in either effects or userEffects
    const effect = effects.find(e => e.id === effectId) || 
                  userEffects.find(e => e.id === effectId);
                  
    if (!effect) {
      console.warn(`Sound effect with ID ${effectId} not found`);
      return;
    }

    if (options?.playEffect) {
      markEffectStart(effectId);
      try {
        await options.playEffect(effectId, effect.url, volume / 100);
      } catch (error) {
        console.error('Error broadcasting sound effect:', error);
      } finally {
        markEffectEnd(effectId);
      }
      return;
    }

    try {
      const audio = getOrCreateAudio(effect);

      if (playingSounds.current.has(effectId)) {
        audio.pause();
        audio.currentTime = 0;
        markEffectEnd(effectId);
      }

      markEffectStart(effectId);

      audio.volume = volume / 100;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch(error => {
          console.error('Error playing sound effect:', error);
          markEffectEnd(effectId);
        });
      }
    } catch (error) {
      console.error('Error playing sound effect:', error);
      markEffectEnd(effectId);
    }
  }, [effects, userEffects, volume, getOrCreateAudio, options, markEffectStart, markEffectEnd]);

  const stopSound = useCallback((effectId: string) => {
    options?.stopEffect?.(effectId);
    const audio = audioRefs.current.get(effectId);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    markEffectEnd(effectId);
  }, [options, markEffectEnd]);

  const stopAllSounds = useCallback(() => {
    options?.stopAllEffects?.();
    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });

    const active = Array.from(playingSounds.current);
    active.forEach(markEffectEnd);
  }, [options, markEffectEnd]);

  const isPlaying = useCallback((effectId: string): boolean => {
    return playingSounds.current.has(effectId);
  }, []);

  // Update volume for all audio elements
  useEffect(() => {
    audioRefs.current.forEach(audio => {
      audio.volume = volume / 100;
    });
  }, [volume]);

  return {
    effects,
    userEffects,
    loading,
    error,
    playSound,
    stopSound,
    stopAllSounds,
    isPlaying,
    volume,
    setVolume,
    refetch,
    activeEffects,
  };
}