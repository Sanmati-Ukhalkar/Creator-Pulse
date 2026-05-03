
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

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
  recurring_config?: Record<string, unknown>
  created_at: string
  updated_at: string
  drafts?: {
    title?: string
    content?: unknown
  }
}

const mapBackendToFrontend = (item: Record<string, unknown>): DeliverySchedule => {
  return {
    id: item.id as string,
    user_id: item.user_id as string,
    platform: item.platform as DeliveryPlatform,
    content_type: (item.content_type as DeliveryContentType) || 'post',
    scheduled_for: item.scheduled_at as string,
    status: item.status as DeliveryStatus,
    auto_generate: false,
    created_at: (item.created_at as string) || new Date().toISOString(),
    updated_at: (item.updated_at as string) || new Date().toISOString(),
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
      const { data } = await api.post('/schedule', {
        platform: params.platform,
        scheduled_at: params.scheduledFor,
        content: params.customPrompt || "",
        draft_id: params.draftId,
      });

      return mapBackendToFrontend(data.data);
    },
    onSuccess: () => {
      toast.success('Delivery scheduled successfully')
      queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-queue'] })
    },
    onError: (error: Error) => {
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
    onError: (error: Error) => {
      toast.error(`Failed to cancel delivery: ${error.message}`)
    }
  })

  const updateScheduledDelivery = useMutation({
    mutationFn: async (params: UpdateDeliveryParams) => {
      const payload: Record<string, unknown> = {};
      if (params.platform !== undefined) payload.platform = params.platform;
      if (params.scheduledFor !== undefined) payload.scheduled_at = params.scheduledFor;
      if (params.content !== undefined) payload.content = params.content;
      if (params.status !== undefined) payload.status = params.status;

      const { data } = await api.put(`/schedule/${params.scheduleId}`, payload);
      return mapBackendToFrontend(data.data);
    },
    onSuccess: () => {
      toast.success('Delivery updated')
      queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-queue'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to update delivery: ${error.message}`)
    }
  })

  const runDeliveryProcessor = useMutation({
    mutationFn: async (_params: { minutesAhead?: number; scheduleId?: string }) => {
      return { processed: 0, results: [] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-queue'] })
    },
    onError: (error: Error) => {
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
      const items = (response.data || []) as Record<string, unknown>[];
      return items.map(mapBackendToFrontend);
    },
    enabled: !!userId
  })
}

export const useDeliveryQueue = (userId: string) => {
  return useQuery({
    queryKey: ['delivery-queue', userId],
    queryFn: async () => {
      const { data: response } = await api.get('/schedule?status=scheduled');
      const items = (response.data || []) as Record<string, unknown>[];
      return items.map(mapBackendToFrontend);
    },
    enabled: true,
    refetchInterval: 30000
  })
}
