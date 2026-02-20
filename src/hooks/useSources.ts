import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface CreateSourceData {
  source_type: 'twitter' | 'rss' | 'tags';
  source_name: string;
  source_url?: string;
  source_config?: any;
}

export const useSources = () => {
  const queryClient = useQueryClient();

  const createSourceMutation = useMutation({
    mutationFn: async (data: CreateSourceData) => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error("Not authenticated");

      await api.post('/sources', {
        source_type: data.source_type,
        source_name: data.source_name,
        source_url: data.source_url,
        source_config: data.source_config || {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      toast.success("Source added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add source");
      console.error(error);
    }
  });

  const validateRSSFeed = async (url: string): Promise<boolean> => {
    try {
      const response = await api.post('/scraper/validate-rss', { url });
      return Boolean(response.data?.valid);
    } catch {
      return false
    }
  };

  return {
    createSource: createSourceMutation.mutate,
    isCreating: createSourceMutation.isPending,
    validateRSSFeed,
  };
};