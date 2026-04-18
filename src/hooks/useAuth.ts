import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface User {
  id: string;
  email: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>({
    id: "demo-guest-123",
    email: "guest@creatorpulse.com"
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Presentation Mode: Skipping backend validation to present freely
  }, []);

  const signOut = () => {
    setUser(null);
    window.location.href = '/login'; 
  };

  return {
    user,
    loading,
    signOut,
  };
};
