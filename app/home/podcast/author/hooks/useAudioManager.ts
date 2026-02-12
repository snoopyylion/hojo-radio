// app/home/podcast/author/hooks/useAudioManager.ts - AUDIO MANAGER HOOK
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

  const { localParticipant } = useLocalParticipant();
  const room = useMaybeRoomContext();

  // Initialize audio manager
  useEffect(() => {
    audioManagerRef.current = new PodcastAudioManager();
    
    return () => {
      audioManagerRef.current?.cleanup();
    };
  }, []);

  const addTrack = async (file: File): Promise<string | undefined> => {
    if (!audioManagerRef.current) return;
    
    const trackId = await audioManagerRef.current.addTrack(file);
    setTracks(audioManagerRef.current.getAllTracks());
    return trackId;
  };

  const playTrack = async (trackId: string) => {
    if (!audioManagerRef.current || !room || !localParticipant) return;
    
    try {
      await audioManagerRef.current.playTrack(trackId, audioVolume);
      setCurrentTrackId(trackId);
      setIsPlaying(true);
      
      await publishAudioTrack();
      setTracks(audioManagerRef.current.getAllTracks());
      
      const trackIndex = tracks.findIndex(t => t.id === trackId);
      if (trackIndex !== -1) {
        setPlaylistIndex(trackIndex);
      }
    } catch (error) {
      console.error('Failed to play track:', error);
    }
  };

  const playNextTrack = useCallback(async () => {
    if (!tracks.length) return;
    
    const nextIndex = (playlistIndex + 1) % tracks.length;
    setPlaylistIndex(nextIndex);
    
    if (tracks[nextIndex]) {
      await playTrack(tracks[nextIndex].id);
    }
  }, [tracks, playlistIndex, audioVolume, localParticipant, room]);

  const playPreviousTrack = async () => {
    if (!tracks.length) return;
    
    const prevIndex = (playlistIndex - 1 + tracks.length) % tracks.length;
    setPlaylistIndex(prevIndex);
    
    if (tracks[prevIndex]) {
      await playTrack(tracks[prevIndex].id);
    }
  };

  const stopMusic = async () => {
    if (currentTrackId && audioManagerRef.current) {
      await audioManagerRef.current.stopTrack(currentTrackId);
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
    if (currentTrackId && audioManagerRef.current) {
      await audioManagerRef.current.pauseTrack(currentTrackId);
      setIsPlaying(false);
      setTracks(audioManagerRef.current.getAllTracks());
    }
  };

  const resumeMusic = async () => {
    if (currentTrackId && audioManagerRef.current) {
      await audioManagerRef.current.resumeTrack(currentTrackId);
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
          console.log("Successfully published audio track");
          return;

        } catch (publishError) {
          console.warn("Failed to publish via Web Audio API:", publishError);
        }
      }
    } catch (webAudioError) {
      console.warn("Web Audio API approach failed:", webAudioError);
    }

    // Fallback strategy
    try {
      const micTrack = await createLocalAudioTrack({
        deviceId: "default",
      });

      await localParticipant.publishTrack(micTrack, {
        name: "background-music",
        source: Track.Source.Unknown,
      });

      setPublishedAudioTrack(micTrack);
      console.log("Successfully published using microphone track fallback");

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
    playSoundEffect,
    stopSoundEffect,
    stopAllSoundEffects,
  };
}