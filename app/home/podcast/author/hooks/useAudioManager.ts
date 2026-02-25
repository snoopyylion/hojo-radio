// app/home/podcast/author/hooks/useAudioManager.ts
import { useState, useRef, useEffect, useCallback } from "react";
import { PodcastAudioManager } from "../services/PodcastAudioManager";
import { useLocalParticipant, useMaybeRoomContext } from "@livekit/components-react";
import { Track, LocalAudioTrack, createLocalAudioTrack } from "livekit-client";

export function useAudioManager() {
  const audioManagerRef = useRef<PodcastAudioManager | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<{id: string; name: string; isPlaying: boolean}[]>([]);
  const [publishedAudioTrack, setPublishedAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [playlistIndex, setPlaylistIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioVolume, setAudioVolume] = useState(0.7);

  // Refs to avoid stale closures in callbacks
  const tracksRef = useRef<{id: string; name: string; isPlaying: boolean}[]>([]);
  const playlistIndexRef = useRef<number>(0);
  const audioVolumeRef = useRef<number>(0.7);
  const autoplayEnabledRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);

  const { localParticipant } = useLocalParticipant();
  const room = useMaybeRoomContext();

  // Keep refs in sync
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { playlistIndexRef.current = playlistIndex; }, [playlistIndex]);
  useEffect(() => { audioVolumeRef.current = audioVolume; }, [audioVolume]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Initialize audio manager AND register the ended callback
  useEffect(() => {
    audioManagerRef.current = new PodcastAudioManager();

    // Register track ended callback — uses refs so never stale
    audioManagerRef.current.setOnTrackEnded((endedTrackId: string) => {
      console.log('🎵 Hook received track ended:', endedTrackId, '| autoplay:', autoplayEnabledRef.current);
      
      setIsPlaying(false);
      setCurrentTrackId(null);
      
      if (!autoplayEnabledRef.current) return;

      const currentTracks = tracksRef.current;
      const currentIndex = playlistIndexRef.current;

      if (currentTracks.length === 0) return;

      const nextIndex = currentIndex + 1;

      if (nextIndex < currentTracks.length) {
        const nextTrack = currentTracks[nextIndex];
        console.log('▶️ Autoplay: playing next track', nextTrack.name);
        
        // Small delay so React state settles before next play
        setTimeout(() => {
          playTrackInternal(nextTrack.id, nextIndex);
        }, 300);
      } else {
        console.log('🏁 Autoplay: end of playlist');
      }
    });

    return () => {
      audioManagerRef.current?.cleanup();
    };
  }, []); // Empty deps — callback uses refs only, never goes stale

  // Internal play — used by autoplay and public playTrack
  const playTrackInternal = useCallback(async (trackId: string, index: number) => {
    if (!audioManagerRef.current || !localParticipant) return;

    try {
      await audioManagerRef.current.playTrack(trackId, audioVolumeRef.current);
      setCurrentTrackId(trackId);
      setIsPlaying(true);
      setPlaylistIndex(index);
      // Update tracks list to reflect new isPlaying state
      setTracks(audioManagerRef.current.getAllTracks());
      await publishAudioTrack();
    } catch (error) {
      console.error('Failed to play track:', error);
    }
  }, [localParticipant]);

  const addTrack = async (file: File): Promise<string | undefined> => {
    if (!audioManagerRef.current) return;
    const trackId = await audioManagerRef.current.addTrack(file);
    setTracks(audioManagerRef.current.getAllTracks());
    return trackId;
  };

  const playTrack = async (trackId: string) => {
    if (!audioManagerRef.current || !room || !localParticipant) return;
    const index = tracksRef.current.findIndex(t => t.id === trackId);
    await playTrackInternal(trackId, index !== -1 ? index : 0);
  };

  const playNextTrack = useCallback(async () => {
    const currentTracks = tracksRef.current;
    const nextIndex = playlistIndexRef.current + 1;
    if (nextIndex < currentTracks.length) {
      await playTrackInternal(currentTracks[nextIndex].id, nextIndex);
    }
  }, [playTrackInternal]);

  const playPreviousTrack = useCallback(async () => {
    const currentTracks = tracksRef.current;
    const prevIndex = Math.max(0, playlistIndexRef.current - 1);
    await playTrackInternal(currentTracks[prevIndex].id, prevIndex);
  }, [playTrackInternal]);

  const stopMusic = async () => {
    const id = currentTrackId;
    if (id && audioManagerRef.current) {
      await audioManagerRef.current.stopTrack(id);
      setCurrentTrackId(null);
      setIsPlaying(false);
      setTracks(audioManagerRef.current.getAllTracks());
    }
    if (publishedAudioTrack && localParticipant) {
      try {
        await localParticipant.unpublishTrack(publishedAudioTrack);
        setPublishedAudioTrack(null);
      } catch (error) {
        console.error("Error unpublishing track:", error);
      }
    }
  };

  const pauseMusic = async () => {
    const id = currentTrackId;
    if (id && audioManagerRef.current) {
      await audioManagerRef.current.pauseTrack(id);
      setIsPlaying(false);
      setTracks(audioManagerRef.current.getAllTracks());
    }
  };

  const resumeMusic = async () => {
    const id = currentTrackId;
    if (id && audioManagerRef.current) {
      await audioManagerRef.current.resumeTrack(id);
      setIsPlaying(true);
      setTracks(audioManagerRef.current.getAllTracks());
    }
  };

  const publishAudioTrack = useCallback(async () => {
    if (!audioManagerRef.current || !localParticipant) return;
    try {
      const audioStream = audioManagerRef.current.getOutputStream();
      const audioTracks = audioStream.getAudioTracks();
      if (audioTracks.length > 0) {
        try {
          const newAudioTrack = new LocalAudioTrack(audioTracks[0]);
          await localParticipant.publishTrack(newAudioTrack, {
            name: "background-music",
            source: Track.Source.Unknown,
          });
          setPublishedAudioTrack(newAudioTrack);
          return;
        } catch (publishError) {
          console.warn("Failed to publish via Web Audio API:", publishError);
        }
      }
    } catch (webAudioError) {
      console.warn("Web Audio API approach failed:", webAudioError);
    }
    try {
      const micTrack = await createLocalAudioTrack({ deviceId: "default" });
      await localParticipant.publishTrack(micTrack, {
        name: "background-music",
        source: Track.Source.Unknown,
      });
      setPublishedAudioTrack(micTrack);
    } catch (micError) {
      console.error("All publishing strategies failed:", micError);
    }
  }, [localParticipant]);

  const setTrackVolume = (volume: number) => {
    setAudioVolume(volume);
    if (currentTrackId && audioManagerRef.current) {
      audioManagerRef.current.setTrackVolume(currentTrackId, volume);
    }
  };

  // Expose this so AudioControls can sync autoplay into the ref
  const setAutoplay = useCallback((enabled: boolean) => {
    autoplayEnabledRef.current = enabled;
    console.log('🔄 Autoplay ref updated to:', enabled);
  }, []);

  const playSoundEffect = useCallback(async (effectId: string, url: string, volume: number) => {
    if (!audioManagerRef.current || !localParticipant) return;
    await publishAudioTrack();
    return audioManagerRef.current.playEffect(effectId, url, volume);
  }, [localParticipant, publishAudioTrack]);

  const stopSoundEffect = useCallback((effectId: string) => {
    audioManagerRef.current?.stopEffect(effectId);
  }, []);

  const stopAllSoundEffects = useCallback(() => {
    audioManagerRef.current?.stopAllEffects();
  }, []);

  return {
    tracks,
    currentTrackId,
    isPlaying,
    audioVolume,
    publishedAudioTrack,
    playlistIndex,
    addTrack,
    playTrack,
    playNextTrack,
    playPreviousTrack,
    stopMusic,
    pauseMusic,
    resumeMusic,
    setTrackVolume,
    setAutoplay,          // ← expose this
    playSoundEffect,
    stopSoundEffect,
    stopAllSoundEffects,
  };
}