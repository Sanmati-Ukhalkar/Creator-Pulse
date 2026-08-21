import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface User {
  id: string;
  email: string;
}

export const useAuth = () => {
  const queryClient = useQueryClient();

  const { data: user, isLoading: loading } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async (): Promise<User | null> => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return null;
      }

      try {
        const { data } = await api.get('/auth/me');
        return data.user;
      } catch (error) {
        console.error('Failed to validate session', error);
        localStorage.removeItem('auth_token');
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: false,
  });

  useEffect(() => {
    // Listen to storage events to support multi-tab logout
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' && !e.newValue) {
        queryClient.setQueryData(['auth-user'], null);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => window.removeEventListener('storage', handleStorageChange);
  }, [queryClient]);

  const signOut = () => {
    localStorage.removeItem('auth_token');
    queryClient.setQueryData(['auth-user'], null);
    window.location.href = '/login'; // Or use navigate if accessible
  };

  return {
    user: user ?? null,
    loading,
    signOut,
  };
};
