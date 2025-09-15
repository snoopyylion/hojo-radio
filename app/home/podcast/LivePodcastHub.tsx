// app/home/podcast/LivePodcastHub.tsx - UPDATED
"use client";
import { useState, useEffect } from "react";
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { LiveSession, User, DatabaseLiveSession } from "@/types/podcast";
import AuthorStudioView from "./author/PodcastStudio";
import ListenerView from "./ListenerView";
import SessionCreationForm from "./author/SessionCreationForm";
import { supabaseClient } from "@/lib/supabase/client";
import { Wifi, WifiOff, AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  user: User;
  liveSessions: LiveSession[];
}

interface NetworkQuality {
  quality: 'high' | 'medium' | 'low';
  speed: number; // Mbps
  latency: number; // ms
}

export default function LivePodcastHub({ user, liveSessions: initialSessions }: Props) {
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>(initialSessions);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [mode, setMode] = useState<'browse' | 'create' | 'listen' | 'manage'>('browse');
  const [userSession, setUserSession] = useState<LiveSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>({ 
    quality: 'medium', 
    speed: 0, 
    latency: 0 
  });
  const [isTestingNetwork, setIsTestingNetwork] = useState(false);

  const supabase = supabaseClient;

  // Test network quality on component mount
  useEffect(() => {
    testNetworkQuality();
    
    // Set up periodic network testing
    const networkTestInterval = setInterval(testNetworkQuality, 30000); // Test every 30 seconds
    
    return () => clearInterval(networkTestInterval);
  }, []);

  const testNetworkQuality = async () => {
    setIsTestingNetwork(true);
    try {
      // Simple network test - measure latency to API
      const startTime = performance.now();
      await fetch('/api/podcast/network-test', { 
        method: 'HEAD',
        cache: 'no-store'
      });
      const latency = performance.now() - startTime;

      // Estimate speed based on latency (very rough estimate)
      let quality: NetworkQuality['quality'] = 'medium';
      let speed = 0;
      
      if (latency < 100) {
        quality = 'high';
        speed = 10 + Math.random() * 10; // 10-20 Mbps
      } else if (latency < 300) {
        quality = 'medium';
        speed = 5 + Math.random() * 5; // 5-10 Mbps
      } else {
        quality = 'low';
        speed = 1 + Math.random() * 4; // 1-5 Mbps
      }

      setNetworkQuality({ quality, speed, latency });
      
      // Log network quality for analytics
      if (userSession) {
        await fetch('/api/podcast/network-monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: userSession.id,
            networkStats: { latency, bandwidth: speed, packetLoss: 0 },
            deviceInfo: navigator.userAgent,
            connectionType: 'unknown'
          })
        });
      }
    } catch (error) {
      console.error('Network test failed:', error);
      setNetworkQuality({ quality: 'low', speed: 0, latency: 999 });
    } finally {
      setIsTestingNetwork(false);
    }
  };

  // Real-time subscription to live sessions
  useEffect(() => {
    console.log('Setting up real-time subscription...');
    
    const channelName = `live-sessions-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'live_sessions',
          filter: 'is_active=eq.true'
        },
        (payload: RealtimePostgresChangesPayload<DatabaseLiveSession>) => {
          console.log('Real-time event received:', payload.eventType, payload);
          
          const transformSession = (dbSession: DatabaseLiveSession): LiveSession => ({
            id: dbSession.id,
            authorId: dbSession.author_id,
            authorName: dbSession.author_name,
            title: dbSession.title,
            description: dbSession.description || '',
            roomName: dbSession.room_name,
            startedAt: dbSession.started_at,
            listenerCount: dbSession.listener_count || 0,
            isActive: dbSession.is_active,
          });

          if (payload.eventType === 'INSERT') {
            const newSession = transformSession(payload.new);
            console.log('Adding new session:', newSession);
            setLiveSessions(prev => {
              const exists = prev.some(session => session.id === newSession.id);
              if (exists) return prev;
              return [newSession, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedSession = transformSession(payload.new);
            console.log('Updating session:', updatedSession);
            setLiveSessions(prev =>
              prev.map(session =>
                session.id === updatedSession.id ? updatedSession : session
              )
            );
          } else if (payload.eventType === 'DELETE') {
            console.log('Removing session:', payload.old.id);
            setLiveSessions(prev =>
              prev.filter(session => session.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    const fetchLatestSessions = async () => {
      try {
        const { data: sessions, error } = await supabase
          .from('live_sessions')
          .select('*')
          .eq('is_active', true)
          .order('started_at', { ascending: false });

        if (error) {
          console.error('Error fetching latest sessions:', error);
          return;
        }

        console.log('Fetched latest sessions:', sessions);
        
        const transformedSessions = sessions?.map((dbSession: DatabaseLiveSession): LiveSession => ({
          id: dbSession.id,
          authorId: dbSession.author_id,
          authorName: dbSession.author_name,
          title: dbSession.title,
          description: dbSession.description || '',
          roomName: dbSession.room_name,
          startedAt: dbSession.started_at,
          listenerCount: dbSession.listener_count || 0,
          isActive: dbSession.is_active,
        })) || [];

        setLiveSessions(transformedSessions);
      } catch (error) {
        console.error('Error in fetchLatestSessions:', error);
      }
    };

    fetchLatestSessions();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  // Check if user has an active session
  useEffect(() => {
    const userActiveSession = liveSessions.find(
      session => session.authorId === user.id && session.isActive
    );
    setUserSession(userActiveSession || null);
  }, [liveSessions, user.id]);

  const joinSession = async (session: LiveSession) => {
    // Check network quality before joining
    if (networkQuality.quality === 'low') {
      const useQuickJoin = window.confirm(
        `Your network connection is poor (${Math.round(networkQuality.speed)} Mbps). ` +
        `Would you like to use quick join mode for better stability?`
      );
      
      if (useQuickJoin) {
        try {
          const response = await fetch('/api/podcast/quick-join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: session.id,
              networkQuality: 'low',
              deviceType: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
              connectionSpeed: networkQuality.speed
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Quick join configured:', data);
          }
        } catch (error) {
          console.error('Quick join setup failed:', error);
        }
      }
    }

    setSelectedSession(session);
    if (session.authorId === user.id) {
      setMode('manage');
    } else {
      setMode('listen');
    }
  };

  const createNewSession = () => {
    setMode('create');
  };

  const backToBrowse = () => {
    setMode('browse');
    setSelectedSession(null);
  };

  const handleSessionEnd = () => {
    setUserSession(null);
    setMode('browse');
    setSelectedSession(null);
  };

  const handleSessionCreated = (session: LiveSession) => {
    setUserSession(session);
    setSelectedSession(session);
    setMode('manage');
  };

  const getNetworkQualityColor = () => {
    switch (networkQuality.quality) {
      case 'high': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getNetworkQualityIcon = () => {
    switch (networkQuality.quality) {
      case 'high': return <Wifi className="w-4 h-4" />;
      case 'medium': return <Wifi className="w-4 h-4" />;
      case 'low': return <WifiOff className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Show session creation form
  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <div className="p-8">
          <button
            onClick={backToBrowse}
            className="mb-8 text-black dark:text-white hover:text-[#EF3866] dark:hover:text-[#EF3866] flex items-center text-sm font-medium transition-colors"
          >
            ← Back to Live Sessions
          </button>
          <SessionCreationForm
            user={user}
            onCancel={backToBrowse}
            onSessionCreated={handleSessionCreated}
          />
        </div>
      </div>
    );
  }

  if (mode === 'manage' && selectedSession && selectedSession.authorId === user.id) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <div className="p-8">
          <button
            onClick={backToBrowse}
            className="mb-8 text-black dark:text-white hover:text-[#EF3866] dark:hover:text-[#EF3866] flex items-center text-sm font-medium transition-colors"
          >
            ← Back to Live Sessions
          </button>
          <AuthorStudioView
            session={selectedSession}
            user={user}
            onEndSession={handleSessionEnd}
            networkQuality={networkQuality.quality}
          />
        </div>
      </div>
    );
  }

  if (mode === 'listen' && selectedSession) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <div className="p-8">
          <button
            onClick={backToBrowse}
            className="mb-8 text-black dark:text-white hover:text-[#EF3866] dark:hover:text-[#EF3866] flex items-center text-sm font-medium transition-colors"
          >
            ← Back to Live Sessions
          </button>
          <ListenerView
            session={selectedSession}
            user={user}
            onEndSession={handleSessionEnd}
            networkQuality={networkQuality.quality}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-white">
              Live Podcasts
            </h1>
            <div className="flex items-center space-x-4">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#EF3866]' : 'bg-black dark:bg-white'} ${isConnected && 'animate-pulse'}`}></div>
              <span className="text-sm text-black dark:text-white opacity-60">
                {isConnected ? 'Live' : 'Reconnecting...'}
              </span>
              
              {/* Network Status */}
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1 ${getNetworkQualityColor()}`}>
                  {getNetworkQualityIcon()}
                  <span className="text-sm capitalize">
                    {networkQuality.quality} ({Math.round(networkQuality.speed)} Mbps)
                  </span>
                </div>
                <button
                  onClick={testNetworkQuality}
                  disabled={isTestingNetwork}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Test network quality"
                >
                  <RefreshCw className={`w-3 h-3 ${isTestingNetwork ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
          {user.role === 'author' && !userSession && (
            <button
              onClick={createNewSession}
              className="bg-[#EF3866] hover:bg-[#d12b56] text-white px-8 py-4 rounded-full font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Start Broadcasting
            </button>
          )}
        </div>

        {/* Network Quality Warning */}
        {networkQuality.quality === 'low' && (
          <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg mb-8">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">Poor Network Connection</p>
                <p className="text-sm opacity-80">
                  Your connection speed is low. Sessions may use optimized audio quality for better stability.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* User's Active Session */}
        {userSession && (
          <div className="bg-[#EF3866] text-white p-8 rounded-3xl mb-12 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold uppercase tracking-wider">Your Live Session</span>
                </div>
                <h3 className="text-2xl font-bold">{userSession.title}</h3>
                <div className="flex items-center space-x-8 text-sm opacity-90">
                  <span>{userSession.listenerCount} listeners</span>
                  <span>Started {new Date(userSession.startedAt).toLocaleTimeString()}</span>
                </div>
              </div>
              <button
                onClick={() => joinSession(userSession)}
                className="bg-white text-[#EF3866] px-6 py-3 rounded-full font-semibold hover:bg-black hover:text-white transition-all duration-200"
              >
                Manage Studio
              </button>
            </div>
          </div>
        )}

        {/* Live Sessions Grid */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-black dark:text-white">
              Live Now ({liveSessions.length})
            </h2>
            {liveSessions.length > 0 && (
              <div className="text-sm text-black dark:text-white opacity-60">
                Click any session to join
              </div>
            )}
          </div>

          {liveSessions.length === 0 ? (
            <div className="text-center py-24 space-y-6">
              <div className="w-24 h-24 mx-auto bg-black dark:bg-white rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-white dark:text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M13.828 7.172a1 1 0 011.414 0A5.983 5.983 0 0117 12a5.983 5.983 0 01-1.758 4.828 1 1 0 11-1.414-1.414A3.983 3.983 0 0015 12a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-xl font-semibold text-black dark:text-white">No live podcasts right now</p>
                <p className="text-black dark:text-white opacity-60">Be the first to go live and share your voice</p>
              </div>
              {user.role === 'author' && (
                <button
                  onClick={createNewSession}
                  className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-full font-semibold hover:bg-[#EF3866] hover:text-white transition-all duration-200 transform hover:scale-105"
                >
                  Start Your First Live Session
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {liveSessions.map((session) => (
                <div
                  key={session.id}
                  className="group bg-white dark:bg-black border-2 border-black dark:border-white p-6 rounded-3xl transition-all duration-200 hover:border-[#EF3866] hover:shadow-2xl cursor-pointer"
                  onClick={() => joinSession(session)}
                >
                  {/* Live indicator */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-[#EF3866] rounded-full animate-pulse"></div>
                      <span className="text-xs font-bold text-[#EF3866] uppercase tracking-wider">Live</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-black dark:text-white opacity-60">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                      </svg>
                      <span>{session.listenerCount}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4 mb-6">
                    <h3 className="font-bold text-xl text-black dark:text-white line-clamp-2 group-hover:text-[#EF3866] transition-colors">
                      {session.title}
                    </h3>
                    <p className="text-sm text-black dark:text-white opacity-60">
                      by {session.authorName}
                    </p>
                    {session.description && (
                      <p className="text-sm text-black dark:text-white opacity-80 line-clamp-3">
                        {session.description}
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-black dark:border-white border-opacity-10 dark:border-opacity-10">
                    <span className="text-xs text-black dark:text-white opacity-40">
                      {new Date(session.startedAt).toLocaleTimeString()}
                    </span>
                    <div className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                      session.authorId === user.id
                        ? 'bg-[#EF3866] text-white group-hover:bg-black group-hover:text-white'
                        : 'bg-black dark:bg-white text-white dark:text-black group-hover:bg-[#EF3866] group-hover:text-white'
                    }`}>
                      {session.authorId === user.id ? 'Manage' : 'Listen'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Footer */}
        {liveSessions.length > 0 && (
          <div className="mt-16 pt-12 border-t border-black dark:border-white border-opacity-10 dark:border-opacity-10">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-[#EF3866]">{liveSessions.length}</div>
                <div className="text-sm text-black dark:text-white opacity-60">Live Sessions</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-black dark:text-white">
                  {liveSessions.reduce((total, session) => total + session.listenerCount, 0)}
                </div>
                <div className="text-sm text-black dark:text-white opacity-60">Total Listeners</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-black dark:text-white">
                  {liveSessions.filter(s => s.authorId !== user.id).length}
                </div>
                <div className="text-sm text-black dark:text-white opacity-60">Available to Join</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}