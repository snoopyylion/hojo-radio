"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mic, User, Clock } from 'lucide-react';

interface GuestRequest {
  id: string;
  user_id: string;
  message: string;
  requested_at: string;
  status: string;
}

interface GuestRequestsPanelProps {
  sessionId: string;
  onApproveRequest: (requestId: string, userId: string) => void;
  onRejectRequest: (requestId: string) => void;
}

export function GuestRequestsPanel({ sessionId, onApproveRequest, onRejectRequest }: GuestRequestsPanelProps) {
  const [requests, setRequests] = useState<GuestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRequests = async () => {
    try {
      console.log('🔄 Fetching guest requests for session:', sessionId);
      const response = await fetch(`/api/podcast/guest-requests?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Fetched guest requests:', data.requests);
        setRequests(data.requests || []);
      } else {
        console.error('❌ Failed to fetch requests:', response.status);
      }
    } catch (error) {
      console.error('❌ Failed to fetch guest requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    if (!sessionId) {
      console.error('❌ No session ID for WebSocket connection');
      return;
    }

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001';
    console.log(`🔌 Connecting to WebSocket: ${wsUrl}/podcast/${sessionId}?role=host`);
    
    const ws = new WebSocket(`${wsUrl}/podcast/${sessionId}?role=host&userId=host-${Date.now()}`);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected for guest requests (host)');
      setWsConnected(true);
      
      // Clear any reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', data);
        
        if (data.type === 'guest_request_update') {
          console.log('➕ Adding new guest request:', data.request);
          setRequests(prev => {
            // Check if request already exists to avoid duplicates
            const exists = prev.some(req => req.id === data.request.id);
            if (exists) {
              console.log('⚠️ Request already exists, skipping duplicate');
              return prev;
            }
            return [...prev, data.request];
          });
        } else if (data.type === 'guest_request_responded') {
          console.log('➖ Removing responded request:', data.requestId);
          setRequests(prev => prev.filter(req => req.id !== data.requestId));
        } else if (data.type === 'room_state') {
          console.log('🏠 Room state update received');
        }
      } catch (error) {
        console.error('❌ WebSocket message parsing error:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setWsConnected(false);
    };
    
    ws.onclose = (event) => {
      console.log('🔌 WebSocket closed:', event.code, event.reason);
      setWsConnected(false);
      
      // Attempt to reconnect after 3 seconds if not a normal closure
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect WebSocket...');
          connectWebSocket();
        }, 3000);
      }
    };
    
    wsRef.current = ws;
  };

  useEffect(() => {
    console.log('🎯 GuestRequestsPanel mounted for session:', sessionId);
    fetchRequests();
    connectWebSocket();
    
    return () => {
      console.log('🧹 Cleaning up GuestRequestsPanel');
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [sessionId]);

  const handleApprove = async (requestId: string, userId: string) => {
    console.log('✅ Approving request:', requestId, 'for user:', userId);
    try {
      await onApproveRequest(requestId, userId);
      
      // Send WebSocket update
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'guest_request_response',
          requestId,
          status: 'approved'
        }));
      }
      
      // Remove from local state
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('❌ Failed to approve request:', error);
    }
  };

  const handleReject = async (requestId: string) => {
    console.log('❌ Rejecting request:', requestId);
    try {
      await onRejectRequest(requestId);
      
      // Send WebSocket update
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'guest_request_response',
          requestId,
          status: 'rejected'
        }));
      }
      
      // Remove from local state
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('❌ Failed to reject request:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading requests...</span>
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
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-yellow-700">
            {wsConnected ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </div>
      
      {requests.length === 0 ? (
        <div className="text-center py-4 text-yellow-700">
          <p className="text-sm">No pending guest requests</p>
          <p className="text-xs opacity-75 mt-1">Listeners will appear here when they request to speak</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="flex items-center justify-between p-3 bg-white rounded border border-yellow-100 shadow-sm">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <User className="w-4 h-4 text-gray-500" />
                  <div className="font-medium text-gray-900">
                    User {request.user_id?.slice(-6) || 'Unknown'}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">{request.message}</div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(request.requested_at).toLocaleTimeString()}</span>
                </div>
              </div>
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleApprove(request.id, request.user_id)}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors font-medium disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(request.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
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
        <div className="text-xs text-yellow-700 opacity-75">
          <div>Session: {sessionId?.slice(-8)}</div>
          <div>WebSocket: {wsConnected ? 'Connected' : 'Disconnected'}</div>
          <div>Requests: {requests.length} pending</div>
        </div>
      </div>
    </div>
  );
}