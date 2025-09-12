'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { 
  Radio, 
  Users, 
  Heart, 
  Clock, 
  Play, 
  Mic, 
  TrendingUp,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import PodcastNavigation from '@/components/PodcastNavigation';

interface LiveSession {
  id: string;
  title: string;
  description?: string;
  userId: string;
  username: string;
  isLive: boolean;
  startTime: string;
  duration: number;
  listeners: number;
  likes: number;
  status: string;
  youtubeWatchUrl?: string;
  createdAt: string;
}

export default function DiscoverPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch live sessions
  const fetchLiveSessions = async () => {
    try {
      const response = await fetch('/api/podcasts/live-sessions');
      const data = await response.json();
      
      if (data.success) {
        setLiveSessions(data.sessions);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch live sessions');
      }
    } catch (error) {
      console.error('Error fetching live sessions:', error);
      setError('Failed to load live sessions');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Join a live session
  const joinSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/podcasts/join-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          action: 'join'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Navigate to the live session
        router.push(`/home/podcasts/live/${sessionId}`);
      } else {
        alert(data.error || 'Failed to join session');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      alert('Failed to join session');
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format time since start
  const formatTimeSince = (startTime: string): string => {
    const start = new Date(startTime);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just started';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    }
  };

  // Refresh data
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLiveSessions();
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchLiveSessions();
    
    const interval = setInterval(() => {
      if (!isRefreshing) {
        fetchLiveSessions();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-gray-600 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-800 dark:text-white p-6">
      <div className="max-w-6xl mx-auto">
        
        <PodcastNavigation />
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Live Podcasts</h1>
              <p className="text-gray-400">Discover and join live podcast sessions from authors around the world</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors text-white"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Radio className="w-6 h-6 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">{liveSessions.length}</div>
                  <div className="text-sm text-gray-400">Live Now</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {liveSessions.reduce((total, session) => total + session.listeners, 0)}
                  </div>
                  <div className="text-sm text-gray-400">Total Listeners</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {liveSessions.reduce((total, session) => total + session.likes, 0)}
                  </div>
                  <div className="text-sm text-gray-400">Total Likes</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading live sessions...</p>
          </div>
        )}

        {/* Live Sessions Grid */}
        {!isLoading && liveSessions.length === 0 && (
          <div className="text-center py-12">
            <Radio className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Live Sessions</h3>
            <p className="text-gray-400 mb-6">There are currently no live podcast sessions.</p>
            {user && (
              <button
                onClick={() => router.push('/home/podcasts')}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white transition-colors"
              >
                Start Your Own Live Session
              </button>
            )}
          </div>
        )}

        {/* Live Sessions List */}
        {!isLoading && liveSessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveSessions.map((session) => (
              <div
                key={session.id}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
              >
                {/* Live Indicator */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-500 font-semibold text-sm">LIVE</span>
                  <span className="text-gray-400 text-sm">
                    {formatTimeSince(session.startTime)}
                  </span>
                </div>

                {/* Title and Host */}
                <h3 className="text-xl font-bold mb-2 line-clamp-2">{session.title}</h3>
                <p className="text-gray-400 mb-4 flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  {session.username}
                </p>

                {/* Description */}
                {session.description && (
                  <p className="text-gray-300 mb-4 line-clamp-2">{session.description}</p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{session.listeners}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    <span>{session.likes}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(session.duration)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => joinSession(session.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Join Live
                  </button>
                  {session.youtubeWatchUrl && (
                    <a
                      href={session.youtubeWatchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
