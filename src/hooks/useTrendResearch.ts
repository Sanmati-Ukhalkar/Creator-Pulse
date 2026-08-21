
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { TrendResearch } from '@/types/trend-research'

interface TriggerTrendResearchParams {
  title: string
  categories?: string[]
}

export const useTrendResearch = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const triggerResearch = useMutation({
    mutationFn: async ({ title, categories = [] }: TriggerTrendResearchParams) => {
      if (!user) throw new Error('User not authenticated')
      console.log('Triggering trend research:', { title, categories })

      const response = await api.post('/trends/trigger', { title, categories });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Trend research started successfully!')
      queryClient.invalidateQueries({ queryKey: ['trend-research'] })
    },
    onError: (error) => {
      console.error('Trigger research mutation error:', error)
      toast.error(`Failed to start research: ${(error as any).message || 'Unknown error'}`)
    }
  })

  return {
    triggerResearch: triggerResearch.mutate,
    isTriggering: triggerResearch.isPending,
    triggerError: triggerResearch.error
  }
}

const useTrendResearchList = () => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['trend-research'],
    queryFn: async (): Promise<TrendResearch[]> => {
      if (!user) return []

      const response = await api.get('/trends');
      const data = response.data;

      // Properly type cast and handle nullable fields
      return (data || []).map((item: any) => ({
        ...item,
        research_data: item.research_data || {},
        status: item.status as 'pending' | 'processing' | 'completed' | 'failed',
        categories: item.categories || [],
        error_message: item.error_message || null,
        generated_at: item.generated_at || null,
        n8n_execution_id: item.n8n_execution_id || null
      }))
    },
    enabled: !!user
  })
}

