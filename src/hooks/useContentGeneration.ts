import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export interface GenerateContentParams {
  topic: string; // The topic title
  description: string; // The context/description
  platform: string; // 'linkedin', etc.
  contentType: string; // 'text_post' -> mapped to 'linkedin_short'
  keywords?: string[];
  hookText?: string;
  useEnsemble?: boolean;
}

export interface GenerateHooksParams {
  topic: string;
  description: string;
  angle?: string;
}

export const streamContentGeneration = async (
  params: GenerateContentParams,
  onChunk: (text: string) => void,
  onDone: (draftId: string) => void,
  onError: (err: any) => void
) => {
  try {
    let backendContentType = 'linkedin_short';
    if (params.contentType === 'article' || params.contentType === 'linkedin_long') {
      backendContentType = 'linkedin_long';
    }

    const payload = {
      topic: params.topic,
      description: params.description || `Write a post about ${params.topic}`,
      content_type: backendContentType,
      keywords: params.keywords || [],
      hook_text: params.hookText,
      source_url: null,
      use_ensemble: params.useEnsemble || false,
    };

    const token = localStorage.getItem('auth_token');
    const baseURL = import.meta.env.VITE_API_URL || '/api';

    const response = await fetch(`${baseURL}/generate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) throw new Error("No reader");

    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the incomplete line in the buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              onError(data.error);
              return;
            }
            if (data.chunk) {
              onChunk(data.chunk);
            }
            if (data.done) {
              onDone(data.draft_id);
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }
  } catch (err: any) {
    onError(err);
  }
};

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
        hook_text: params.hookText,
        source_url: null,
        use_ensemble: params.useEnsemble || false,
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

  const generateHooks = useMutation({
    mutationFn: async (params: GenerateHooksParams) => {
      console.log('Generating hooks via Backend API:', params)
      const payload = {
        topic: params.topic,
        description: params.description || `Write a post about ${params.topic}`,
        angle: params.angle,
      };
      const { data } = await api.post('/generate/hooks', payload);
      return data;
    },
    onSuccess: (response) => {
      toast.success('Hooks generated successfully!')
      return response;
    },
    onError: (error: any) => {
      console.error('Hook generation mutation error:', error)
      toast.error(error.response?.data?.error || 'Failed to generate hooks')
    }
  })

  return {
    generateContent: generateContent.mutate,
    generateContentAsync: generateContent.mutateAsync, // Export async version for awaiting result
    isGenerating: generateContent.isPending,
    generationError: generateContent.error,
    generatedResult: generateContent.data, // Expose data to component

    // Hook generator specifically
    generateHooksAsync: generateHooks.mutateAsync,
    isGeneratingHooks: generateHooks.isPending,
  }
}
