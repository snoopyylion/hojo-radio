// hooks/useUserCreatedAt.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface UserCreatedAtData {
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  member_since: string;
}

interface UseUserCreatedAtReturn {
  data: UserCreatedAtData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserCreatedAt(): UseUserCreatedAtReturn {
  const [data, setData] = useState<UserCreatedAtData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken, isLoaded, userId } = useAuth();

  const fetchUserCreatedAt = async () => {
    if (!isLoaded || !userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      const response = await fetch('/api/user/created-at', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch user created_at');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      console.error('Error fetching user created_at:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCreatedAt();
  }, [isLoaded, userId]);

  return {
    data,
    loading,
    error,
    refetch: fetchUserCreatedAt,
  };
}

// Alternative hook for just the created_at date
export function useUserMemberSince() {
  const { data, loading, error } = useUserCreatedAt();

  const memberSince = data?.member_since || null;
  const createdAt = data?.created_at || null;
  
  // Calculate days since joining
  const daysSinceJoining = createdAt 
    ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    memberSince,
    createdAt,
    daysSinceJoining,
    loading,
    error,
  };
}