import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export interface GenerateContentParams {
  topic: string;
  description: string;
  platform: string;
  contentType: string;
  keywords?: string[];
  voiceSamples?: string[];
  hookText?: string;
}

export interface GenerateHooksParams {
  topic: string;
  description: string;
  angle?: string;
  voiceSamples?: string[];
}

export const useContentGeneration = () => {
  const queryClient = useQueryClient()

  const generateContent = useMutation({
    mutationFn: async (params: GenerateContentParams) => {
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
        hook_text: params.hookText,
        source_url: null,
      };

      const { data } = await api.post('/generate', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Content generated successfully!')
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || 'Failed to generate content')
    }
  })

  const generateHooks = useMutation({
    mutationFn: async (params: GenerateHooksParams) => {
      const payload = {
        topic: params.topic,
        description: params.description || `Write a post about ${params.topic}`,
        angle: params.angle,
        voice_samples: params.voiceSamples || [],
      };
      const { data } = await api.post('/generate/hooks', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Hooks generated successfully!')
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || 'Failed to generate hooks')
    }
  })

  return {
    generateContent: generateContent.mutate,
    generateContentAsync: generateContent.mutateAsync,
    isGenerating: generateContent.isPending,
    generationError: generateContent.error,
    generatedResult: generateContent.data,
    generateHooksAsync: generateHooks.mutateAsync,
    isGeneratingHooks: generateHooks.isPending,
  }
}
