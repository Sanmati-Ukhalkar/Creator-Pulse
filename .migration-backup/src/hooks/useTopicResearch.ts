
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { TopicResearch } from '@/types/research'

interface ResearchParams {
  topicId: string
  userId: string
  depthLevel: 'quick' | 'detailed' | 'comprehensive'
}

export const useTopicResearch = () => {
  const queryClient = useQueryClient()

  const conductResearch = useMutation({
    mutationFn: async ({ topicId, userId, depthLevel }: ResearchParams) => {
      console.log('Starting topic research:', { topicId, depthLevel })

      const response = await api.post('/research/topic', { topicId, userId, depthLevel });
      return response.data;
    },
    onSuccess: (data) => {
      const message = data.cached ? 'Research retrieved from cache' : 'Research completed successfully'
      toast.success(message)
      queryClient.invalidateQueries({ queryKey: ['topic-research'] })
    },
    onError: (error) => {
      console.error('Research mutation error:', error)
      toast.error(`Research failed: ${(error as any).message || 'Unknown error'}`)
    }
  })

  return {
    conductResearch: conductResearch.mutate,
    isResearching: conductResearch.isPending,
    researchError: conductResearch.error
  }
}

export const useTopicResearchData = (topicId: string, enabled = false) => {
  return useQuery({
    queryKey: ['topic-research', topicId],
    queryFn: async (): Promise<TopicResearch | null> => {
      const response = await api.get(`/research/topic/${topicId}`);
      const data = response.data;

      if (!data) return null;

      // Transform the Json types to proper objects
      return {
        ...data,
        key_stats: typeof data.key_stats === 'string'
          ? JSON.parse(data.key_stats)
          : (data.key_stats || {}),
        audience_insights: typeof data.audience_insights === 'string'
          ? JSON.parse(data.audience_insights)
          : (data.audience_insights || {}),
        competitor_analysis: typeof data.competitor_analysis === 'string'
          ? JSON.parse(data.competitor_analysis)
          : (data.competitor_analysis || {}),
        sources: typeof data.sources === 'string'
          ? JSON.parse(data.sources)
          : (data.sources || [])
      } as TopicResearch
    },
    enabled: !!topicId && enabled
  })
}
