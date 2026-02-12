// app/home/podcast/components/GuestRequestsPanel.tsx - UPDATED
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, User, Clock, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from "sonner";

interface GuestRequest {
  id: string;
  user_id: string;
  message: string;
  requested_at: string;
  status: string;
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  };
}

interface GuestRequestsPanelProps {
  sessionId: string;
  onApproveRequest: (requestId: string, userId: string) => Promise<void>;
  onRejectRequest: (requestId: string) => Promise<void>;
}

export function GuestRequestsPanel({ 
  sessionId, 
  onApproveRequest, 
  onRejectRequest 
}: GuestRequestsPanelProps) {
  const [requests, setRequests] = useState<GuestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setWsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttempts = useRef(0);

  // Enhanced WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!sessionId) {
      console.error('❌ No session ID provided');
      return;
    }

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close(1000, 'Reconnecting');
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionStatus('connecting');
    connectionAttempts.current++;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001';
    const wsPath = `${wsUrl}/podcast/${sessionId}?role=host&userId=host_${Date.now()}`;
    
    console.log(`🔄 Connecting to WebSocket (attempt ${connectionAttempts.current}):`, wsPath);

    try {
      const ws = new WebSocket(wsPath);
      wsRef.current = ws;

      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.warn('⏰ WebSocket connection timeout');
          ws.close();
          handleReconnect();
        }
      }, 10000);

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        clearTimeout(connectionTimeout);
        setWsConnected(true);
        setConnectionStatus('connected');
        connectionAttempts.current = 0;
        
        // Send authentication with session info
        ws.send(JSON.stringify({
          type: 'auth',
          role: 'host',
          sessionId: sessionId,
          timestamp: Date.now(),
          action: 'host_joined'
        }));

        // Start heartbeat
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
              type: 'ping', 
              timestamp: Date.now(),
              sessionId: sessionId 
            }));
          }
        }, 25000); // Every 25 seconds

        toast.success("🎙️ Connected - Ready to receive guest requests", {
          duration: 3000,
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message:', data.type);

          switch (data.type) {
            case 'guest_request_update':
            case 'new_guest_request':
              console.log('➕ New guest request received:', data.request);
              
              setRequests(prev => {
                // Avoid duplicates
                const exists = prev.some(req => req.id === data.request.id || req.user_id === data.request.user_id);
                if (exists) {
                  console.log('⚠️ Duplicate request, updating:', data.request.id);
                  return prev.map(req => 
                    req.id === data.request.id || req.user_id === data.request.user_id 
                      ? { ...req, ...data.request } 
                      : req
                  );
                }
                
                toast.success(`🎤 New Speaker Request! ${data.request.profile?.first_name || 'A listener'} wants to speak`, {
                  duration: 5000,
                });
                
                return [data.request, ...prev];
              });
              break;

            case 'guest_request_responded':
              console.log('➖ Guest request responded:', data.requestId);
              setRequests(prev => prev.filter(req => req.id !== data.requestId));
              break;

            case 'host_welcome':
              console.log('👑 Host welcome received:', data.message);
              toast.success(`🎙️ Host Mode Activated - ${data.message}`, {
                duration: 3000,
              });
              break;

            case 'room_state':
              console.log('🏠 Room state updated:', data);
              break;

            case 'participant_count':
              console.log('👥 Participant count:', data);
              break;

            case 'pong':
              console.log('🏓 Heartbeat received');
              break;

            default:
              console.log('📥 Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setWsConnected(false);
        setConnectionStatus('disconnected');
        clearTimeout(connectionTimeout);
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed:`, {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        clearTimeout(connectionTimeout);
        setWsConnected(false);
        setConnectionStatus('disconnected');
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Auto-reconnect if not a normal closure
        if (event.code !== 1000) {
          handleReconnect();
        }
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      handleReconnect();
    }
  }, [sessionId, toast]);

  // Handle reconnection with exponential backoff
  const handleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const maxDelay = 30000; // 30 seconds max
    const baseDelay = 1000; // 1 second base
    const delay = Math.min(baseDelay * Math.pow(1.5, connectionAttempts.current), maxDelay);
    
    console.log(`🔄 Reconnecting in ${Math.round(delay/1000)}s (attempt ${connectionAttempts.current + 1})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connectWebSocket();
    }, delay);
  }, [connectWebSocket]);

  // Fetch initial requests
  const fetchRequests = useCallback(async () => {
    try {
      console.log('🔄 Fetching guest requests for session:', sessionId);
      const response = await fetch(`/api/podcast/guest-requests?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Fetched guest requests:', data.requests?.length || 0);
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('❌ Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Initialize
  useEffect(() => {
    console.log('🎯 GuestRequestsPanel mounted for session:', sessionId);
    
    fetchRequests();
    connectWebSocket();

    // Poll for updates as fallback (every 30 seconds)
    const pollInterval = setInterval(fetchRequests, 30000);

    return () => {
      console.log('🧹 Cleaning up GuestRequestsPanel');
      
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      clearInterval(pollInterval);
    };
  }, [sessionId, connectWebSocket, fetchRequests]);

  const getDisplayName = (request: GuestRequest) => {
    const firstName = request.profile?.first_name?.trim();
    const lastName = request.profile?.last_name?.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    if (fullName) {
      return fullName;
    }

    if (request.profile?.username) {
      return `@${request.profile.username}`;
    }

    return `User ${request.user_id.slice(-6)}`;
  };

  const handleApprove = async (requestId: string, userId: string) => {
    console.log('✅ Approving request:', requestId, 'for user:', userId);
    
    toast("Processing... Approving guest request", {
      duration: 3000,
    });

    try {
      // Notify WebSocket server
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'guest_request_response',
          requestId,
          userId,
          status: 'approved',
          timestamp: Date.now()
        }));
      }

      // Call the onApproveRequest callback
      await onApproveRequest(requestId, userId);

      // Remove from local state
      setRequests(prev => prev.filter(req => req.id !== requestId));

      toast.success("✅ Approved - Guest can now speak", {
        duration: 3000,
      });

    } catch (error) {
      console.error('❌ Failed to approve request:', error);
      toast.error("❌ Failed to approve request", {
        duration: 3000,
      });
    }
  };

  const handleReject = async (requestId: string) => {
    console.log('❌ Rejecting request:', requestId);
    
    toast("Processing... Rejecting guest request", {
      duration: 3000,
    });

    try {
      // Notify WebSocket server
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'guest_request_response',
          requestId,
          status: 'rejected',
          timestamp: Date.now()
        }));
      }

      // Call the onRejectRequest callback
      await onRejectRequest(requestId);

      // Remove from local state
      setRequests(prev => prev.filter(req => req.id !== requestId));

      toast.success("❌ Rejected - Request has been declined", {
        duration: 3000,
      });

    } catch (error) {
      console.error('❌ Failed to reject request:', error);
      toast.error("❌ Failed to reject request", {
        duration: 3000,
      });
    }
  };

  const handleRefresh = () => {
    fetchRequests();
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      connectWebSocket();
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading guest requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Mic className="w-5 h-5 text-yellow-600" />
          <h4 className="font-semibold text-yellow-800">Guest Requests ({requests.length})</h4>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-xs font-medium capitalize text-yellow-700">
              {connectionStatus}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-yellow-100 rounded-full transition-colors"
            aria-label="Refresh guest requests"
          >
            <RefreshCw className="w-4 h-4 text-yellow-600" />
          </button>
        </div>
      </div>

      {/* Connection Status Info */}
      {connectionStatus !== 'connected' && (
        <div className={`mb-3 p-2 rounded text-sm flex items-center space-x-2 ${
          connectionStatus === 'connecting' 
            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
            : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {connectionStatus === 'connecting' ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span>Connecting to live updates...</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4" />
              <span>Disconnected - Attempting to reconnect...</span>
            </>
          )}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-4 text-yellow-700">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">No pending guest requests</p>
          <p className="text-xs opacity-75 mt-1">Listeners will appear here when they request to speak</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="flex items-center justify-between p-3 bg-white rounded border border-yellow-100 shadow-sm">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <User className="w-4 h-4 text-gray-500" />
                  <div className="font-medium text-gray-900 dark:text-white">
                    {getDisplayName(request)}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">{request.message}</div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(request.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleApprove(request.id, request.user_id)}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors font-medium shadow-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(request.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors font-medium shadow-sm"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Debug info */}
      <div className="mt-3 pt-3 border-t border-yellow-200">
        <div className="text-xs text-yellow-700 opacity-75 space-y-1">
          <div className="flex justify-between">
            <span>Session:</span>
            <span className="font-mono">{sessionId?.slice(-8)}</span>
          </div>
          <div className="flex justify-between">
            <span>Connection:</span>
            <span className="font-medium capitalize">{connectionStatus}</span>
          </div>
          <div className="flex justify-between">
            <span>Requests:</span>
            <span className="font-medium">{requests.length} pending</span>
          </div>
        </div>
      </div>
    </div>
  );
}