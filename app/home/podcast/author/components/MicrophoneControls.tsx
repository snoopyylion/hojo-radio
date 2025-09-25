// app/home/podcast/author/components/MicrophoneControls.tsx - MICROPHONE CONTROLS
import React, { useState } from 'react';
import { TrackToggle, useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, Radio, CheckCircle, AlertCircle } from 'lucide-react';

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

  return (
    <div className="border border-black dark:border-white rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-black dark:text-white flex items-center">
          <Radio className="w-5 h-5 mr-3" />
          Audio Control
        </h3>

        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          {connectionStatus === 'connected' ? (
            <div className="flex items-center space-x-1 text-green-500">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">Connected</span>
            </div>
          ) : connectionStatus === 'connecting' ? (
            <div className="flex items-center space-x-1 text-orange-500">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">Connecting...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-red-500">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">Disconnected</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleMicrophone}
            className={`flex items-center px-6 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 ${isMicEnabled
              ? 'bg-[#EF3866] text-white shadow-lg'
              : 'bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white'
              }`}
            disabled={connectionStatus !== 'connected'}
          >
            {isMicEnabled ? (
              <Mic className="w-4 h-4 mr-2" />
            ) : (
              <MicOff className="w-4 h-4 mr-2" />
            )}
            {isMicEnabled ? 'Live' : 'Muted'}
          </button>

          <TrackToggle
            source={Track.Source.Microphone}
            className="px-6 flex py-3 gap-2 border border-black dark:border-white rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-200 text-black dark:text-white text-sm"
          >
            Toggle
          </TrackToggle>
        </div>

        <div className="text-sm text-black dark:text-white opacity-60">
          {isMicEnabled ? 'Broadcasting' : 'Audio Off'}
        </div>
      </div>
    </div>
  );
}