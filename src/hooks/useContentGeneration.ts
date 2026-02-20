import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export interface GenerateContentParams {
  topic: string; // The topic title
  description: string; // The context/description
  platform: string; // 'linkedin', etc.
  contentType: string; // 'text_post' -> mapped to 'linkedin_short'
  keywords?: string[];
  voiceSamples?: string[];
}

export const useContentGeneration = () => {
  const queryClient = useQueryClient()

  const generateContent = useMutation({
    mutationFn: async (params: GenerateContentParams) => {
      console.log('Generating content via Backend API:', params)

      // Map frontend params to backend schema
      // Backend expects: { topic, description, content_type, ... }

      let backendContentType = 'linkedin_short';
      if (params.contentType === 'article' || params.contentType === 'linkedin_long') {
        backendContentType = 'linkedin_long';
      }

      const payload = {
        topic: params.topic,
        description: params.description || `Write a post about ${params.topic}`,
        content_type: backendContentType,
        keywords: params.keywords || [],
        voice_samples: params.voiceSamples || [],
        source_url: null,
      };

      const { data } = await api.post('/generate', payload);
      return data;
    },
    onSuccess: (response) => {
      toast.success('Content generated successfully!')
      // Invalidate drafts query to show new item if we saved it?
      // Currently backend returns the generated text but doesn't auto-save to DB as draft (it returned result).
      // The frontend needs to handle the result (display in editor).
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
      return response;
    },
    onError: (error: any) => {
      console.error('Content generation mutation error:', error)
      toast.error(error.response?.data?.error || 'Failed to generate content')
    }
  })

  return {
    generateContent: generateContent.mutate,
    generateContentAsync: generateContent.mutateAsync, // Export async version for awaiting result
    isGenerating: generateContent.isPending,
    generationError: generateContent.error,
    generatedResult: generateContent.data // Expose data to component
  }
}
