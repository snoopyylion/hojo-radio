
// app/home/podcast/author/components/MusicControls.tsx - MUSIC CONTROLS
import React from 'react';
import { Music, Upload, Play, Pause, Square, SkipBack, SkipForward, Volume2, AlertCircle } from 'lucide-react';

interface MusicControlsProps {
  tracks: { id: string; name: string; isPlaying: boolean }[];
  currentTrackId: string | null;
  isPlaying: boolean;
  audioVolume: number;
  isUploading: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  publishedAudioTrack: MediaStreamTrack | null;
  onMusicUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPlayTrack: (trackId: string) => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onVolumeChange: (volume: number) => void;
}

export function MusicControls({
  tracks,
  currentTrackId,
  isPlaying,
  audioVolume,
  isUploading,
  connectionStatus,
  publishedAudioTrack,
  onMusicUpload,
  onPlayTrack,
  onPlayNext,
  onPlayPrevious,
  onPause,
  onResume,
  onStop,
  onVolumeChange
}: MusicControlsProps) {
  return (
    <div className="border border-black dark:border-white rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-black dark:text-white flex items-center">
          <Music className="w-5 h-5 mr-3" />
          Audio Library
        </h3>

        <label className="cursor-pointer">
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={onMusicUpload}
            className="hidden"
            disabled={isUploading}
          />
          <div className={`flex items-center px-4 py-2 border border-black dark:border-white rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-200 text-black dark:text-white ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload'}
          </div>
        </label>
      </div>

      {/* Current Track */}
      {currentTrackId && (
        <div className="mb-6 p-4 border border-[#EF3866] rounded-2xl bg-[#EF3866] bg-opacity-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-[#EF3866] rounded-full animate-pulse mr-3"></div>
              <div>
                <div className="text-sm font-medium text-black dark:text-white">Now Playing</div>
                <div className="text-xs text-black dark:text-white opacity-60 truncate max-w-48">
                  {tracks.find(t => t.id === currentTrackId)?.name}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onPlayPrevious}
                className="p-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-full transition-all duration-200"
                disabled={tracks.length <= 1}
              >
                <SkipBack className="w-4 h-4" />
              </button>
              {isPlaying ? (
                <button
                  onClick={onPause}
                  className="p-2 bg-[#EF3866] text-white rounded-full transition-all duration-200"
                >
                  <Pause className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onResume}
                  className="p-2 bg-[#EF3866] text-white rounded-full transition-all duration-200"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onPlayNext}
                className="p-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-full transition-all duration-200"
                disabled={tracks.length <= 1}
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                onClick={onStop}
                className="p-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-full transition-all duration-200"
              >
                <Square className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Volume Control */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-black dark:text-white flex items-center">
            <Volume2 className="w-4 h-4 mr-2" />
            Volume
          </label>
          <span className="text-sm text-black dark:text-white opacity-60">
            {Math.round(audioVolume * 100)}%
          </span>
        </div>
        <div className="relative">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={audioVolume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-black dark:bg-white bg-opacity-10 dark:bg-opacity-10 rounded-full appearance-none cursor-pointer slider"
          />
          <style jsx>{`
            .slider::-webkit-slider-thumb {
              appearance: none;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #EF3866;
              cursor: pointer;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            .slider::-moz-range-thumb {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #EF3866;
              cursor: pointer;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
          `}</style>
        </div>
      </div>

      {/* Track List */}
      {tracks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-black dark:text-white mb-3">
            Your Tracks ({tracks.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {tracks.map((track) => (
              <div
                key={track.id}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${currentTrackId === track.id
                  ? 'border-[#EF3866] bg-[#EF3866] bg-opacity-5'
                  : 'border-black dark:border-white border-opacity-10 dark:border-opacity-10 hover:border-opacity-30 dark:hover:border-opacity-30'
                  }`}
              >
                <span className="text-sm text-black dark:text-white truncate mr-4">
                  {track.name.replace(/\.[^/.]+$/, "")}
                </span>
                <button
                  onClick={() => onPlayTrack(track.id)}
                  className={`p-2 rounded-full transition-all duration-200 ${currentTrackId === track.id
                    ? 'bg-[#EF3866] text-white'
                    : 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                    }`}
                  disabled={connectionStatus !== 'connected'}
                >
                  {currentTrackId === track.id && isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tracks.length === 0 && (
        <div className="text-center py-8 text-black dark:text-white opacity-60">
          <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No audio files uploaded yet</p>
          <p className="text-xs mt-1">Upload music, jingles, or sound effects</p>
        </div>
      )}

      {/* Connection Status Warnings */}
      {connectionStatus === 'disconnected' && (
        <div className="mt-4 p-4 bg-orange-500 bg-opacity-10 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                Connection Lost
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 opacity-80">
                Attempting to reconnect...
              </p>
            </div>
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      )}

      {connectionStatus === 'connected' && !publishedAudioTrack && currentTrackId && (
        <div className="mt-4 p-4 bg-yellow-500 bg-opacity-10 rounded-2xl">
          <div className="flex items-center justify-start">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Audio Not Broadcasting
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 opacity-80">
                Music is playing locally but not being shared with listeners.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}