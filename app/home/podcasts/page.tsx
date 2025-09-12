'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Mic, Play, Pause, Square, Radio, Users, Heart, MessageCircle, Youtube, Send } from 'lucide-react';
import PodcastNavigation from '@/components/PodcastNavigation';

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
  userId?: string;
}

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

// WebSocket connection for real-time features
class LivePodcastWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    private sessionId: string,
    private onMessage: (data: WebSocketMessage) => void,
    private onError: (error: Event) => void
  ) { }

  connect() {
    try {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/podcast/${this.sessionId}`;
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

  send(data: WebSocketMessage) {
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


declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    MediaRecorder: {
      isTypeSupported?: (type: string) => boolean;
      new(stream: MediaStream, options?: MediaRecorderOptions): MediaRecorder;
    };
  }
}

export default function PodcastsPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  // Main state
  const [isRecording, setIsRecording] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [podcastType, setPodcastType] = useState<'live' | 'record' | null>(null);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [, setYoutubeAccessToken] = useState<string | null>(null);
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
  const [audioLevel, setAudioLevel] = useState(0);

  // WebRTC and streaming refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<LivePodcastWebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket message handler
  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case 'comment':
        setComments(prev => [...prev.slice(-9), data.comment as Comment]);
        break;
      case 'listener_count':
        setListeners(data.count as number);
        break;
      case 'like':
        setLikes(prev => prev + 1);
        break;
      case 'stream_status':
        setIsStreaming(data.streaming as boolean);
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  };

  const handleWebSocketError = (error: Event) => {
    console.error('WebSocket error:', error);
  };

  // Audio level monitoring
  const startAudioLevelMonitoring = async (stream: MediaStream) => {
    try {
      // Stop any existing monitoring first
      stopAudioLevelMonitoring();

      // Create AudioContext with user gesture (already handled by getUserMedia)
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

      // Resume context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        if (analyserRef.current && audioContextRef.current?.state === 'running') {
          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate RMS (more accurate than average)
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / bufferLength);
          const level = Math.min(1, rms / 255);

          setAudioLevel(level);
        }
      };

      audioLevelIntervalRef.current = setInterval(updateAudioLevel, 100);

      // Test that monitoring is working
      setTimeout(() => {
        if (audioLevel === 0) {
          console.warn('Audio level still 0 after 2 seconds - check microphone');
          console.log('Audio context state:', audioContextRef.current?.state);
          console.log('Analyser exists:', !!analyserRef.current);
          console.log('Stream active:', stream.getTracks().every(track => track.readyState === 'live'));
        }
      }, 2000);

    } catch (error) {
      console.error('Failed to start audio level monitoring:', error);
      setAudioLevel(0);
    }
  };

  const stopAudioLevelMonitoring = () => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch { }
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // Check YouTube connection status on mount
  useEffect(() => {
    if (user) {
      checkYouTubeStatus();
    }
  }, [user]);

  // Auto-rejoin author's current live session on mount
  useEffect(() => {
    const rejoin = async () => {
      if (!user) return;
      try {
        const res = await fetch('/api/podcasts/current');
        const data = await res.json();
        if (data.success && data.session) {
          const s = data.session;
          const newSession: PodcastSession = {
            id: s.id,
            title: s.title,
            isLive: true,
            startTime: new Date(s.startTime),
            duration: s.duration || 0,
            listeners: s.listeners || 0,
            likes: s.likes || 0,
            comments: [],
            youtubeData: s.youtubeWatchUrl ? { broadcastId: '', streamId: '', rtmpUrl: '', streamKey: '', watchUrl: s.youtubeWatchUrl, embedUrl: '' } : undefined
          };
          setCurrentSession(newSession);
          setIsLive(true);
          // Reconnect WS
          wsRef.current = new LivePodcastWebSocket(
            newSession.id,
            handleWebSocketMessage,
            handleWebSocketError
          );
          wsRef.current.connect();
        }
      } catch {
        console.warn('No current live session to rejoin');
      }
    };
    rejoin();
  }, [user]);

  // Check for OAuth completion on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthCode = urlParams.get('oauth_code');
    const oauthStep = urlParams.get('step');
    const oauthError = urlParams.get('error');
    const oauthMessage = urlParams.get('message');

    if (oauthCode && oauthStep === 'complete_auth' && user) {
      completeYouTubeOAuth(oauthCode);
    }

    if (oauthError) {
      handleOAuthError(oauthError, oauthMessage || undefined);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
      stopAudioLevelMonitoring();
    };
  }, []);

  const completeYouTubeOAuth = async (code: string) => {
    if (!code) return;

    setIsConnectingYouTube(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
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
          window.history.replaceState({}, document.title, window.location.pathname);
          setYoutubeConnected(true);
          await checkYouTubeStatus();
          alert('YouTube account connected successfully!');
          return;
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error);
        retryCount++;

        if (retryCount >= maxRetries) {
          alert('Failed to connect YouTube account after multiple attempts. Please try again.');
          window.history.replaceState({}, document.title, window.location.pathname);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsConnectingYouTube(false);
  };

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

    // Only stop audio level monitoring if not live streaming
    if (!isLive) {
      stopAudioLevelMonitoring();
    }
    console.log('Recording stopped');
  };

  const sendAudioChunk = async (audioData: Blob) => {
    if (!currentSession?.youtubeData) return;

    try {
      const response = await fetch('/api/podcasts/rtmp-bridge', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-session-id': currentSession.id,
        },
        body: audioData,
      });

      if (!response.ok) {
        console.error('Failed to send audio chunk');
      }
    } catch (error) {
      console.error('Error sending audio chunk:', error);
    }
  };

  const startRecording = async () => {
    try {
      // First check if we have permission
      try {
        const permissionStatus = await navigator?.permissions?.query?.({ name: 'microphone' as PermissionName });
        if (permissionStatus && permissionStatus.state === 'denied') {
          alert('Microphone access denied. Please enable microphone permissions in your browser settings.');
          return;
        }
      } catch { }

      // Request microphone with proper constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 2
        }
      });

      streamRef.current = stream;

      // Wait a moment for stream to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));

      await startAudioLevelMonitoring(stream);

      // UPDATED: Always use webm/opus with strict validation
      const mimeType = 'audio/webm;codecs=opus';
      if (!window.MediaRecorder?.isTypeSupported?.(mimeType)) {
        console.error("Browser does not support webm/opus recording!");
        alert("Your browser does not support WebM/Opus recording. Please use Chrome, Firefox, or Edge.");

        // Cleanup stream
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        stopAudioLevelMonitoring();
        return;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000 // 128kbps to match backend
      });

      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);

          // Send audio data for live streaming
          if (isLive && currentSession) {
            setIsStreaming(true);
            sendAudioChunk(event.data);
          }
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        setAudioBlob(audioBlob);

        if (audioRef.current) {
          audioRef.current.src = URL.createObjectURL(audioBlob);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      // UPDATED: 500ms chunks for faster streaming response
      mediaRecorder.start(500);
      setIsRecording(true);

      setDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      console.log('Recording started successfully with webm/opus, 500ms chunks');
    } catch (error: unknown) {
      console.error('Failed to start recording:', error);

      // Provide specific error messages
      const err = error as { name?: string; message?: string };
      if (err?.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone access and refresh the page.');
      } else if (err?.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      } else if (err?.name === 'NotReadableError') {
        alert('Microphone is being used by another application. Please close other apps and try again.');
      } else {
        alert(`Failed to access microphone: ${err?.message || 'Unknown error'}`);
      }
    }
  };

  const startRecordingWithStreaming = async (sessionId: string) => {
    try {
      // First check if we have permission
      try {
        const permissionStatus = await navigator?.permissions?.query?.({ name: 'microphone' as PermissionName });
        if (permissionStatus && permissionStatus.state === 'denied') {
          alert('Microphone access denied. Please enable microphone permissions in your browser settings.');
          return;
        }
      } catch { }

      // UPDATED: Strict webm/opus validation upfront
      const mimeType = 'audio/webm;codecs=opus';
      if (!window.MediaRecorder?.isTypeSupported?.(mimeType)) {
        console.error("Browser does not support webm/opus recording!");
        alert("Your browser does not support WebM/Opus live streaming. Please use Chrome, Firefox, or Edge.");
        return;
      }

      // Verify RTMP bridge is running before starting
      console.log('Verifying RTMP bridge is running...');
      const token = await getToken();

      // Try status check multiple times with delays
      let statusData = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          console.log(`Checking RTMP bridge status (attempt ${attempt + 1}/5)...`);
          const statusResponse = await fetch('/api/podcasts/rtmp-bridge', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              action: 'status',
              sessionId: sessionId
            }),
          });

          statusData = await statusResponse.json();
          console.log('Status response:', statusData);

          if (statusData.success && statusData.running) {
            console.log('RTMP bridge is running, starting audio capture...');
            break;
          }

          if (attempt < 4) {
            console.log(`RTMP bridge not ready, retrying in 2 seconds... (attempt ${attempt + 1}/5)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error('Status check failed:', error);
          if (attempt < 4) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!statusData || !statusData.success || !statusData.running) {
        console.error('RTMP bridge is not running after multiple attempts, trying to restart...');

        // Try to restart the RTMP bridge
        try {
          console.log('Attempting to restart RTMP bridge...');
          const restartResponse = await fetch('/api/podcasts/rtmp-bridge', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              action: 'start',
              sessionId: sessionId,
              rtmpUrl: currentSession?.youtubeData?.rtmpUrl,
              streamKey: currentSession?.youtubeData?.streamKey,
            }),
          });

          const restartData = await restartResponse.json();
          if (!restartResponse.ok) {
            console.error('Failed to restart RTMP bridge:', restartData);
            alert('Failed to start streaming: RTMP bridge not ready. Please try again.');
            return;
          }

          console.log('RTMP bridge restarted successfully, waiting 3 seconds...');
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Check status one more time
          const finalStatusResponse = await fetch('/api/podcasts/rtmp-bridge', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              action: 'status',
              sessionId: sessionId
            }),
          });

          const finalStatusData = await finalStatusResponse.json();
          if (!finalStatusData.success || !finalStatusData.running) {
            console.error('RTMP bridge still not running after restart');
            alert('Failed to start streaming: RTMP bridge not ready. Please try again.');
            return;
          }

          console.log('RTMP bridge is now running after restart');
        } catch (error) {
          console.error('Failed to restart RTMP bridge:', error);
          alert('Failed to start streaming: RTMP bridge not ready. Please try again.');
          return;
        }
      }

      // Request microphone with proper constraints
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 2
        }
      });

      console.log('Microphone access granted, stream tracks:', stream.getTracks().map(t => ({
        kind: t.kind,
        readyState: t.readyState,
        enabled: t.enabled
      })));

      streamRef.current = stream;

      // Wait a moment for stream to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Start audio level monitoring and keep it running
      await startAudioLevelMonitoring(stream);

      // UPDATED: Create MediaRecorder with strict config matching backend
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000 // Match backend 128kbps
      });

      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);

          // Always send audio data for live streaming
          setIsStreaming(true);
          console.log(`MediaRecorder data available: ${event.data.size} bytes, type: ${event.data.type}`);
          sendAudioChunkForSession(event.data, sessionId);
        } else {
          console.warn('MediaRecorder data available but size is 0');
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        setAudioBlob(audioBlob);

        if (audioRef.current) {
          audioRef.current.src = URL.createObjectURL(audioBlob);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      // UPDATED: 500ms chunks for faster streaming response
      mediaRecorder.start(500);
      setIsRecording(true);

      setDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      console.log('Live streaming started successfully with webm/opus, 500ms chunks, 128kbps');
    } catch (error: unknown) {
      console.error('Failed to start live streaming:', error);

      // Provide specific error messages
      const err = error as { name?: string; message?: string };
      if (err?.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone access and refresh the page.');
      } else if (err?.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      } else if (err?.name === 'NotReadableError') {
        alert('Microphone is being used by another application. Please close other apps and try again.');
      } else {
        alert(`Failed to access microphone: ${err?.message || 'Unknown error'}`);
      }
    }
  };

  // UPDATED: Enhanced audio chunk sending with better error handling
  const sendAudioChunkForSession = async (audioData: Blob, sessionId: string) => {
    try {
      // Validate chunk before sending
      if (audioData.size === 0) {
        console.warn('Skipping empty audio chunk');
        return;
      }

      // Verify it's the correct format
      if (audioData.type && !audioData.type.includes('webm')) {
        console.warn(`Unexpected audio chunk type: ${audioData.type}`);
      }

      console.log(`Sending audio chunk for session ${sessionId}, size: ${audioData.size} bytes, type: ${audioData.type}`);

      const token = await getToken();
      const response = await fetch('/api/podcasts/rtmp-bridge', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-session-id': sessionId,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: audioData,
      });

      if (!response.ok) {
        console.error('Failed to send audio chunk:', response.status, response.statusText);

        // Handle stream ended (404 or 410)
        if (response.status === 404 || response.status === 410) {
          console.error('Stream session ended, stopping audio capture');
          setIsStreaming(false);

          // Stop the media recorder and cleanup
          if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
          }

          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          stopAudioLevelMonitoring();

          // Don't show alert for normal stream ending
          const responseData = await response.json().catch(() => null);
          if (responseData?.streamEnded) {
            console.log('Stream ended normally');
          } else {
            alert('Live stream connection lost. The stream has ended.');
          }
          return;
        }
      } else {
        // Log successful chunks periodically
        if (Math.random() < 0.1) { // 10% of chunks
          console.log('✅ Audio chunk sent successfully');
        }
      }
    } catch (error) {
      console.error('Error sending audio chunk:', error);

      // Handle network errors that might indicate stream issues
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('Network error, stream may have ended');
        setIsStreaming(false);
      }
    }
  };


  const startLiveStream = async (title: string) => {
    if (!user) {
      alert('Please sign in to start streaming');
      return;
    }

    if (!youtubeConnected) {
      alert('Please connect your YouTube account first to go live');
      return;
    }

    try {
      const requestBody = {
        title,
        description: `Live podcast: ${title}`,
        userId: user.id,
        username: user.firstName || user.username || 'Anonymous'
      };

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

      let response = await callLiveApi(false);

      if (response.status === 401) {
        console.warn('401 on live start, retrying with fresh token...');
        await new Promise(r => setTimeout(r, 1500));
        response = await callLiveApi(true);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        if (errorData?.requiresYouTubeAuth) {
          alert('Your YouTube connection has expired. Please reconnect and try again.');
          setYoutubeConnected(false);
          setYoutubeAccessToken(null);
          try {
            await connectYouTube();
          } catch { }
          return;
        }

        if (errorData?.youtubeNotEnabled) {
          alert(
            'Your YouTube channel is not enabled for live streaming.\n' +
            'To fix: Verify your channel and enable live streaming, which can take up to 24 hours.'
          );
          if (errorData?.helpUrl) {
            window.open(errorData.helpUrl, '_blank');
          }
          return;
        }

        throw new Error(errorData?.error || `HTTP ${response.status}: Server Error`);
      }

      const data = await response.json();

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

      // Initialize WebSocket connection (retained for chat/likes only)
      wsRef.current = new LivePodcastWebSocket(
        newSession.id,
        handleWebSocketMessage,
        handleWebSocketError
      );
      wsRef.current.connect();

      // Start RTMP bridge
      try {
        const token = await getToken();
        console.log('Starting RTMP bridge for session:', newSession.id);
        console.log('RTMP URL:', newSession.youtubeData?.rtmpUrl);
        console.log('Stream Key:', newSession.youtubeData?.streamKey ? '***' + newSession.youtubeData.streamKey.slice(-4) : 'undefined');

        const rtmpResponse = await fetch('/api/podcasts/rtmp-bridge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            action: 'start',
            sessionId: newSession.id,
            rtmpUrl: newSession.youtubeData?.rtmpUrl,
            streamKey: newSession.youtubeData?.streamKey,
          }),
        });

        const rtmpData = await rtmpResponse.json();

        if (!rtmpResponse.ok) {
          console.error('Failed to start RTMP bridge:', rtmpResponse.status, rtmpResponse.statusText, rtmpData);
          throw new Error(`RTMP bridge failed: ${rtmpData.error || 'Unknown error'}`);
        } else {
          console.log('RTMP bridge started successfully:', rtmpData);
        }
      } catch (error) {
        console.error('Error starting RTMP bridge:', error);
        alert(`Failed to start streaming: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }

      // Wait a moment for RTMP bridge to initialize
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Start recording and streaming with audio level monitoring
      await startRecordingWithStreaming(newSession.id);

      if (newSession.youtubeData?.watchUrl) {
        alert(`Live stream started successfully! Watch at: ${newSession.youtubeData.watchUrl}`);
      }

    } catch (error) {
      console.error('Error starting live stream:', error);
      alert(`Failed to start live stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const stopLiveStream = async () => {
    if (!currentSession?.youtubeData?.broadcastId) {
      console.error('No active live session to stop');
      return;
    }

    try {
      // Stop RTMP bridge first
      try {
        const token = await getToken();
        await fetch('/api/podcasts/rtmp-bridge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ action: 'stop', sessionId: currentSession.id }),
        });
      } catch { }

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
        console.log('Live stream stopped successfully');
        setIsLive(false);
        setIsStreaming(false);
        setCurrentSession(null);

        stopRecording();
        stopAudioLevelMonitoring();

        if (wsRef.current) {
          wsRef.current.disconnect();
          wsRef.current = null;
        }

        setListeners(0);
        setLikes(0);
        setComments([]);

        alert('Live stream ended successfully!');
      } else {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to stop live stream');
      }
    } catch (error) {
      console.error('Error stopping live stream:', error);
      alert('Error stopping live stream. The stream may still be active on YouTube.');
    }
  };

  const addComment = () => {
    if (!newComment.trim() || !currentSession || !wsRef.current) return;

    const comment: Comment = {
      id: Date.now().toString(),
      user: user?.firstName || 'Anonymous',
      message: newComment.trim(),
      timestamp: new Date(),
      userId: user?.id
    };

    // Send comment via WebSocket
    wsRef.current.send({
      type: 'comment',
      sessionId: currentSession.id,
      comment
    });

    setNewComment('');
  };

  const addLike = async () => {
    if (!currentSession || !wsRef.current) return;

    wsRef.current.send({
      type: 'like',
      sessionId: currentSession.id,
      userId: user?.id
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await startAudioLevelMonitoring(stream);

      // Play the live mic stream through the hidden audio element
      const audioEl = audioRef.current;
      const previousSrc = audioEl?.src || '';
      if (audioEl) {
        try { audioEl.pause(); } catch { }
        audioEl.src = '';
        audioEl.srcObject = stream;
        audioEl.muted = false;
        try { await audioEl.play(); } catch { }
      }

      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        stopAudioLevelMonitoring();
        // Stop preview and restore previous audio if any
        if (audioEl) {
          try { audioEl.pause(); } catch { }
          audioEl.srcObject = null;
          if (previousSrc) {
            audioEl.src = previousSrc;
          }
        }
        alert('Microphone test complete!');
      }, 5000);
    } catch (error: unknown) {
      alert('Microphone test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const debugAudioLevel = () => {
    console.log('Audio Level Debug Info:');
    console.log('- Current audio level:', audioLevel);
    console.log('- Audio context state:', audioContextRef.current?.state);
    console.log('- Analyser exists:', !!analyserRef.current);
    console.log('- Stream exists:', !!streamRef.current);
    console.log('- Is recording:', isRecording);
    console.log('- Is live:', isLive);
    console.log('- Is streaming:', isStreaming);

    if (audioContextRef.current) {
      console.log('- Audio context sample rate:', audioContextRef.current.sampleRate);
      console.log('- Audio context current time:', audioContextRef.current.currentTime);
    }

    if (analyserRef.current) {
      console.log('- Analyser FFT size:', analyserRef.current.fftSize);
      console.log('- Analyser frequency bin count:', analyserRef.current.frequencyBinCount);
    }
  };

  const checkStreamStatus = async () => {
    if (!currentSession?.id) {
      console.log('No active session to check');
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch('/api/podcasts/rtmp-bridge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'status',
          sessionId: currentSession.id
        }),
      });

      const data = await response.json();
      console.log('Stream status:', data);

      if (data.success && data.running) {
        console.log('✅ RTMP bridge is running');
      } else {
        console.log('❌ RTMP bridge is not running');
      }
    } catch (error) {
      console.error('Failed to check stream status:', error);
    }
  };

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
      <div className="max-w-4xl mx-auto">

        <PodcastNavigation />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Live Podcast Studio</h1>
              <p className="text-gray-400">Create, record, and broadcast your podcasts live with real-time interaction</p>
            </div>
            <button
              onClick={() => router.push('/home/podcasts/discover')}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white transition-colors flex items-center gap-2"
            >
              <Radio className="w-4 h-4" />
              Discover Live Podcasts
            </button>
          </div>
        </div>

        {/* YouTube Connection Status */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Youtube className="w-6 h-6 text-red-500" />
              <div>
                <h3 className="font-semibold text-white">YouTube Integration</h3>
                <p className="text-sm text-gray-400">
                  {youtubeConnected ? 'Connected and ready to go live' : 'Connect to stream on YouTube'}
                </p>
              </div>
            </div>
            {!youtubeConnected ? (
              <button
                onClick={connectYouTube}
                disabled={isConnectingYouTube}
                className={`px-4 py-2 rounded-lg transition-colors ${isConnectingYouTube
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
                  } text-white`}
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
                <button
                  onClick={testMicrophone}
                  className="ml-4 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-white text-xs"
                >
                  Test Microphone
                </button>
                <button
                  onClick={debugAudioLevel}
                  className="ml-2 bg-gray-600 hover:bg-gray-700 px-3 py-1.5 rounded text-white text-xs"
                >
                  Debug Audio
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Audio Level Indicator */}
        {(isRecording || isLive) && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Mic className={`w-5 h-5 ${audioLevel > 0.1 ? 'text-green-500' : 'text-gray-400'}`} />
              <div className="flex-1">
                <div className="text-sm text-gray-400 mb-1">
                  Audio Level {isLive ? '(Live)' : '(Recording)'}
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-100 ${audioLevel > 0.7 ? 'bg-red-500' :
                      audioLevel > 0.3 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                    style={{ width: `${Math.min(100, Math.max(0, audioLevel * 100))}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                {Math.round(Math.min(100, Math.max(0, audioLevel * 100)))}%
              </div>
            </div>
            {isLive && audioLevel === 0 && (
              <div className="text-xs text-red-400 mt-2">
                ⚠️ No audio detected. Check your microphone connection.
              </div>
            )}
          </div>
        )}

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
                className={`p-6 rounded-lg transition-colors ${youtubeConnected
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-600 cursor-not-allowed'
                  } text-white`}
                disabled={!youtubeConnected}
              >
                <Radio className="w-8 h-8 mx-auto mb-3" />
                <div className="font-bold text-lg">Go Live</div>
                <div className="text-sm opacity-80">
                  {youtubeConnected ? 'Stream live on YouTube' : 'Connect YouTube first'}
                </div>
                <div className="text-xs opacity-60 mt-1">
                  Real-time audio + chat
                </div>
              </button>
              <button
                onClick={() => {
                  setPodcastType('record');
                  startRecording();
                }}
                className="bg-blue-600 hover:bg-blue-700 p-6 rounded-lg transition-colors text-white"
              >
                <Mic className="w-8 h-8 mx-auto mb-3" />
                <div className="font-bold text-lg">Record</div>
                <div className="text-sm opacity-80">Create offline</div>
                <div className="text-xs opacity-60 mt-1">
                  High quality recording
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Recording Interface */}
        {isRecording && !isLive && (
          <div className="bg-gray-800 rounded-lg p-6 text-white">
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
            <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-500 font-semibold">LIVE</span>
                    {isStreaming && <span className="text-green-500 text-sm">• Streaming</span>}
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
                  <p className="text-gray-300">Status: {isStreaming ? 'Active' : 'Connecting...'}</p>
                </div>
              )}

              <div className="flex justify-center gap-4">
                <button
                  onClick={checkStreamStatus}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-3 rounded-lg font-semibold transition-colors"
                >
                  Check Status
                </button>
                <button
                  onClick={stopLiveStream}
                  className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  End Stream
                </button>
              </div>
            </div>

            {/* Live Chat */}
            <div className="bg-gray-800 rounded-lg p-4 text-white">
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
                    onKeyPress={(e) => e.key === 'Enter' && addComment()}
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
                  onClick={addLike}
                  className="w-full bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Heart className="w-4 h-4" />
                  Like this stream
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Playback Interface */}
        {audioBlob && !isRecording && !isLive && (
          <div className="bg-gray-800 rounded-lg p-6 text-white">
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
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md text-white">
              <h3 className="text-xl font-bold mb-4">Start Live Stream</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Stream Title</label>
                <input
                  type="text"
                  placeholder="Enter your podcast title..."
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 outline-none text-white placeholder-gray-400"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const title = (e.target as HTMLInputElement).value;
                      if (title.trim()) startLiveStream(title);
                    }
                  }}
                />
                <p className="text-xs text-gray-400 mt-1">
                  This will be visible to your YouTube audience
                </p>
              </div>

              <div className="mb-6 p-3 bg-gray-700 rounded-lg text-sm">
                <h4 className="font-semibold mb-2">What happens when you go live:</h4>
                <ul className="space-y-1 text-gray-300">
                  <li>• Creates a YouTube live stream</li>
                  <li>• Starts real-time audio broadcasting</li>
                  <li>• Enables live chat for viewers</li>
                  <li>• Records a backup audio file</li>
                </ul>
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

        {/* Connection Status */}
        {isLive && (
          <div className="fixed bottom-4 right-4 bg-gray-800 rounded-lg p-3 text-white shadow-lg">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${wsRef.current ? 'bg-green-500' : 'bg-red-500'
                }`} />
              <span className="text-sm">
                {wsRef.current ? 'Connected' : 'Reconnecting...'}
              </span>
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