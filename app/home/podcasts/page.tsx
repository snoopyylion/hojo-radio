'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useAuth } from '@clerk/nextjs';
import { Mic, Play, Pause, Square, Radio, Users, Heart, MessageCircle, Youtube } from 'lucide-react';

interface PodcastSession {
  id: string;
  title: string;
  isLive: boolean;
  startTime: Date;
  duration: number;
  listeners: number;
  likes: number;
  comments: Comment[];
  youtubeData?: {
    broadcastId: string;
    streamId: string;
    rtmpUrl: string;
    streamKey: string;
    watchUrl: string;
    embedUrl: string;
  };
}

interface Comment {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
}

export default function PodcastsPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  
  // Main state
  const [isRecording, setIsRecording] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [podcastType, setPodcastType] = useState<'live' | 'record' | null>(null);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeAccessToken, setYoutubeAccessToken] = useState<string | null>(null);
  const [isConnectingYouTube, setIsConnectingYouTube] = useState(false);
  
  // Live stream state
  const [currentSession, setCurrentSession] = useState<PodcastSession | null>(null);
  const [listeners, setListeners] = useState(0);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  
  // Recording state
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeIntervalsRef = useRef<NodeJS.Timeout[]>([]);

  // Test Clerk authentication
  const testClerkAuth = async () => {
    if (!user) {
      console.log('❌ No user found');
      return;
    }

    try {
      console.log('🔐 Testing Clerk authentication...');
      console.log('👤 User ID:', user.id);
      console.log('👤 User loaded:', isLoaded);
      
      // Test a simple authenticated API call
      const testResponse = await fetch('/api/user/youtube-status');
      console.log('🧪 Test API call status:', testResponse.status);
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log('✅ Test API call successful:', testData);
      } else {
        console.error('❌ Test API call failed:', testResponse.status);
      }
      
    } catch (error) {
      console.error('❌ Clerk auth test failed:', error);
    }
  };

  // Check YouTube connection status on mount
  useEffect(() => {
    if (user) {
      checkYouTubeStatus();
      // Test authentication
      testClerkAuth();
    }
  }, [user]);

  // Check for OAuth completion on mount
  useEffect(() => {
    // Check if we're returning from YouTube OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const oauthCode = urlParams.get('oauth_code');
    const oauthStep = urlParams.get('step');
    const oauthError = urlParams.get('error');
    const oauthMessage = urlParams.get('message');
    
    console.log('🔍 OAuth parameters detected:', { oauthCode, oauthStep, oauthError, oauthMessage });
    
    if (oauthCode && oauthStep === 'complete_auth' && user) {
      console.log('✅ Starting OAuth completion flow');
      completeYouTubeOAuth(oauthCode);
    }
    
    // Handle OAuth errors
    if (oauthError) {
      console.log('❌ OAuth error detected:', oauthError, oauthMessage);
      handleOAuthError(oauthError, oauthMessage || undefined);
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // Complete YouTube OAuth flow
  const completeYouTubeOAuth = async (code: string) => {
    if (!code) return;
    
    setIsConnectingYouTube(true);
    
    // Add a small delay to ensure Clerk session is established
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`🔄 Attempt ${retryCount + 1} to complete YouTube OAuth`);
        
        const token = await getToken();
        const response = await fetch('/api/auth/youtube/complete', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ code })
        });

        const data = await response.json();
        
        if (data.success) {
          // Clear the URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Update local state
          setYoutubeConnected(true);
          
          // Check YouTube status to get the access token
          await checkYouTubeStatus();
          
          // Show success message
          alert('YouTube account connected successfully!');
          return; // Success, exit the retry loop
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error(`❌ Attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        
        if (retryCount >= maxRetries) {
          // All retries failed
          alert('Failed to connect YouTube account after multiple attempts. Please try again.');
          
          // Clear the URL parameters on error too
          window.history.replaceState({}, document.title, window.location.pathname);
          break;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    setIsConnectingYouTube(false);
  };

  // Handle OAuth errors
  const handleOAuthError = (error: string, message?: string) => {
    let errorMessage = 'Failed to connect YouTube account.';
    
    switch (error) {
      case 'oauth_error':
        errorMessage = `YouTube OAuth error: ${message || 'Unknown error'}`;
        break;
      case 'no_code':
        errorMessage = 'No authorization code received from YouTube.';
        break;
      case 'callback_failed':
        errorMessage = 'YouTube callback failed. Please try again.';
        break;
      default:
        errorMessage = `YouTube connection error: ${error}`;
    }
    
    alert(errorMessage);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      // Clear all realtime intervals
      realtimeIntervalsRef.current.forEach(interval => clearInterval(interval));
    };
  }, []);

  // Check if user has YouTube connected
  const checkYouTubeStatus = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/user/youtube-status', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await response.json();
      if (data.success && data.connected) {
        setYoutubeConnected(true);
        setYoutubeAccessToken(data.accessToken);
      }
    } catch (error) {
      console.error('Failed to check YouTube status:', error);
    }
  };

  // Connect YouTube account
  const connectYouTube = async () => {
    try {
      const response = await fetch('/api/auth/youtube');
      const data = await response.json();
      
      if (data.success) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Failed to get YouTube auth URL:', error);
    }
  };

  // Start recording function (for backup audio)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const audioChunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // Create audio URL for playback
        if (audioRef.current) {
          audioRef.current.src = URL.createObjectURL(audioBlob);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
      // Start duration timer
      setDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
      console.log('✅ Recording started');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      alert('Failed to start recording. Please check your microphone permissions.');
    }
  };

  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    console.log('⏹️ Recording stopped');
  };

  // Start live stream - FIXED VERSION
  const startLiveStream = async (title: string) => {
    if (!user) {
      alert('Please sign in to start streaming');
      return;
    }

    if (!youtubeConnected) {
      alert('Please connect your YouTube account first to go live');
      return;
    }

    console.log('🚀 Starting live stream with:', {
      title,
      user: user.id,
      username: user.firstName || user.username || 'Anonymous',
      youtubeConnected,
      youtubeAccessToken: youtubeAccessToken ? 'present' : 'missing'
    });

    try {
      // FIXED: Remove youtubeAccessToken from request body - it should be fetched server-side
      const requestBody = {
        title,
        description: `Live podcast: ${title}`,
        userId: user.id,
        username: user.firstName || user.username || 'Anonymous'
      };

      console.log('📤 Sending request to /api/podcasts/live:', requestBody);
      console.log('🔐 User authentication state:', { isLoaded, userId: user.id });

      // Helper to call API with optional fresh token
      const callLiveApi = async (useFreshToken?: boolean) => {
        const token = useFreshToken ? await getToken({ skipCache: true }) : await getToken();
        return fetch('/api/podcasts/live', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(requestBody)
        });
      };

      // First attempt
      let response = await callLiveApi(false);

      // If unauthorized, wait briefly, fetch fresh token, and retry once
      if (response.status === 401) {
        console.warn('⚠️ 401 on live start, retrying with fresh token after short delay...');
        await new Promise(r => setTimeout(r, 1500));
        response = await callLiveApi(true);
      }

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ API error response:', errorData);

        // Handle specific error cases
        if (errorData?.requiresYouTubeAuth) {
          alert('Your YouTube connection has expired. Please reconnect and try again.');
          setYoutubeConnected(false);
          setYoutubeAccessToken(null);
          // Automatically trigger reconnect to reduce friction
          try {
            await connectYouTube();
          } catch {}
          return;
        }

        // Handle YouTube channel not enabled for live streaming
        if (errorData?.youtubeNotEnabled) {
          alert(
            'Your YouTube channel is not enabled for live streaming.\n' +
            'To fix: Verify your channel and enable live streaming, which can take up to 24 hours.\n' +
            'We\'ll open the YouTube help page for guidance.'
          );
          if (errorData?.helpUrl) {
            window.open(errorData.helpUrl, '_blank');
          }
          return;
        }

        throw new Error(errorData?.error || `HTTP ${response.status}: Server Error`);
      }

      const data = await response.json();
      console.log('✅ API response data:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown API error');
      }

      const newSession: PodcastSession = {
        id: data.session.id,
        title,
        isLive: true,
        startTime: new Date(),
        duration: 0,
        listeners: 0,
        likes: 0,
        comments: [],
        youtubeData: data.session.youtubeData
      };
      
      setCurrentSession(newSession);
      setIsLive(true);
      setShowCreateModal(false);
      
      // Start the actual recording for backup
      await startRecording();
      
      // Start real-time updates
      startRealtimeUpdates(newSession.id);

      // Show success message with YouTube link
      if (newSession.youtubeData?.watchUrl) {
        alert(`Live stream started successfully! Watch at: ${newSession.youtubeData.watchUrl}`);
      }
      
    } catch (error) {
      console.error('❌ Error starting live stream:', error);
      alert(`Failed to start live stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Start real-time updates - FIXED VERSION
  const startRealtimeUpdates = (sessionId: string) => {
    // Clear any existing intervals
    realtimeIntervalsRef.current.forEach(interval => clearInterval(interval));
    realtimeIntervalsRef.current = [];

    // Update listener count every 5 seconds
    const listenerInterval = setInterval(() => {
      if (!isLive) {
        clearInterval(listenerInterval);
        return;
      }
      
      // Simulate fluctuating listener count
      setListeners(prev => Math.max(0, prev + Math.floor(Math.random() * 10) - 4));
    }, 5000);

    // Simulate occasional comments
    const commentInterval = setInterval(() => {
      if (!isLive) {
        clearInterval(commentInterval);
        return;
      }
      
      if (Math.random() > 0.7) {
        const sampleComments = [
          "Great podcast! 👏",
          "Love this topic",
          "Can you talk about X?",
          "Amazing content!",
          "Keep it up! 🔥"
        ];
        
        const newComment: Comment = {
          id: Date.now().toString(),
          user: `Listener${Math.floor(Math.random() * 1000)}`,
          message: sampleComments[Math.floor(Math.random() * sampleComments.length)],
          timestamp: new Date()
        };
        
        setComments(prev => [...prev.slice(-9), newComment]);
      }
    }, 8000); // Changed to 8 seconds to be less frequent

    // Store intervals for cleanup
    realtimeIntervalsRef.current = [listenerInterval, commentInterval];
    
    console.log('📡 Started real-time updates for session:', sessionId);
  };

  // Stop real-time updates
  const stopRealtimeUpdates = () => {
    realtimeIntervalsRef.current.forEach(interval => clearInterval(interval));
    realtimeIntervalsRef.current = [];
    console.log('🔌 Stopped real-time updates');
  };

  // Stop live stream - FIXED VERSION
  const stopLiveStream = async () => {
    if (!currentSession?.youtubeData?.broadcastId) {
      console.error('❌ No active live session to stop');
      return;
    }

    try {
      // FIXED: Use the correct endpoint and data structure
      const token = await getToken();
      const response = await fetch('/api/podcasts/live/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          broadcastId: currentSession.youtubeData.broadcastId,
          sessionId: currentSession.id
        })
      });

      if (response.ok) {
        console.log('✅ Live stream stopped successfully');
        setIsLive(false);
        setCurrentSession(null);
        
        // Stop recording and real-time updates
        stopRecording();
        stopRealtimeUpdates();
        
        // Reset counters
        setListeners(0);
        setLikes(0);
        setComments([]);
        
        alert('Live stream ended successfully!');
      } else {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to stop live stream');
      }
    } catch (error) {
      console.error('❌ Error stopping live stream:', error);
      alert('Error stopping live stream. The stream may still be active on YouTube.');
    }
  };

  // Add comment to live stream
  const addComment = () => {
  if (!newComment.trim() || !currentSession) return;

  const comment: Comment = {
    id: Date.now().toString(),
    user: user?.firstName || 'Anonymous',
    message: newComment.trim(),
    timestamp: new Date()
  };

  setComments(prev => [...prev, comment]);
  setNewComment('');

  console.log('💬 Comment added:', comment);
};

  // Format duration helper
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Play/pause audio
  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioBlob]);

  // Like the stream
  const addLike = async () => {
    if (!currentSession) return;

    try {
      const response = await fetch('/api/podcasts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession.id
        })
      });

      const data = await response.json();
      if (data.success) {
        setLikes(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to add like:', error);
    }
  };

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
    <div className="min-h-screen bg-white dark:bg-black text-gray-800 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Podcast Studio</h1>
          <p className="text-gray-400">Create, record, and broadcast your podcasts live</p>
        </div>

        {/* YouTube Connection Status */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Youtube className="w-6 h-6 text-red-500" />
              <div>
                <h3 className="font-semibold">YouTube Integration</h3>
                <p className="text-sm text-gray-400">
                  {youtubeConnected ? 'Connected and ready to go live' : 'Connect to stream on YouTube'}
                </p>
              </div>
            </div>
            {!youtubeConnected ? (
              <button
                onClick={connectYouTube}
                disabled={isConnectingYouTube}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isConnectingYouTube 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isConnectingYouTube ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Connecting...
                  </div>
                ) : (
                  'Connect YouTube'
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Connected</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        {!currentSession && !audioBlob && (
          <div>
            <div className="flex gap-6 mb-8">
              <button
                onClick={() => {
                  if (!youtubeConnected) {
                    alert('Please connect your YouTube account first to go live');
                    return;
                  }
                  setPodcastType('live');
                  setShowCreateModal(true);
                }}
                className={`p-4 rounded-lg transition-colors ${
                  youtubeConnected 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
                disabled={!youtubeConnected}
              >
                <Radio className="w-6 h-6 mx-auto mb-2" />
                <div className="font-semibold">Go Live</div>
                <div className="text-sm text-gray-300">
                  {youtubeConnected ? 'Stream on YouTube' : 'Connect YouTube first'}
                </div>
              </button>
              <button
                onClick={() => {
                  setPodcastType('record');
                  startRecording();
                }}
                className="bg-blue-600 hover:bg-blue-700 p-4 rounded-lg transition-colors"
              >
                <Mic className="w-6 h-6 mx-auto mb-2" />
                <div className="font-semibold">Record</div>
                <div className="text-sm text-gray-300">Create offline</div>
              </button>
            </div>
          </div>
        )}

        {/* Recording Interface */}
        {isRecording && !isLive && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-center mb-6">
              <div className="w-4 h-4 bg-red-500 rounded-full mx-auto mb-2 animate-pulse" />
              <h3 className="text-xl font-bold">Recording...</h3>
              <p className="text-2xl font-mono mt-2">{formatDuration(duration)}</p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={stopRecording}
                className="bg-red-600 hover:bg-red-700 p-4 rounded-full transition-colors"
              >
                <Square className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* Live Stream Interface */}
        {isLive && currentSession && (
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Main Stream Panel */}
            <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-500 font-semibold">LIVE</span>
                  </div>
                  <h3 className="text-xl font-bold">{currentSession.title}</h3>
                  {currentSession.youtubeData && (
                    <a 
                      href={currentSession.youtubeData.watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 text-sm hover:underline flex items-center gap-1"
                    >
                      <Youtube className="w-4 h-4" />
                      Watch on YouTube
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono">{formatDuration(duration)}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{listeners}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span>{likes}</span>
                </div>
              </div>

              {currentSession.youtubeData && (
                <div className="mb-4 p-3 bg-gray-700 rounded text-sm">
                  <p className="font-semibold mb-1">Streaming to YouTube</p>
                  <p className="text-gray-300">RTMP: {currentSession.youtubeData.rtmpUrl}</p>
                  <p className="text-gray-300">Stream Key: {currentSession.youtubeData.streamKey}</p>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={stopLiveStream}
                  className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  End Stream
                </button>
              </div>
            </div>

            {/* Live Chat */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Live Chat
              </h4>

              <div className="space-y-2 mb-4 h-64 overflow-y-auto">
                {comments.map(comment => (
                  <div key={comment.id} className="bg-gray-700 p-2 rounded text-sm">
                    <div className="font-semibold text-blue-400">{comment.user}</div>
                    <div>{comment.message}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addComment()}
                  placeholder="Type a message..."
                  className="w-full p-2 bg-gray-700 rounded"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addComment}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 p-2 rounded transition-colors"
                  >
                    Send
                  </button>
                  <button
                    onClick={addLike}
                    className="bg-red-600 hover:bg-red-700 p-2 rounded transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Playback Interface */}
        {audioBlob && !isRecording && !isLive && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">Recording Complete!</h3>
            <p className="text-gray-400 mb-6">Duration: {formatDuration(duration)}</p>
            
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={togglePlayback}
                className="bg-blue-600 hover:bg-blue-700 p-3 rounded-full transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setAudioBlob(null);
                  setDuration(0);
                }}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition-colors"
              >
                Record Again
              </button>
              <button
                onClick={() => {
                  // In real app: upload to server/podcast platform
                  alert('Upload functionality would be implemented here!');
                }}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
              >
                Save & Upload
              </button>
            </div>
          </div>
        )}

        {/* Create Live Stream Modal */}
        {showCreateModal && podcastType === 'live' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Start Live Stream</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Stream Title</label>
                <input
                  type="text"
                  placeholder="Enter your podcast title..."
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 outline-none"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const title = (e.target as HTMLInputElement).value;
                      if (title.trim()) startLiveStream(title);
                    }
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder*="podcast title"]') as HTMLInputElement;
                    if (input?.value.trim()) startLiveStream(input.value);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded transition-colors"
                >
                  Go Live
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      </div>
    </div>
  );
}
