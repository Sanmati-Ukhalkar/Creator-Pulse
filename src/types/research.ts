
export interface TopicResearch {
  id: string
  user_id: string
  topic_id: string
  depth_level: string
  summary: string | null
  key_stats: Record<string, any>
  audience_insights: Record<string, any>
  competitor_analysis: Record<string, any>
  content_angles: string[]
  hashtags: string[]
  sources: Array<{ url: string; credibility: string }>
  credibility_score: number
  cached_until: string | null
  created_at: string
  updated_at: string
}
