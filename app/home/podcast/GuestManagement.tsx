"use client";

import React, { useState, useEffect } from 'react';
import { Users, Mic, MicOff, Crown, UserPlus, UserMinus, Volume2 } from 'lucide-react';
import { Participant, RolesByType } from '@/types/podcast';

interface UserInfo {
  user_id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string | null;
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
          username: data.username,
          avatar_url: data.avatar_url ?? null,
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

  const resolveUserInfo = (participant: Participant): UserInfo | null => {
    if (participant.profile) {
      return {
        user_id: participant.user_id,
        first_name: participant.profile.first_name ?? undefined,
        last_name: participant.profile.last_name ?? undefined,
        username: participant.profile.username ?? undefined,
        avatar_url: participant.profile.avatar_url ?? null,
      };
    }

    return userInfoCache[participant.user_id] ?? null;
  };

  const getUserDisplayName = (participant: Participant): string => {
    const userInfo = resolveUserInfo(participant);

    if (!userInfo) {
      return `User ${participant.user_id.slice(-6)}`;
    }

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

    return `User ${participant.user_id.slice(-6)}`;
  };

  const getUserSubtext = (participant: Participant): string | null => {
    const userInfo = resolveUserInfo(participant);

    if (!userInfo) {
      return null;
    }

    const fullName = [userInfo.first_name, userInfo.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

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

        const participants: Participant[] = [
          ...data.roles.host,
          ...data.roles.guests,
          ...data.roles.listeners,
        ];

        const derivedFromProfile = participants.reduce((acc, participant) => {
          if (participant.profile) {
            acc[participant.user_id] = {
              user_id: participant.user_id,
              first_name: participant.profile.first_name ?? undefined,
              last_name: participant.profile.last_name ?? undefined,
              username: participant.profile.username ?? undefined,
              avatar_url: participant.profile.avatar_url ?? null,
            };
          }
          return acc;
        }, {} as Record<string, UserInfo>);

        if (Object.keys(derivedFromProfile).length > 0) {
          setUserInfoCache(prev => ({ ...derivedFromProfile, ...prev }));
        }

        const knownUserIds = new Set([
          ...Object.keys(userInfoCache),
          ...Object.keys(derivedFromProfile),
        ]);

        const missingParticipants = participants.filter(
          participant => !participant.profile && !knownUserIds.has(participant.user_id)
        );

        if (missingParticipants.length > 0) {
          await Promise.all(missingParticipants.map(({ user_id }) => fetchUserInfo(user_id)));
        }
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

  const removeUser = async (participant: Participant) => {
    const displayName = getUserDisplayName(participant);
    if (!confirm(`Are you sure you want to remove ${displayName} from the session?`)) {
      return;
    }

    setActionLoading(participant.user_id);
    try {
      const response = await fetch('/api/podcast/session-roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          targetUserId: participant.user_id
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
        case 'host': return <Crown className="w-3.5 h-3.5 text-amber-500" />;
        case 'guest': return <Mic className="w-3.5 h-3.5 text-emerald-500" />;
        default: return <Volume2 className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />;
      }
    };

    const isActionInProgress = actionLoading === participant.user_id;
    const displayName = getUserDisplayName(participant);
    const subtext = getUserSubtext(participant);

    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-black/2 dark:bg-white/2 border border-black/8 dark:border-white/8 rounded-xl hover:border-black/20 dark:hover:border-white/20 transition-colors gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar circle */}
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            participant.role === 'host' ? 'bg-amber-500/10' :
            participant.role === 'guest' ? 'bg-emerald-500/10' : 'bg-black/5 dark:bg-white/5'
          }`}>
            {getRoleIcon(participant.role)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-sora text-sm font-medium text-black dark:text-white truncate">{displayName}</p>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className={`font-sora text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                participant.role === 'host' ? 'bg-amber-500/10 text-amber-600' :
                participant.role === 'guest' ? 'bg-emerald-500/10 text-emerald-600' :
                'bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50'
              }`}>
                {participant.role}
              </span>
              {subtext && <span className="font-sora text-[10px] text-black/40 dark:text-white/40 truncate">{subtext}</span>}
            </div>
          </div>
        </div>

        {showActions && isHost && (
          <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:ml-3">
            {participant.role === 'listener' && (
              <button
                onClick={() => promoteToGuest(participant.user_id)}
                disabled={isActionInProgress}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-sora text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <UserPlus className="w-3 h-3" />
                <span className="hidden xs:inline">Invite</span>
                {isActionInProgress ? '…' : <span className="xs:hidden">+</span>}
              </button>
            )}
            {participant.role === 'guest' && (
              <button
                onClick={() => demoteToListener(participant.user_id)}
                disabled={isActionInProgress}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-sora text-[11px] font-semibold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <MicOff className="w-3 h-3" />
                <span className="hidden xs:inline">Revoke</span>
                {isActionInProgress ? '…' : <span className="xs:hidden">x</span>}
              </button>
            )}
            {participant.role !== 'host' && (
              <button
                onClick={() => removeUser(participant)}
                disabled={isActionInProgress}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-sora text-[11px] font-semibold bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <UserMinus className="w-3 h-3" />
                <span className="hidden xs:inline">Remove</span>
                {isActionInProgress ? '…' : <span className="xs:hidden">−</span>}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="border border-black/10 dark:border-white/10 rounded-2xl p-4 sm:p-6 bg-white dark:bg-black">
        <div className="flex items-center justify-center py-6 sm:py-8">
          <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-[#EF3866] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const totalParticipants = roles.host.length + roles.guests.length + roles.listeners.length;

  return (
    <div className="border border-black/10 dark:border-white/10 rounded-xl sm:rounded-2xl bg-white dark:bg-black overflow-hidden">
      {/* Header */}
      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#EF3866]/10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#EF3866]" />
          </div>
          <h3 className="font-sora font-semibold text-xs sm:text-sm text-black dark:text-white">
            Participants <span className="text-black/40 dark:text-white/40 text-[11px] sm:text-xs">({totalParticipants})</span>
          </h3>
        </div>

        <div className="w-full xs:w-auto">
          {isHost && (
            <span className="inline-block font-sora text-[10px] sm:text-[11px] font-semibold text-amber-600 bg-amber-500/10 px-2 sm:px-2.5 py-1 rounded-full">
              👑 Host
            </span>
          )}
          {!isHost && currentUserRole === 'guest' && (
            <span className="inline-block font-sora text-[10px] sm:text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 sm:px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
              <Mic className="w-3 h-3" /> <span className="hidden xs:inline">Speaking</span>
            </span>
          )}
          {!isHost && currentUserRole === 'listener' && (
            <span className="inline-block font-sora text-[10px] sm:text-[11px] text-black/40 dark:text-white/40">
              🙋 Raise hand
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
        {/* Hosts */}
        {roles.host.length > 0 && (
          <div>
            <p className="font-sora text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40 mb-2 sm:mb-2.5 flex items-center gap-1.5">
              <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500" /> Host
            </p>
            <div className="space-y-1.5 sm:space-y-2">
              {roles.host.map(p => <ParticipantItem key={p.user_id} participant={p} />)}
            </div>
          </div>
        )}

        {/* Guests */}
        {roles.guests.length > 0 && (
          <div>
            <p className="font-sora text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40 mb-2 sm:mb-2.5 flex items-center gap-1.5">
              <Mic className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500" /> Guests ({roles.guests.length})
            </p>
            <div className="space-y-1.5 sm:space-y-2">
              {roles.guests.map(p => <ParticipantItem key={p.user_id} participant={p} showActions />)}
            </div>
          </div>
        )}

        {/* Listeners */}
        <div>
          <p className="font-sora text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40 mb-2 sm:mb-2.5 flex items-center gap-1.5">
            <Volume2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Listeners ({roles.listeners.length})
          </p>
          {roles.listeners.length === 0 ? (
            <div className="text-center py-4 sm:py-6">
              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 sm:mb-2 text-black/20 dark:text-white/20" />
              <p className="font-sora text-[11px] sm:text-xs text-black/40 dark:text-white/40">No listeners yet</p>
            </div>
          ) : (
            <div className="space-y-1.5 sm:space-y-2 max-h-40 sm:max-h-52 overflow-y-auto pr-1">
              {roles.listeners.map(p => <ParticipantItem key={p.user_id} participant={p} showActions />)}
            </div>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
        {isHost ? (
          <p className="font-sora text-[10px] sm:text-[11px] text-black/40 dark:text-white/40 text-center sm:text-left">
            Promote listeners to let them speak, or revoke guest access
          </p>
        ) : currentUserRole === 'listener' ? (
          <p className="font-sora text-[10px] sm:text-[11px] text-black/40 dark:text-white/40 text-center sm:text-left">
            🎧 Listening · The host can invite you to speak
          </p>
        ) : (
          <p className="font-sora text-[10px] sm:text-[11px] text-emerald-600 text-center sm:text-left">
            🎤 You can speak · Use your mic controls
          </p>
        )}
      </div>
    </div>
  );
}