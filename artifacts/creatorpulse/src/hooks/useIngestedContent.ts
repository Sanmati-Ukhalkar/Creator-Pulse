
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export const useIngestedContent = (userId?: string) => {
  return useQuery({
    queryKey: ['ingested-contents', userId],
    queryFn: async () => {
      // Backend automatically checks auth middleware for user ID
      const { data } = await api.get('/ingested-contents');
      return data || []
    },
    enabled: !!userId,
    retry: false
  })
}

export const useIngestedContentById = (contentId: string) => {
  return useQuery({
    queryKey: ['ingested-content', contentId],
    queryFn: async () => {
      const { data } = await api.get(`/ingested-contents/${contentId}`);
      return data
    },
    enabled: !!contentId,
    retry: false
  })
}
