import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export interface DeliverySettings {
  id: string
  user_id: string
  delivery_time: string
  frequency: string
  channels: string[]
  timezone: string
  created_at: string
  updated_at: string
}

export interface UpdateDeliverySettingsParams {
  delivery_time?: string
  frequency?: string
  channels?: string[]
  timezone?: string
}

export const useDeliverySettings = (userId: string) => {
  const queryClient = useQueryClient()

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['delivery-settings', userId],
    queryFn: async (): Promise<DeliverySettings | null> => {
      // Backend automatically uses user from token
      const { data } = await api.get('/delivery/settings');
      return data;
    },
    enabled: !!userId,
    retry: false
  })

  const updateSettings = useMutation({
    mutationFn: async (params: UpdateDeliverySettingsParams) => {
      console.log('Updating delivery settings:', params)
      const { data } = await api.put('/delivery/settings', params);
      return data;
    },
    onSuccess: () => {
      toast.success('Delivery settings updated successfully')
      queryClient.invalidateQueries({ queryKey: ['delivery-settings', userId] })
    },
    onError: (error) => {
      console.error('Settings update error:', error)
      toast.error(`Failed to update settings: ${(error as any).message || 'Unknown error'}`)
    }
  })

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending
  }
}
