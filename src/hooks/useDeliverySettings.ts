
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface DeliverySettings {
  id: string
  user_id: string
  delivery_time: string
  frequency: string
  channels: string[]
  timezone: string
  created_at: string
  updated_at: string
}

interface UpdateDeliverySettingsParams {
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
      const { data, error } = await supabase
        .from('delivery_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error
      }

      return data
    },
    enabled: !!userId
  })

  const updateSettings = useMutation({
    mutationFn: async (params: UpdateDeliverySettingsParams) => {
      console.log('Updating delivery settings:', params)
      
      if (settings) {
        // Update existing settings
        const { data, error } = await supabase
          .from('delivery_preferences')
          .update({
            ...params,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('delivery_preferences')
          .insert({
            user_id: userId,
            delivery_time: params.delivery_time || '09:00',
            frequency: params.frequency || 'daily',
            channels: params.channels || ['email'],
            timezone: params.timezone || 'UTC'
          })
          .select()
          .single()

        if (error) throw error
        return data
      }
    },
    onSuccess: () => {
      toast.success('Delivery settings updated successfully')
      queryClient.invalidateQueries({ queryKey: ['delivery-settings', userId] })
    },
    onError: (error) => {
      console.error('Settings update error:', error)
      toast.error(`Failed to update settings: ${error.message}`)
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
