// app/home/podcast/LivePodcastHub.tsx
"use client";
import { useState, useEffect } from "react";
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { LiveSession, User, DatabaseLiveSession } from "@/types/podcast";
import AuthorStudioView from "./author/PodcastStudio";
import ListenerView from "./ListenerView";
import SessionCreationForm from "./author/SessionCreationForm";
import { supabaseClient } from "@/lib/supabase/client";

interface Props {
  user: User;
  liveSessions: LiveSession[];
}

export default function LivePodcastHub({ user, liveSessions: initialSessions }: Props) {
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>(initialSessions);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [mode, setMode] = useState<'browse' | 'create' | 'listen' | 'manage'>('browse');
  const [userSession, setUserSession] = useState<LiveSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const supabase = supabaseClient;

  // Real-time subscription to live sessions
  useEffect(() => {
    console.log('Setting up real-time subscription...');
    
    // Create a unique channel name with timestamp to avoid conflicts
    const channelName = `live-sessions-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'live_sessions',
          filter: 'is_active=eq.true' // Only listen to active sessions
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
              // Check if session already exists to prevent duplicates
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

    // Also fetch latest sessions on mount to ensure we have current data
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

  // Periodic refresh as fallback
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isConnected) {
        console.log('Connection not established, fetching sessions manually...');
        try {
          const { data: sessions, error } = await supabase
            .from('live_sessions')
            .select('*')
            .eq('is_active', true)
            .order('started_at', { ascending: false });

          if (!error && sessions) {
            const transformedSessions = sessions.map((dbSession: DatabaseLiveSession): LiveSession => ({
              id: dbSession.id,
              authorId: dbSession.author_id,
              authorName: dbSession.author_name,
              title: dbSession.title,
              description: dbSession.description || '',
              roomName: dbSession.room_name,
              startedAt: dbSession.started_at,
              listenerCount: dbSession.listener_count || 0,
              isActive: dbSession.is_active,
            }));
            
            setLiveSessions(transformedSessions);
          }
        } catch (error) {
          console.error('Periodic refresh error:', error);
        }
      }
    }, 5000); // Refresh every 5 seconds if not connected

    return () => clearInterval(interval);
  }, [isConnected, supabase]);

  // Check if user has an active session
  useEffect(() => {
    const userActiveSession = liveSessions.find(
      session => session.authorId === user.id && session.isActive
    );
    setUserSession(userActiveSession || null);
  }, [liveSessions, user.id]);

  const joinSession = (session: LiveSession) => {
    setSelectedSession(session);
    if (session.authorId === user.id) {
      setMode('manage'); // Author manages their own session
    } else {
      setMode('listen'); // Others listen
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

  // Show session creation form
  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="p-4">
          <button
            onClick={backToBrowse}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="p-4">
          <button
            onClick={backToBrowse}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Back to Live Sessions
          </button>
          <AuthorStudioView
            session={selectedSession}
            user={user}
            onEndSession={handleSessionEnd}
          />
        </div>
      </div>
    );
  }

  if (mode === 'listen' && selectedSession) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="p-4">
          <button
            onClick={backToBrowse}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Back to Live Sessions
          </button>
          <ListenerView
            session={selectedSession}
            user={user}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">🎙️ Live Podcasts</h1>
            {/* Connection Status Indicator */}
            <div className="flex items-center space-x-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-sm text-gray-500">
                {isConnected ? 'Real-time connected' : 'Refreshing manually...'}
              </span>
            </div>
          </div>
          {user.role === 'author' && !userSession && (
            <button
              onClick={createNewSession}
              className="bg-pink-600 text-white px-6 py-3 rounded-xl hover:bg-pink-700 font-medium"
            >
              🔴 Start Broadcasting
            </button>
          )}
        </div>

        {/* Debug Info */}
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs text-gray-600 dark:text-gray-400">
          Debug: Found {liveSessions.length} active sessions • User: {user.id} • Role: {user.role}
        </div>

        {/* User's Active Session */}
        {userSession && (
          <div className="bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900 dark:to-purple-900 p-6 rounded-xl border-l-4 border-pink-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-pink-800 dark:text-pink-200 text-lg">
                  🔴 Your Live Session
                </h3>
                <p className="text-pink-700 dark:text-pink-300 font-medium">{userSession.title}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <p className="text-sm text-pink-600 dark:text-pink-400">
                    👥 {userSession.listenerCount} listeners
                  </p>
                  <p className="text-sm text-pink-600 dark:text-pink-400">
                    ⏰ Started {new Date(userSession.startedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => joinSession(userSession)}
                className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 font-medium"
              >
                🎙️ Manage Studio
              </button>
            </div>
          </div>
        )}

        {/* Live Sessions Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              🔴 Live Now ({liveSessions.length})
            </h2>
            {liveSessions.length > 0 && (
              <div className="text-sm text-gray-500">
                Click any session to join as a listener
              </div>
            )}
          </div>

          {liveSessions.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-6xl mb-4">🎙️</div>
              <p className="text-xl mb-2">No live podcasts right now</p>
              <p className="text-sm">Be the first to go live and share your voice!</p>
              {user.role === 'author' && (
                <button
                  onClick={createNewSession}
                  className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 font-medium"
                >
                  🎤 Start Your First Live Session
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {liveSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-bold text-red-600">LIVE</span>
                    </div>
                    <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                      👥 {session.listenerCount}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg mb-2 line-clamp-2">{session.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    🎙️ by {session.authorName}
                  </p>

                  {session.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                      {session.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-400">
                      ⏰ {new Date(session.startedAt).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => joinSession(session)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${session.authorId === user.id
                        ? 'bg-pink-600 text-white hover:bg-pink-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                      {session.authorId === user.id ? '🎙️ Manage' : '🎧 Listen'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {liveSessions.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 p-6 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{liveSessions.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Live Sessions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {liveSessions.reduce((total, session) => total + session.listenerCount, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Total Listeners</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {liveSessions.filter(s => s.authorId !== user.id).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Available to Join</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}