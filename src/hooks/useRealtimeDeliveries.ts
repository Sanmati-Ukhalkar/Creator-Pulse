
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export const useRealtimeDeliveries = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    console.log('Setting up realtime subscription for delivery updates...')

    const channel = supabase
      .channel('delivery-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_schedules',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Delivery update received:', payload)
          
          // Invalidate relevant queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] })
          queryClient.invalidateQueries({ queryKey: ['delivery-queue'] })
          queryClient.invalidateQueries({ queryKey: ['delivery-analytics'] })

          // Show toast notifications for status changes
          if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            const oldStatus = payload.old.status
            const newStatus = payload.new.status
            
            if (oldStatus !== newStatus) {
              switch (newStatus) {
                case 'sent':
                  toast.success('Content delivered successfully!')
                  break
                case 'failed':
                  toast.error('Content delivery failed')
                  break
                case 'processing':
                  toast.info('Processing content delivery...')
                  break
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [user, queryClient])
}
