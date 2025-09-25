
// app/home/podcast/author/hooks/useNetworkMonitoring.ts - NETWORK HOOK
import { useState, useRef, useEffect } from "react";
import { NetworkQualityStats } from "../types/audio";
import { useMaybeRoomContext, useLocalParticipant } from "@livekit/components-react";

export function useNetworkMonitoring() {
  const [networkQuality, setNetworkQuality] = useState<NetworkQualityStats | null>(null);
  const networkMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const room = useMaybeRoomContext();
  const { localParticipant } = useLocalParticipant();

  const updateNetworkStats = (stats: NetworkQualityStats) => {
    setNetworkQuality(stats);
  };

  const monitorNetworkQuality = async (stats: NetworkQualityStats, sessionId: string) => {
    try {
      await fetch('/api/podcast/network-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          networkStats: stats,
          deviceInfo: { userAgent: navigator.userAgent },
          connectionType: navigator.onLine ? 'wifi' : 'offline'
        })
      });
    } catch (error) {
      console.error('Network monitoring failed:', error);
    }
  };

  const startNetworkMonitoring = (sessionId: string) => {
    if (networkMonitorRef.current) {
      clearInterval(networkMonitorRef.current);
    }

    networkMonitorRef.current = setInterval(async () => {
      if (room && localParticipant) {
        try {
          let quality: NetworkQualityStats['quality'] = 'medium';
          
          const connectionQuality = localParticipant.connectionQuality;
          switch (connectionQuality) {
            case 'excellent': quality = 'excellent'; break;
            case 'good': quality = 'good'; break;
            case 'poor': quality = 'poor'; break;
            case 'unknown': quality = 'offline'; break;
            default: quality = 'medium';
          }

          if (!navigator.onLine) quality = 'offline';

          const networkStats: NetworkQualityStats = {
            quality,
            latency: Math.round(0),
            jitter: Math.round(0 * 1000),
            packetLoss: 0,
            bandwidth: 0
          };

          setNetworkQuality(networkStats);
          await monitorNetworkQuality(networkStats, sessionId);
        } catch (error) {
          console.error('Network monitoring error:', error);
        }
      }
    }, 5000);
  };

  const stopNetworkMonitoring = () => {
    if (networkMonitorRef.current) {
      clearInterval(networkMonitorRef.current);
      networkMonitorRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopNetworkMonitoring();
    };
  }, []);

  return {
    networkQuality,
    updateNetworkStats,
    startNetworkMonitoring,
    stopNetworkMonitoring
  };
}