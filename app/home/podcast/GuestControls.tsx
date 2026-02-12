"use client";

import { useState, useCallback } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Mic, MicOff, AlertCircle } from "lucide-react";

interface GuestControlsProps {
  title?: string;
  tip?: string;
  onMuteChange?: (muted: boolean) => void;
  onVolumeChange?: (volume: number) => void;
  className?: string;
}

export default function GuestControls({
  title = "Guest Microphone",
  tip = "You're now a guest speaker! Click the microphone button to go live.",
  onMuteChange,
  onVolumeChange,
  className = "",
}: GuestControlsProps) {
  const { localParticipant } = useLocalParticipant();

  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1.0);

  const toggleMic = useCallback(async () => {
    if (!localParticipant) return;

    const newMutedState = !isMuted;
    
    try {
      // setMicrophoneEnabled only exists on LocalParticipant
      await localParticipant.setMicrophoneEnabled(!newMutedState);
      setIsMuted(newMutedState);
      onMuteChange?.(newMutedState);
    } catch (error) {
      console.error("Failed to toggle microphone:", error);
    }
  }, [localParticipant, isMuted, onMuteChange]);

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      setVolume(newVolume);
      onVolumeChange?.(newVolume);

      // Adjust track volume if applicable
      if (localParticipant) {
        // Access audioTrackPublications (correct property name)
        const audioTrackPublication = Array.from(
          localParticipant.audioTrackPublications.values()
        )[0];
        
        if (audioTrackPublication?.track) {
          // You can access the track here if needed
          // Note: Input volume control is typically handled at the OS/browser level
          console.log("Audio track available:", audioTrackPublication.track);
        }
      }
    },
    [localParticipant, onVolumeChange]
  );

  if (!localParticipant) {
    return (
      <div className={`border border-black dark:border-white rounded-3xl p-6 bg-gray-50 dark:bg-gray-900/20 ${className}`}>
        <div className="text-center py-4">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connecting to audio...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border border-black dark:border-white rounded-3xl p-6 bg-green-50 dark:bg-green-900/20 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-black dark:text-white flex items-center">
          <Mic className="w-5 h-5 mr-3" />
          {title}
        </h3>
        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
          🎤 You can speak!
        </span>
      </div>

      <div className="space-y-6">
        {/* Mic Toggle */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-black dark:text-white">
              Microphone
            </label>
            <span className="text-sm text-black dark:text-white opacity-60">
              {isMuted ? "Muted" : "Live"}
            </span>
          </div>

          <button
            onClick={toggleMic}
            className={`w-full p-4 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 ${
              isMuted
                ? "bg-red-500 text-white shadow-lg"
                : "bg-green-500 text-white shadow-lg"
            }`}
            type="button"
          >
            {isMuted ? (
              <>
                <MicOff className="w-5 h-5" />
                <span>Unmute to Speak</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span>You&apos;re Live!</span>
              </>
            )}
          </button>
        </div>

        {/* Volume Control */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-black dark:text-white">
              Input Volume
            </label>
            <span className="text-sm text-black dark:text-white opacity-60">
              {Math.round(volume * 100)}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-black dark:bg-white bg-opacity-10 dark:bg-opacity-10 rounded-full appearance-none cursor-pointer slider"
          />
          <style jsx>{`
            .slider::-webkit-slider-thumb {
              appearance: none;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #10b981;
              cursor: pointer;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .slider::-moz-range-thumb {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #10b981;
              cursor: pointer;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
          `}</style>
        </div>

        {/* Tip */}
        <div className="border border-green-500 border-opacity-30 rounded-2xl p-4 bg-green-500 bg-opacity-5">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-black dark:text-white mb-1">
                Guest Tip
              </div>
              <div className="text-xs text-black dark:text-white opacity-60">
                {tip}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}