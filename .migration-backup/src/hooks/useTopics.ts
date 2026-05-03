import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Topic {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  keywords: string[];
  confidence_score: number;
  trend_score: number;
  is_trending: boolean;
  created_at: string;
  updated_at: string;
  topic_type: string | null;
}

export const useTopics = (date: Date | null) => {
  return useQuery({
    queryKey: ["topics", date?.toDateString() ?? "all"],
    queryFn: async () => {
      const params = date ? { date: date.toISOString() } : {};
      const { data } = await api.get("/topics", { params });
      return (data as Topic[]) ?? [];
    },
    // refetchInterval: 15 * 60 * 1000, // Optional
    retry: false,
  });
};