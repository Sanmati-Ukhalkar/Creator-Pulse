import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export const useRealtimeDeliveries = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const lastStatusRef = useRef<string | null>(null)

  // Poll for delivery status every 10 seconds
  const { data: latestDelivery } = useQuery({
    queryKey: ['delivery-status-polling', user?.id],
    queryFn: async () => {
      const { data } = await api.get('/delivery/status');
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!user,
    refetchInterval: 10000,
    notifyOnChangeProps: ['data'] // Only re-render if data changes
  });

  useEffect(() => {
    if (!latestDelivery) return;

    const currentStatus = latestDelivery.status;
    const lastStatus = lastStatusRef.current;

    // If status changed (and it's not the first load)
    if (lastStatus && currentStatus !== lastStatus) {
      console.log('Delivery status changed:', lastStatus, '->', currentStatus);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-queue'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-analytics'] })

      switch (currentStatus) {
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

    lastStatusRef.current = currentStatus;
  }, [latestDelivery, queryClient]);
}
