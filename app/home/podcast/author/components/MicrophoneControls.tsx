// app/home/podcast/author/components/MicrophoneControls.tsx
import React, { useState } from 'react';
import { TrackToggle, useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, Radio } from 'lucide-react';

interface MicrophoneControlsProps {
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

export function MicrophoneControls({ connectionStatus }: MicrophoneControlsProps) {
  const { localParticipant } = useLocalParticipant();
  const [isMicEnabled, setIsMicEnabled] = useState(true);

  const toggleMicrophone = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicEnabled);
      setIsMicEnabled(!isMicEnabled);
    }
  };

  const statusConfig = {
    connected:    { dot: 'bg-emerald-500',    label: 'Connected',    ring: 'ring-emerald-500/20' },
    connecting:   { dot: 'bg-amber-500 animate-pulse', label: 'Connecting…', ring: 'ring-amber-500/20' },
    disconnected: { dot: 'bg-red-500',        label: 'Disconnected', ring: 'ring-red-500/20' },
  }[connectionStatus];

  return (
    <div className="
      border border-black/10 dark:border-white/10 
      rounded-2xl 
      p-4 sm:p-5 
      bg-white dark:bg-black
      min-w-0
    ">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-[#EF3866]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Radio className="w-4 h-4 text-[#EF3866]" />
          </div>
          <h3 className="font-sora font-semibold text-sm sm:text-base text-black dark:text-white truncate">
            Audio Control
          </h3>
        </div>

        {/* Connection status pill – stays compact */}
        <div className={`
          flex items-center gap-1.5 sm:gap-2 
          px-2.5 sm:px-3 py-1 
          rounded-full 
          border border-black/10 dark:border-white/10 
          ring-2 ${statusConfig.ring}
          text-xs sm:text-[11px]
          font-medium text-black dark:text-white
          whitespace-nowrap
        `}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Main controls area */}
      <div className="
        flex flex-col xs:flex-row 
        items-start xs:items-center 
        justify-between 
        gap-4 sm:gap-6
      ">
        {/* Left side – buttons */}
        <div className="
          flex flex-wrap items-center 
          gap-3 sm:gap-4
          w-full xs:w-auto
        ">
          {/* Primary mic toggle button */}
          <button
            onClick={toggleMicrophone}
            disabled={connectionStatus !== 'connected'}
            className={`
              flex items-center justify-center gap-2 
              px-5 sm:px-6 py-2.5 sm:py-3 
              rounded-xl 
              font-sora font-semibold 
              text-sm sm:text-base
              transition-all duration-200 
              disabled:opacity-50 disabled:cursor-not-allowed 
              active:scale-95 touch-manipulation
              min-w-[120px] sm:min-w-[140px]
              ${isMicEnabled
                ? 'bg-[#EF3866] text-white shadow-md shadow-[#EF3866]/25 hover:bg-[#d32f5f]'
                : 'bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-black dark:hover:bg-gray-300'
              }
            `}
          >
            {isMicEnabled ? (
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            {isMicEnabled ? 'Live' : 'Muted'}
          </button>

          {/* LiveKit native toggle – kept but styled consistently */}
          <TrackToggle
            source={Track.Source.Microphone}
            className={`
              flex items-center justify-center gap-2 
              px-4 sm:px-5 py-2.5 sm:py-3 
              border border-black/20 dark:border-white/20 
              rounded-xl 
              font-sora font-medium 
              text-sm sm:text-base
              text-black dark:text-white 
              hover:border-[#EF3866] hover:text-[#EF3866] 
              transition-all duration-200
              min-w-[100px] sm:min-w-[110px]
            `}
          >
            Advanced Toggle
          </TrackToggle>
        </div>

        {/* Right side – current mic status text */}
        <div className="
          text-xs sm:text-sm 
          font-sora font-medium 
          whitespace-nowrap
          self-center xs:self-auto
          mt-2 xs:mt-0
        ">
          <span className={isMicEnabled ? 'text-[#EF3866]' : 'text-gray-500 dark:text-gray-400'}>
            {isMicEnabled ? 'Broadcasting audio' : 'Microphone off'}
          </span>
        </div>
      </div>
    </div>
  );
}