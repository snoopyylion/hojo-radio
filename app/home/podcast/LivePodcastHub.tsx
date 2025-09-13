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
            <div className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#EF3866]' : 'bg-black dark:bg-white'} ${isConnected && 'animate-pulse'}`}></div>
              <span className="text-sm text-black dark:text-white opacity-60">
                {isConnected ? 'Live' : 'Reconnecting...'}
              </span>
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