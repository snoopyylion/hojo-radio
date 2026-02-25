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
      <div className="border border-black/10 dark:border-white/10 rounded-2xl p-5 bg-white dark:bg-black">
        <div className="flex items-center gap-2 justify-center py-4">
          <div className="w-4 h-4 border-2 border-[#EF3866] border-t-transparent rounded-full animate-spin" />
          <span className="font-sora text-xs text-black/50 dark:text-white/50">Loading requests…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-black/10 dark:border-white/10 rounded-2xl bg-white dark:bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#EF3866]/10 rounded-xl flex items-center justify-center">
            <Mic className="w-4 h-4 text-[#EF3866]" />
          </div>
          <div>
            <h4 className="font-sora font-semibold text-sm text-black dark:text-white">
              Speaker Requests
            </h4>
            {requests.length > 0 && (
              <p className="font-sora text-[10px] text-[#EF3866]">{requests.length} pending</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-black/10 dark:border-white/10">
            <span className={`w-1.5 h-1.5 rounded-full ${
              connectionStatus === 'connected'  ? 'bg-emerald-500' :
              connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="font-sora text-[10px] font-medium text-black/60 dark:text-white/60 capitalize">
              {connectionStatus}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
          </button>
        </div>
      </div>

      {/* Disconnected banner */}
      {connectionStatus !== 'connected' && (
        <div className={`mx-4 mt-3 px-3 py-2 rounded-xl text-xs font-sora flex items-center gap-2 ${
          connectionStatus === 'connecting'
            ? 'bg-amber-500/10 text-amber-600'
            : 'bg-red-500/10 text-red-500'
        }`}>
          {connectionStatus === 'connecting' ? (
            <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />Connecting to live updates…</>
          ) : (
            <><AlertCircle className="w-3.5 h-3.5 shrink-0" />Disconnected — attempting to reconnect</>
          )}
        </div>
      )}

      {/* Body */}
      <div className="p-4">
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-7 h-7 mx-auto mb-2 text-black/15 dark:text-white/15" />
            <p className="font-sora text-xs font-medium text-black/40 dark:text-white/40">No pending requests</p>
            <p className="font-sora text-[11px] text-black/25 dark:text-white/25 mt-0.5">
              Listeners will appear here when they request to speak
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3.5 border border-[#EF3866]/20 bg-[#EF3866]/3 rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-[#EF3866]/10 rounded-lg flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-[#EF3866]" />
                    </div>
                    <p className="font-sora text-sm font-semibold text-black dark:text-white truncate">
                      {getDisplayName(request)}
                    </p>
                  </div>
                  {request.message && (
                    <p className="font-sora text-xs text-black/60 dark:text-white/60 ml-8 line-clamp-1">
                      &quot;{request.message}&quot;
                    </p>
                  )}
                  <div className="flex items-center gap-1 ml-8 mt-1">
                    <Clock className="w-3 h-3 text-black/30 dark:text-white/30" />
                    <span className="font-sora text-[10px] text-black/30 dark:text-white/30">
                      {new Date(request.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => handleApprove(request.id, request.user_id)}
                    className="px-3.5 py-1.5 bg-emerald-500 text-white font-sora text-[11px] font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    className="px-3.5 py-1.5 border border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 font-sora text-[11px] font-semibold rounded-lg hover:border-red-400 hover:text-red-500 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer debug */}
      <div className="px-5 py-2.5 border-t border-black/5 dark:border-white/5">
        <div className="flex justify-between font-sora text-[10px] text-black/25 dark:text-white/25 font-mono">
          <span>session:{sessionId?.slice(-6)}</span>
          <span>{requests.length} pending</span>
        </div>
      </div>
    </div>
  );
}