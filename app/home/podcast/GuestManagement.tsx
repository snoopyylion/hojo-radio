"use client";

import React, { useState, useEffect } from 'react';
import { Users, Mic, MicOff, Crown, UserPlus, UserMinus, Volume2 } from 'lucide-react';
import { Participant, RolesByType } from '@/types/podcast';

interface UserInfo {
  user_id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface GuestManagementProps {
  sessionId: string;
  isHost: boolean;
  currentUserRole: string;
  onRoleChange?: (userId: string, newRole: string) => void;
}

export default function GuestManagement({
  sessionId,
  isHost,
  currentUserRole,
  onRoleChange
}: GuestManagementProps) {
  const [roles, setRoles] = useState<RolesByType>({
    host: [],
    guests: [],
    listeners: []
  });
  const [userInfoCache, setUserInfoCache] = useState<Record<string, UserInfo>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUserInfo = async (userId: string): Promise<UserInfo | null> => {
  // Check cache first
  if (userInfoCache[userId]) {
    return userInfoCache[userId];
  }

  try {
    const response = await fetch(`/api/users/${userId}`);
    if (response.ok) {
      const data = await response.json();
      const userInfo: UserInfo = {
        user_id: userId,
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username
      };
      
      // Update cache using functional update to avoid stale state
      setUserInfoCache(prev => ({ ...prev, [userId]: userInfo }));
      return userInfo;
    }
  } catch (error) {
    console.error(`Failed to fetch user info for ${userId}:`, error);
  }
  
  return null;
};

  const getUserDisplayName = (userId: string): string => {
  const userInfo = userInfoCache[userId];
  
  if (!userInfo) {
    // Still loading
    return `Loading...`;
  }

  // Priority: Full name > Username > User ID
  const fullName = [userInfo.first_name, userInfo.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  
  if (fullName) {
    return fullName;
  }
  
  if (userInfo.username) {
    return `@${userInfo.username}`;
  }
  
  return `User ${userId.slice(-6)}`;
};

  const getUserSubtext = (userId: string): string | null => {
    const userInfo = userInfoCache[userId];
    
    if (!userInfo) {
      return null;
    }

    const fullName = [userInfo.first_name, userInfo.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    
    // If showing full name, also show username if available
    if (fullName && userInfo.username) {
      return `@${userInfo.username}`;
    }
    
    return null;
  };

  const fetchRoles = async () => {
  try {
    const response = await fetch(`/api/podcast/session-roles?sessionId=${sessionId}`);
    if (response.ok) {
      const data = await response.json();
      setRoles(data.roles);
      
      // Fetch user info for all participants
      const allUserIds = [
        ...data.roles.host,
        ...data.roles.guests,
        ...data.roles.listeners
      ].map((p: Participant) => p.user_id);
      
      // Fetch user info in parallel and WAIT for all to complete
      const userInfoPromises = allUserIds.map(async (userId: string) => {
        const userInfo = await fetchUserInfo(userId);
        return { userId, userInfo };
      });
      
      await Promise.all(userInfoPromises);
    }
  } catch (error) {
    console.error('Failed to fetch roles:', error);
  } finally {
    setLoading(false);
  }
};

  const promoteToGuest = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch('/api/podcast/session-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          targetUserId: userId,
          newRole: 'guest',
          action: 'promote'
        })
      });

      if (response.ok) {
        await fetchRoles();
        onRoleChange?.(userId, 'guest');
      } else {
        const error = await response.json();
        alert(`Failed to promote user: ${error.error}`);
      }
    } catch (error) {
      console.error('Promotion failed:', error);
      alert('Failed to promote user');
    } finally {
      setActionLoading(null);
    }
  };

  const demoteToListener = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch('/api/podcast/session-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          targetUserId: userId,
          newRole: 'listener',
          action: 'demote'
        })
      });

      if (response.ok) {
        await fetchRoles();
        onRoleChange?.(userId, 'listener');
      } else {
        const error = await response.json();
        alert(`Failed to demote user: ${error.error}`);
      }
    } catch (error) {
      console.error('Demotion failed:', error);
      alert('Failed to demote user');
    } finally {
      setActionLoading(null);
    }
  };

  const removeUser = async (userId: string) => {
    const displayName = getUserDisplayName(userId);
    if (!confirm(`Are you sure you want to remove ${displayName} from the session?`)) {
      return;
    }

    setActionLoading(userId);
    try {
      const response = await fetch('/api/podcast/session-roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          targetUserId: userId
        })
      });

      if (response.ok) {
        await fetchRoles();
      } else {
        const error = await response.json();
        alert(`Failed to remove user: ${error.error}`);
      }
    } catch (error) {
      console.error('Remove failed:', error);
      alert('Failed to remove user');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchRoles();
      const interval = setInterval(fetchRoles, 10000);
      return () => clearInterval(interval);
    }
  }, [sessionId]);

  const ParticipantItem = ({ participant, showActions = false }: {
    participant: Participant;
    showActions?: boolean;
  }) => {
    const getRoleIcon = (role: string) => {
      switch (role) {
        case 'host': return <Crown className="w-4 h-4 text-yellow-500" />;
        case 'guest': return <Mic className="w-4 h-4 text-green-500" />;
        default: return <Volume2 className="w-4 h-4 text-gray-400" />;
      }
    };

    const getRoleBadge = (role: string) => {
      const badges = {
        host: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        guest: 'bg-green-100 text-green-800 border-green-200',
        listener: 'bg-gray-100 text-gray-600 border-gray-200'
      };

      return `px-2 py-1 rounded-full text-xs font-medium border ${badges[role as keyof typeof badges] || badges.listener}`;
    };

    const isActionInProgress = actionLoading === participant.user_id;
    const displayName = getUserDisplayName(participant.user_id);
    const subtext = getUserSubtext(participant.user_id);

    return (
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
        <div className="flex items-center space-x-3">
          {getRoleIcon(participant.role)}
          <div>
            <div className="font-medium text-gray-900">
              {displayName}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <div className={getRoleBadge(participant.role)}>
                {participant.role}
              </div>
              {subtext && (
                <span className="text-xs text-gray-500">{subtext}</span>
              )}
            </div>
          </div>
        </div>

        {showActions && isHost && (
          <div className="flex items-center space-x-2">
            {participant.role === 'listener' && (
              <button
                onClick={() => promoteToGuest(participant.user_id)}
                disabled={isActionInProgress}
                className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                {isActionInProgress ? 'Promoting...' : 'Promote'}
              </button>
            )}

            {participant.role === 'guest' && (
              <button
                onClick={() => demoteToListener(participant.user_id)}
                disabled={isActionInProgress}
                className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <MicOff className="w-4 h-4 mr-1" />
                {isActionInProgress ? 'Demoting...' : 'Demote'}
              </button>
            )}

            {participant.role !== 'host' && (
              <button
                onClick={() => removeUser(participant.user_id)}
                disabled={isActionInProgress}
                className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <UserMinus className="w-4 h-4 mr-1" />
                {isActionInProgress ? 'Removing...' : 'Remove'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const totalParticipants = roles.host.length + roles.guests.length + roles.listeners.length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Participants ({totalParticipants})
            </h3>
          </div>

          {isHost && (
            <div className="text-sm text-green-600 font-medium">
              👑 You&apos;re the host - Manage speakers below
            </div>
          )}

          {!isHost && currentUserRole === 'listener' && (
            <div className="text-sm text-gray-500">
              Raise your hand to speak! 🙋‍♀️
            </div>
          )}

          {currentUserRole === 'guest' && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <Mic className="w-4 h-4" />
              <span>You can speak</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Host Section */}
        {roles.host.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Crown className="w-4 h-4 mr-2 text-yellow-500" />
              Host ({roles.host.length})
            </h4>
            <div className="space-y-2">
              {roles.host.map((participant) => (
                <ParticipantItem
                  key={participant.user_id}
                  participant={participant}
                  showActions={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Guests Section */}
        {roles.guests.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Mic className="w-4 h-4 mr-2 text-green-500" />
              Guests ({roles.guests.length})
            </h4>
            <div className="space-y-2">
              {roles.guests.map((participant) => (
                <ParticipantItem
                  key={participant.user_id}
                  participant={participant}
                  showActions={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Listeners Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Volume2 className="w-4 h-4 mr-2 text-gray-400" />
            Listeners ({roles.listeners.length})
            {isHost && roles.listeners.length > 0 && (
              <span className="ml-2 text-xs text-gray-500">
                (Click promote to let them speak)
              </span>
            )}
          </h4>

          {roles.listeners.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Volume2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No listeners yet</p>
              <p className="text-sm">Share your room link to get listeners!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {roles.listeners.map((participant) => (
                <ParticipantItem
                  key={participant.user_id}
                  participant={participant}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions for non-hosts */}
      {!isHost && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="text-sm text-gray-600">
            {currentUserRole === 'listener' && (
              <p>🎧 You&apos;re listening. The host can promote you to speak as a guest.</p>
            )}
            {currentUserRole === 'guest' && (
              <p>🎤 You can now speak! Use your microphone controls to join the conversation.</p>
            )}
          </div>
        </div>
      )}

      {isHost && (
        <div className="px-6 py-4 bg-blue-50 border-t border-blue-200 rounded-b-lg">
          <div className="text-sm text-blue-700">
            <p>👑 <strong>Host Controls:</strong> You can promote listeners to guests, demote guests to listeners, or remove participants from the session.</p>
          </div>
        </div>
      )}
    </div>
  );
}