// app/home/podcast/author/components/MusicControls.tsx
import React, { useEffect } from 'react';
import { 
  Music, Upload, Play, Pause, Square, SkipBack, SkipForward, 
  Volume2, AlertCircle, Repeat 
} from 'lucide-react';

interface MusicControlsProps {
  tracks: { id: string; name: string; isPlaying: boolean }[];
  currentTrackId: string | null;
  isPlaying: boolean;
  audioVolume: number;
  isUploading: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  publishedAudioTrack: MediaStreamTrack | null;
  autoplayEnabled: boolean;
  onToggleAutoplay: () => void;
  onMusicUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPlayTrack: (trackId: string) => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onVolumeChange: (volume: number) => void;
  onTrackEnded?: () => void;
}

export function MusicControls({
  tracks,
  currentTrackId,
  isPlaying,
  audioVolume,
  isUploading,
  connectionStatus,
  publishedAudioTrack,
  autoplayEnabled,
  onToggleAutoplay,
  onMusicUpload,
  onPlayTrack,
  onPlayNext,
  onPlayPrevious,
  onPause,
  onResume,
  onStop,
  onVolumeChange,
  onTrackEnded
}: MusicControlsProps) {
  const currentTrack = tracks.find(t => t.id === currentTrackId);
  const currentIndex = tracks.findIndex(t => t.id === currentTrackId);
  const hasNext = currentIndex >= 0 && currentIndex < tracks.length - 1;

  useEffect(() => {
    if (isPlaying && onTrackEnded) {
      console.log('🎵 Autoplay is:', autoplayEnabled ? 'enabled' : 'disabled');
    }
  }, [isPlaying, autoplayEnabled, onTrackEnded]);

  return (
    <div className="
      border border-gray-200/70 dark:border-gray-800/70 
      bg-white dark:bg-gray-950/80 backdrop-blur-sm 
      rounded-2xl sm:rounded-3xl overflow-hidden 
      shadow-sm dark:shadow-none
    ">
      {/* Header */}
      <div className="
        px-4 sm:px-6 py-4 sm:py-5 
        border-b border-gray-200/50 dark:border-gray-800/50 
        flex flex-col xs:flex-row items-start xs:items-center justify-between gap-4
      ">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#EF3866]/10 rounded-xl flex items-center justify-center shrink-0">
            <Music className="w-5 h-5 sm:w-6 sm:h-6 text-[#EF3866]" />
          </div>
          <div>
            <h3 className="font-sora font-semibold text-base sm:text-lg text-gray-900 dark:text-white">
              Background Music
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {tracks.length} track{tracks.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <label className="cursor-pointer w-full xs:w-auto">
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={onMusicUpload}
            className="hidden"
            disabled={isUploading || connectionStatus !== 'connected'}
          />
          <div className={`
            flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 
            border border-gray-300 dark:border-gray-700 rounded-xl font-medium text-sm sm:text-base
            transition-all duration-200
            ${isUploading || connectionStatus !== 'connected' 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:border-[#EF3866] hover:text-[#EF3866] hover:bg-[#EF3866]/5'}
          `}>
            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            {isUploading ? 'Uploading…' : 'Add Music'}
          </div>
        </label>
      </div>

      {/* Now Playing + Transport Controls */}
      {currentTrack && (
        <div className="px-4 sm:px-6 py-5 sm:py-6 border-b border-gray-200/50 dark:border-gray-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
            {/* Track info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-3 h-3 rounded-full bg-[#EF3866] animate-pulse ring-4 ring-[#EF3866]/20 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">
                  {currentTrack.name.replace(/\.[^/.]+$/, "")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Now Playing {hasNext && autoplayEnabled && '→ next auto'}
                </p>
              </div>
            </div>

            {/* Controls – Autoplay now takes the place of old Stop */}
            <div className="flex items-center justify-center sm:justify-end gap-1.5 sm:gap-2 flex-wrap">
              <button
                onClick={onPlayPrevious}
                disabled={currentIndex <= 0 || connectionStatus !== 'connected'}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors disabled:opacity-40"
                title="Previous"
              >
                <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button
                onClick={isPlaying ? onPause : onResume}
                disabled={connectionStatus !== 'connected'}
                className={`
                  p-3.5 sm:p-4 rounded-full transition-all shadow-md min-w-13 sm:min-w-15
                  ${isPlaying 
                    ? 'bg-[#EF3866] hover:bg-[#d12b56] text-white' 
                    : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'}
                  disabled:opacity-50
                `}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 sm:w-7 sm:h-7" />
                ) : (
                  <Play className="w-6 h-6 sm:w-7 sm:h-7 ml-0.5" />
                )}
              </button>

              <button
                onClick={onPlayNext}
                disabled={!hasNext || connectionStatus !== 'connected'}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors disabled:opacity-40"
                title="Next"
              >
                <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* === Autoplay Toggle – replaced old Stop position === */}
              <button
                onClick={onToggleAutoplay}
                title={
                  autoplayEnabled 
                    ? "Autoplay ON – next track starts automatically" 
                    : "Autoplay OFF – stops after current track"
                }
                className={`
                  relative p-2.5 sm:p-3 rounded-full transition-all duration-200 min-w-13 sm:min-w-14
                  ${autoplayEnabled 
                    ? 'bg-[#EF3866]/20 hover:bg-[#EF3866]/30 text-[#EF3866]' 
                    : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}
                `}
              >
                <Repeat className={`w-5 h-5 sm:w-6 sm:h-6 ${autoplayEnabled ? 'animate-pulse' : ''}`} />
                {autoplayEnabled && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#EF3866] rounded-full border-2 border-white dark:border-gray-950" />
                )}
              </button>

              {/* Stop moved here – smaller and less prominent */}
              <button
                onClick={onStop}
                disabled={connectionStatus !== 'connected'}
                className="
                  p-2 hover:bg-red-50 dark:hover:bg-red-950/30 
                  hover:text-red-600 dark:hover:text-red-400 
                  rounded-full transition-colors disabled:opacity-40 text-gray-500 dark:text-gray-400
                "
                title="Stop music"
              >
                <Square className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Volume */}
      <div className="px-4 sm:px-6 py-5 sm:py-6 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
            <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">
              Volume
            </span>
          </div>
          <span className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400">
            {Math.round(audioVolume * 100)}%
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={audioVolume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          disabled={connectionStatus !== 'connected'}
          className="
            w-full h-1.5 sm:h-2 
            bg-gray-200 dark:bg-gray-800 
            rounded-full appearance-none cursor-pointer
            accent-[#EF3866] disabled:opacity-50
          "
          style={{
            background: `linear-gradient(to right, #EF3866 0%, #EF3866 ${audioVolume * 100}%, #e5e7eb ${audioVolume * 100}%)`
          }}
        />
      </div>

      {/* Track list */}
      <div className="p-4 sm:p-6">
        {tracks.length === 0 ? (
          <div className="text-center py-10 sm:py-12">
            <div className="
              w-16 h-16 sm:w-20 sm:h-20 
              mx-auto mb-4 
              bg-gray-100 dark:bg-gray-800 
              rounded-full flex items-center justify-center
            ">
              <Music className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
            </div>
            <p className="font-medium text-gray-700 dark:text-gray-300 text-base sm:text-lg mb-2">
              No tracks yet
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
              Upload music, intros, jingles or background tracks to enhance your show
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h4 className="font-sora font-medium text-sm sm:text-base text-gray-900 dark:text-white">
                Your Tracks ({tracks.length})
              </h4>
              {autoplayEnabled && (
                <span className="text-xs text-[#EF3866] bg-[#EF3866]/10 px-2.5 py-1 rounded-full">
                  Autoplay active
                </span>
              )}
            </div>

            <div className="
              space-y-2 sm:space-y-2.5 
              max-h-64 sm:max-h-80 
              overflow-y-auto pr-1 scrollbar-thin
            ">
              {tracks.map((track, index) => (
                <button
                  key={track.id}
                  onClick={() => onPlayTrack(track.id)}
                  disabled={connectionStatus !== 'connected'}
                  className={`
                    w-full flex items-center justify-between 
                    p-3 sm:p-4 rounded-xl border 
                    transition-all duration-200
                    ${currentTrackId === track.id
                      ? 'border-[#EF3866] bg-[#EF3866]/5 dark:bg-[#EF3866]/10'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="
                      w-8 h-8 sm:w-10 sm:h-10 
                      rounded-lg bg-gray-100 dark:bg-gray-800 
                      flex items-center justify-center shrink-0
                    ">
                      <Music className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="text-left min-w-0">
                      <span className="
                        font-medium text-sm sm:text-base 
                        text-gray-900 dark:text-white 
                        truncate block
                      ">
                        {track.name.replace(/\.[^/.]+$/, "")}
                      </span>
                      {index < tracks.length - 1 && autoplayEnabled && currentTrackId === track.id && (
                        <span className="text-[10px] text-[#EF3866]">→ Next will play automatically</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {index < tracks.length - 1 && autoplayEnabled && currentTrackId === track.id && (
                      <Repeat className="w-3 h-3 text-[#EF3866] animate-pulse" />
                    )}
                    {currentTrackId === track.id && isPlaying ? (
                      <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-[#EF3866]" />
                    ) : (
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Status banners */}
      {(connectionStatus !== 'connected' || (connectionStatus === 'connected' && currentTrackId && !publishedAudioTrack)) && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          {connectionStatus !== 'connected' && (
            <div className="
              bg-amber-500/10 dark:bg-amber-950/30 
              border border-amber-400/30 dark:border-amber-700/30 
              rounded-xl p-4 flex items-center gap-3
            ">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-300 text-sm sm:text-base">
                  Connection issue
                </p>
                <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400/90">
                  Trying to reconnect...
                </p>
              </div>
            </div>
          )}

          {connectionStatus === 'connected' && currentTrackId && !publishedAudioTrack && (
            <div className="
              bg-yellow-500/10 dark:bg-yellow-950/20 
              border border-yellow-400/30 dark:border-yellow-700/30 
              rounded-xl p-4 flex items-start gap-3
            ">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-300 text-sm sm:text-base">
                  Music playing locally only
                </p>
                <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400/90 mt-1">
                  Listeners cannot hear background music yet. Check audio publishing settings.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}