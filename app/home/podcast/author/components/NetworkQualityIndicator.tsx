
// app/home/podcast/author/components/NetworkQualityIndicator.tsx - NETWORK QUALITY COMPONENT
import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { NetworkQualityStats } from '../types/audio';

interface NetworkQualityIndicatorProps {
  networkQuality: NetworkQualityStats | null;
}

export function NetworkQualityIndicator({ networkQuality }: NetworkQualityIndicatorProps) {
  if (!networkQuality) return null;

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-green-400';
      case 'medium': return 'text-yellow-500';
      case 'poor': return 'text-orange-500';
      case 'offline': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getQualityIcon = (quality: string) => {
    if (quality === 'offline') {
      return <WifiOff className="w-4 h-4" />;
    }
    return <Wifi className="w-4 h-4" />;
  };

  return (
    <div className="border border-black dark:border-white rounded-3xl p-4">
      <h4 className="text-sm font-medium text-black dark:text-white mb-3 flex items-center">
        {getQualityIcon(networkQuality.quality)}
        <span className="ml-2">Network Quality</span>
      </h4>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            networkQuality.quality === 'excellent' ? 'bg-green-500 animate-pulse' : 
            networkQuality.quality === 'good' ? 'bg-green-400' : 
            networkQuality.quality === 'medium' ? 'bg-yellow-500' : 
            networkQuality.quality === 'poor' ? 'bg-orange-500' : 'bg-red-500'
          }`}></div>
          <span className={`text-sm font-medium capitalize ${getQualityColor(networkQuality.quality)}`}>
            {networkQuality.quality}
          </span>
        </div>

        <div className="text-xs text-black dark:text-white opacity-60">
          {networkQuality.latency}ms | {networkQuality.packetLoss.toFixed(1)}% loss
        </div>
      </div>

      {networkQuality.quality === 'poor' && (
        <div className="mt-2 p-2 bg-orange-500 bg-opacity-10 rounded-lg">
          <p className="text-xs text-orange-600 dark:text-orange-400">
            Poor connection detected. Consider moving closer to your router.
          </p>
        </div>
      )}
    </div>
  );
}