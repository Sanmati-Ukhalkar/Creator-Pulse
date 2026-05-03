import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

/**
 * Determines whether the current user is an admin.
 * Strategy:
 * 1) Check creator_profiles.settings.is_admin === true
 * 2) Fallback: if VITE_ADMIN_EMAILS (comma-separated) contains user.email
 */
export const useAdmin = () => {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      if (!user?.id) {
        setIsAdmin(false)
        setLoading(false)
        return
      }
      try {
        // Env-based fallback allowlist
        const allowlist = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined)?.split(',').map(e => e.trim().toLowerCase()) || []
        if (user.email && allowlist.includes(user.email.toLowerCase())) {
          setIsAdmin(true)
          setLoading(false)
          return
        }

        const response = await api.get('/profile');
        const settings = response.data?.settings || {};
        setIsAdmin(Boolean(settings?.is_admin));
      } catch (err) {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }
    check()
  }, [user?.id, user?.email])

  return { isAdmin, loading }
}


