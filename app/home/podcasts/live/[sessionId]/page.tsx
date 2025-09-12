'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { 
  Mic, 
  Users, 
  Heart, 
  MessageCircle, 
  Send, 
  ArrowLeft,
  Youtube,
  Volume2,
  VolumeX
} from 'lucide-react';

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
  youtubeBroadcastId?: string;
  createdAt: string;
}

interface Comment {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
  userId?: string;
}

// WebSocket connection for real-time features
class LivePodcastWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    private sessionId: string,
    private onMessage: (data: any) => void,
    private onError: (error: Event) => void
  ) {}

  connect() {
    try {
      const wsBase = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001';
      const wsUrl = `${wsBase}/podcast/${this.sessionId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onError(error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting WebSocket (attempt ${this.reconnectAttempts})`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default function LiveSessionPage() {
  const { user, isLoaded } = useUser();
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  // State
  const [session, setSession] = useState<LiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listeners, setListeners] = useState(0);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [micLost, setMicLost] = useState(false);
  
  // Refs
  const wsRef = useRef<LivePodcastWebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket message handler
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'comment':
        setComments(prev => [...prev.slice(-9), data.comment]);
        break;
      case 'listener_count':
        setListeners(data.count);
        break;
      case 'like':
        setLikes(prev => prev + 1);
        break;
      case 'room_state':
        setListeners(data.listeners || 0);
        setLikes(data.likes || 0);
        if (data.comments) {
          setComments(data.comments);
        }
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  };

  const handleWebSocketError = (error: Event) => {
    console.error('WebSocket error:', error);
  };

  // Fetch session data
  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/podcasts/session/${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        setSession(data.session);
        setListeners(data.session.listeners);
        setLikes(data.session.likes);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch session');
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      setError('Failed to load session');
    } finally {
      setIsLoading(false);
    }
  };

  // Add comment (listener)
  const addComment = () => {
    if (!newComment.trim() || !wsRef.current) return;

    const comment: Comment = {
      id: Date.now().toString(),
      user: user?.firstName || 'Anonymous',
      message: newComment.trim(),
      timestamp: new Date(),
      userId: user?.id
    };

    wsRef.current.send({
      type: 'podcast_comment',
      comment
    });

    setNewComment('');
  };

  // Resume mic (host)
  const resumeMic = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicLost(false);
    } catch (e) {
      alert('Please grant microphone permission again.');
    }
  };

  // Initialize
  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  // WebSocket connection
  useEffect(() => {
    if (session && session.isLive) {
      wsRef.current = new LivePodcastWebSocket(
        session.id,
        handleWebSocketMessage,
        handleWebSocketError
      );
      wsRef.current.connect();

      const startTime = new Date(session.startTime);
      const updateDuration = () => {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setDuration(diffInSeconds);
      };
      
      updateDuration();
      durationIntervalRef.current = setInterval(updateDuration, 1000);

      return () => {
        if (wsRef.current) {
          wsRef.current.disconnect();
        }
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }
      };
    }
  }, [session]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-gray-600 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading live session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-gray-800 dark:text-white p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/home/podcasts/discover')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Live Sessions
          </button>
          
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Session Not Available</h3>
            <p className="text-gray-400 mb-6">{error || 'This live session is no longer available.'}</p>
            <button
              onClick={() => router.push('/home/podcasts/discover')}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white transition-colors"
            >
              Browse Other Live Sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-800 dark:text-white">
      <div className="max-w-6xl mx-auto p-6">
        
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/home/podcasts/discover')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Live Sessions
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-500 font-semibold">LIVE</span>
                <span className="text-gray-400 text-sm">{duration < 360000 ? `${Math.floor(duration/60)}:${String(duration%60).padStart(2,'0')}` : ''}</span>
              </div>
              <h1 className="text-2xl font-bold">{session.title}</h1>
              <p className="text-gray-400 flex items-center gap-2">
                <Mic className="w-4 h-4" />
                {session.username}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{listeners}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <span>{likes}</span>
              </div>
              {session.youtubeWatchUrl && (
                <a
                  href={session.youtubeWatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                >
                  <Youtube className="w-4 h-4" />
                  <span className="text-sm">YouTube</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Audio Player */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Mic className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Live Audio Stream</h3>
              <p className="text-gray-400 mb-4">Listening to {session.username}'s live podcast</p>
              
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setIsMuted(m => !m)}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                >
                  {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
                {micLost && (
                  <button
                    onClick={resumeMic}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    Resume Mic
                  </button>
                )}
              </div>
            </div>

            {session.description && (
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-2">About this session</h4>
                <p className="text-gray-300">{session.description}</p>
              </div>
            )}

            {/* Hidden audio element for future audio streaming */}
            <audio ref={audioRef} style={{ display: 'none' }} />
          </div>

          {/* Live Chat */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Live Chat ({comments.length})
            </h4>

            <div className="space-y-2 mb-4 h-64 overflow-y-auto">
              {comments.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No comments yet...</p>
                  <p className="text-xs">Be the first to say something!</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="bg-gray-700 p-3 rounded-lg text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-blue-400">{comment.user}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <div className="text-gray-100">{comment.message}</div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addComment()}
                  placeholder="Type a message..."
                  className="flex-1 p-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={200}
                />
                <button
                  onClick={addComment}
                  disabled={!newComment.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 p-3 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => wsRef.current?.send({ type: 'podcast_like', userId: user?.id })}
                className="w-full bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Heart className="w-4 h-4" />
                Like this stream
              </button>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="fixed bottom-4 right-4 bg-gray-800 rounded-lg p-3 text-white shadow-lg">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              wsRef.current ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm">
              {wsRef.current ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
