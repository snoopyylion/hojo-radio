import { useState, useEffect, useCallback } from 'react';
import { Participant, RolesByType } from '@/types/podcast';

export function useSessionRoles(sessionId: string, userId: string) {
  const [roles, setRoles] = useState<RolesByType>({
    host: [],
    guests: [],
    listeners: []
  });
  const [userRole, setUserRole] = useState<'host' | 'guest' | 'listener'>('listener');
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    if (!sessionId || !userId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s timeout

      const response = await fetch(
        `/api/podcast/session-roles?sessionId=${sessionId}&userId=${userId}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      
      // Set roles data
      if (data.roles) {
        setRoles(data.roles);
      }
      
      // Find current user's role - fix the property name
      const allParticipants = [
        ...(data.roles?.host || []),
        ...(data.roles?.guests || []),
        ...(data.roles?.listeners || [])
      ];
      
      const currentUser = allParticipants.find((p: Participant) => p.user_id === userId);
      const currentUserRole = currentUser?.role || 'listener';
      
      setUserRole(currentUserRole);
      setIsHost(currentUserRole === 'host');
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      if (error instanceof Error) {
        setError(error.name === 'AbortError' ? 'Request timeout' : error.message);
      }
      // Fallback values
      setUserRole('listener');
      setIsHost(false);
    } finally {
      setLoading(false);
    }
  }, [sessionId, userId]);

  const promoteUser = useCallback(async (targetUserId: string) => {
    try {
      const response = await fetch('/api/podcast/session-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          targetUserId,
          newRole: 'guest',
          action: 'promote'
        })
      });

      if (response.ok) {
        await fetchRoles();
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Promotion failed');
      }
    } catch (error) {
      console.error('Promotion failed:', error);
      throw error; // Re-throw to let caller handle
    }
  }, [sessionId, fetchRoles]);

  const demoteUser = useCallback(async (targetUserId: string) => {
    try {
      const response = await fetch('/api/podcast/session-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          targetUserId,
          newRole: 'listener',
          action: 'demote'
        })
      });

      if (response.ok) {
        await fetchRoles();
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Demotion failed');
      }
    } catch (error) {
      console.error('Demotion failed:', error);
      throw error; // Re-throw to let caller handle
    }
  }, [sessionId, fetchRoles]);

  const removeUser = useCallback(async (targetUserId: string) => {
    try {
      const response = await fetch('/api/podcast/session-roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          targetUserId
        })
      });

      if (response.ok) {
        await fetchRoles();
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Remove failed');
      }
    } catch (error) {
      console.error('Remove failed:', error);
      throw error; // Re-throw to let caller handle
    }
  }, [sessionId, fetchRoles]);

  const refreshTokenForRole = useCallback(async () => {
    // This would trigger a reconnection with new token
    console.log('Role changed - token refresh needed');
    return true;
  }, []);

  useEffect(() => {
    fetchRoles();
    
    // Reduce refresh interval to 30 seconds to prevent API overload
    const interval = setInterval(fetchRoles, 30000);
    return () => clearInterval(interval);
  }, [fetchRoles]);

  return {
    roles,
    userRole,
    isHost,
    loading,
    error,
    promoteUser,
    demoteUser,
    removeUser,
    refreshTokenForRole,
    refetchRoles: fetchRoles
  };
}