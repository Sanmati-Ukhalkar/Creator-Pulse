
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

// Updated types to match the new database schema with ENUM types
export type DeliveryPlatform = 'twitter' | 'linkedin' | 'instagram' | 'facebook' | 'youtube' | 'tiktok'
export type DeliveryContentType = 'post' | 'thread' | 'story' | 'reel' | 'video' | 'carousel' | 'article'
export type DeliveryStatus = 'scheduled' | 'processing' | 'sent' | 'failed' | 'cancelled'

interface ScheduleDeliveryParams {
  userId: string
  platform: DeliveryPlatform
  contentType: DeliveryContentType
  scheduledFor: string
  draftId?: string
  autoGenerate?: boolean
  customPrompt?: string
  recurringConfig?: {
    frequency: 'weekly' | 'daily'
    weeklySchedules?: Record<string, string[]>
  }
}

interface UpdateDeliveryParams {
  scheduleId: string
  platform?: DeliveryPlatform
  contentType?: DeliveryContentType
  scheduledFor?: string
  autoGenerate?: boolean
  customPrompt?: string
  status?: DeliveryStatus
  content?: string
}

export interface DeliverySchedule {
  id: string
  user_id: string
  platform: DeliveryPlatform
  content_type: DeliveryContentType
  scheduled_for: string
  status: DeliveryStatus
  draft_id?: string
  auto_generate: boolean
  custom_prompt?: string
  recurring_config?: any
  created_at: string
  updated_at: string
  drafts?: {
    title?: string
    content?: any
  }
}

const mapBackendToFrontend = (item: any): DeliverySchedule => {
  return {
    id: item.id,
    user_id: item.user_id,
    platform: item.platform,
    content_type: 'post', // Default as backend doesn't store this yet
    scheduled_for: item.scheduled_at,
    status: item.status,
    auto_generate: false,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
    drafts: {
      title: 'Scheduled Post',
      content: item.content
    }
  };
}

export const useDeliveryScheduler = () => {
  const queryClient = useQueryClient()

  const scheduleDelivery = useMutation({
    mutationFn: async (params: ScheduleDeliveryParams) => {
      console.log('Scheduling delivery:', params)

      const { data } = await api.post('/schedule', {
        ...params,
        scheduled_at: params.scheduledFor,
        content: params.customPrompt || "Scheduled Content" // Use prompt as content if no draft content passed? 
        // Note: Real implementation should resolve draft content here or backend should support draft_id
      });

      return mapBackendToFrontend(data.data);
    },
    onSuccess: () => {
      toast.success('Delivery scheduled successfully')
      queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-queue'] })
    },
    onError: (error: any) => {
      console.error('Scheduling error:', error)
      toast.error(`Failed to schedule delivery: ${error.message}`)
    }
  })

  const cancelScheduledDelivery = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { data } = await api.delete(`/schedule/${scheduleId}`);
      return data;
    },
    onSuccess: () => {
      toast.success('Delivery cancelled')
      queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-queue'] })
    },
    onError: (error: any) => {
      console.error('Cancellation error:', error)
      toast.error(`Failed to cancel delivery: ${error.message}`)
    }
  })

  const updateScheduledDelivery = useMutation({
    mutationFn: async (params: UpdateDeliveryParams) => {
      const { data } = await api.put(`/schedule/${params.scheduleId}`, params);
      return mapBackendToFrontend(data.data);
    },
    onSuccess: () => {
      toast.success('Delivery updated')
      queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-queue'] })
    },
    onError: (error: any) => {
      console.error('Update error:', error)
      toast.error(`Failed to update delivery: ${error.message}`)
    }
  })

  const runDeliveryProcessor = useMutation({
    mutationFn: async (params: { minutesAhead?: number; scheduleId?: string }) => {
      // Dummy implementation for now
      await new Promise(resolve => setTimeout(resolve, 500));
      return { processed: 0, results: [] };
    },
    onSuccess: (data: any) => {
      toast.success(`Processor triggered (simulated)`)
      queryClient.invalidateQueries({ queryKey: ['delivery-queue'] })
    },
    onError: (error: any) => {
      console.error('Processor error:', error)
      toast.error(`Processor failed: ${error.message}`)
    }
  })

  return {
    scheduleDelivery: scheduleDelivery.mutate,
    cancelScheduledDelivery: cancelScheduledDelivery.mutate,
    updateScheduledDelivery: updateScheduledDelivery.mutate,
    runDeliveryProcessor: runDeliveryProcessor.mutate,
    isScheduling: scheduleDelivery.isPending,
    isCancelling: cancelScheduledDelivery.isPending,
    isUpdating: updateScheduledDelivery.isPending,
    isRunningProcessor: runDeliveryProcessor.isPending,
    schedulingError: scheduleDelivery.error
  }
}

export const useDeliverySchedules = (userId: string) => {
  return useQuery({
    queryKey: ['delivery-schedules', userId],
    queryFn: async (): Promise<DeliverySchedule[]> => {
      const { data: response } = await api.get('/schedule');
      const items = response.data || [];
      return items.map(mapBackendToFrontend);
    },
    enabled: !!userId
  })
}

export const useDeliveryQueue = (userId: string) => {
  return useQuery({
    queryKey: ['delivery-queue', userId],
    queryFn: async () => {
      const { data: response } = await api.get('/schedule?status=pending');
      const items = response.data || [];
      return items.map(mapBackendToFrontend);
    },
    enabled: true,
    refetchInterval: 30000 // Refresh every 30 seconds
  })
}
