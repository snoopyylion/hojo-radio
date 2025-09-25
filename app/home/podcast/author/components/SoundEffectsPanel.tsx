// app/home/podcast/author/components/SoundEffectsPanel.tsx
import React, { useState } from 'react';
import { Play, Square, RefreshCw, User, Globe, Upload } from 'lucide-react';
import { useSoundEffects } from '../hooks/useSoundEffects';

interface SoundEffectsPanelProps {
  className?: string;
}

export function SoundEffectsPanel({ className = '' }: SoundEffectsPanelProps) {
  const { 
    effects, 
    userEffects, 
    loading, 
    error, 
    playSound, 
    stopSound, 
    isPlaying, 
    volume, 
    setVolume,
    refetch 
  } = useSoundEffects();
  
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  // Get current effects based on active tab
  const currentEffects = activeTab === 'all' ? effects : userEffects;

  // Group effects by category
  const groupedEffects = currentEffects.reduce((groups, effect) => {
    const category = effect.category || 'uncategorized';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(effect);
    return groups;
  }, {} as Record<string, typeof currentEffects>);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sound Effects Library
          </h3>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EF3866] mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Loading sound effects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sound Effects Library
        </h3>
        <div className="flex items-center gap-4">
          <button
            onClick={refetch}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Volume:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 w-8">
              {volume}%
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-[#EF3866] text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Globe size={16} />
          All Effects ({effects.length})
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'my'
              ? 'bg-[#EF3866] text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <User size={16} />
          My Effects ({userEffects.length})
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Effects Grid */}
      <div className="space-y-6">
        {Object.entries(groupedEffects).map(([category, categoryEffects]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 capitalize">
              {category} ({categoryEffects.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryEffects.map((effect) => (
                <div
                  key={effect.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {effect.title}
                      </div>
                      {effect.isOwned && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          <User size={10} className="mr-1" />
                          Mine
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {effect.duration && (
                        <span>{Math.round(effect.duration / 1000)}s</span>
                      )}
                      {effect.file_size && (
                        <span>• {(effect.file_size / 1024).toFixed(1)}KB</span>
                      )}
                      {effect.tags && effect.tags.length > 0 && (
                        <span>• {effect.tags.slice(0, 2).join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {isPlaying(effect.id) ? (
                      <button
                        onClick={() => stopSound(effect.id)}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        title="Stop"
                      >
                        <Square size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => playSound(effect.id)}
                        className="p-2 bg-[#EF3866] text-white rounded-lg hover:bg-[#d12b56] transition-colors"
                        title="Play"
                      >
                        <Play size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty States */}
      {currentEffects.length === 0 && !loading && (
        <div className="text-center py-8">
          {activeTab === 'all' ? (
            <div>
              <Globe size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">No sound effects available.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Sound effects will appear here once they&apos;re uploaded to the platform.
              </p>
            </div>
          ) : (
            <div>
              <Upload size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">You haven&apos;t uploaded any sound effects yet.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Upload your first sound effect to get started with your personal library.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}