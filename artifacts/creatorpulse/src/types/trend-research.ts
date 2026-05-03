
export interface TrendResearch {
  id: string
  user_id: string
  title: string
  research_data: Record<string, any>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  requested_at: string
  generated_at: string | null
  n8n_execution_id: string | null
  is_selected: boolean
  priority_score: number
  categories: string[]
  error_message: string | null
  retry_count: number
  created_at: string
  updated_at: string
}

export interface TriggerTrendResearchParams {
  title: string
  categories?: string[]
}

export interface N8nWebhookPayload {
  execution_id: string
  user_id: string
  trend_id: string
  title: string
  categories: string[]
}

export interface N8nCallbackPayload {
  execution_id: string
  research_data?: Record<string, any>
  status?: 'completed' | 'failed'
  error_message?: string
  priority_score?: number
}
