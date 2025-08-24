'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Mic, Play, Pause, Square, Radio, Users, Heart, MessageCircle } from 'lucide-react';

interface PodcastSession {
  id: string;
  title: string;
  isLive: boolean;
  startTime: Date;
  duration: number;
  listeners: number;
  likes: number;
  comments: Comment[];
}

interface Comment {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
}

export default function PodcastsPage() {
  const { user, isLoaded } = useUser();
  
  // Main state
  const [isRecording, setIsRecording] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [podcastType, setPodcastType] = useState<'live' | 'record' | null>(null);
  
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  // Start recording
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
        audioChunks.push(event.data);
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
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start duration timer
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }
  };

  // Start live stream
  const startLiveStream = async (title: string) => {
    if (!user) {
      alert('Please sign in to start streaming');
      return;
    }

    try {
      // Call your API to create live session
      const response = await fetch('/api/podcasts/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          userId: user.id,
          username: user.firstName || user.username || 'Anonymous'
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }

      const newSession: PodcastSession = {
        id: data.session.id,
        title,
        isLive: true,
        startTime: new Date(),
        duration: 0,
        listeners: 0,
        likes: 0,
        comments: []
      };
      
      setCurrentSession(newSession);
      setIsLive(true);
      setShowCreateModal(false);
      
      // Simulate real-time updates
      simulateLiveData();
      
      // Start the actual recording for backup
      await startRecording();
      
    } catch (error) {
      console.error('Error starting live stream:', error);
      alert('Failed to start live stream. Please try again.');
    }
  };

  // Stop live stream
  const stopLiveStream = () => {
    setIsLive(false);
    setCurrentSession(null);
    stopRecording();
    
    // In real implementation: end YouTube broadcast
  };

  // Simulate live data updates
  const simulateLiveData = () => {
    const interval = setInterval(() => {
      if (!isLive) {
        clearInterval(interval);
        return;
      }
      
      // Simulate fluctuating listener count
      setListeners(prev => Math.max(0, prev + Math.floor(Math.random() * 10) - 4));
      
      // Simulate occasional comments
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
    }, 3000);
  };

  // Handle audio playback
  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Add comment to live stream
  const addComment = async () => {
    if (!newComment.trim() || !user || !currentSession) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      user: user.firstName || user.username || 'Anonymous',
      message: newComment,
      timestamp: new Date()
    };
    
    // Send to API for real-time broadcasting
    try {
      await fetch('/api/podcasts/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession.id,
          message: newComment,
          userId: user.id,
          username: comment.user
        })
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
    
    setComments(prev => [...prev, comment]);
    setNewComment('');
  };

  // Like the stream
  const addLike = () => {
    setLikes(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Podcast Studio</h1>
          <p className="text-gray-400">Create, record, and broadcast your podcasts live</p>
        </div>

        {/* Main Content */}
  {!currentSession && !audioBlob && (
    !isLoaded ? (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    ) : (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Podcast Studio</h1>
          <p className="text-gray-400">Create, record, and broadcast your podcasts live</p>
        </div>
        <div className="flex gap-6 mb-8">
          <button
            onClick={() => {
              setPodcastType('live');
              setShowCreateModal(true);
            }}
            className="bg-red-600 hover:bg-red-700 p-4 rounded-lg transition-colors"
          >
            <Radio className="w-6 h-6 mx-auto mb-2" />
            <div className="font-semibold">Go Live</div>
            <div className="text-sm text-gray-300">Stream in real-time</div>
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
    )
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