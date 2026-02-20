export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      content_samples: {
        Row: {
          content: string
          created_at: string
          engagement_metrics: Json | null
          id: string
          platform: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          engagement_metrics?: Json | null
          id?: string
          platform: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          engagement_metrics?: Json | null
          id?: string
          platform?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          creator_handle: string | null
          creator_type: string | null
          email: string
          follower_range: string | null
          full_name: string | null
          id: string
          industry: string | null
          onboarding_completed: boolean | null
          platforms: string[] | null
          settings: Json | null
          subscription_tier: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          creator_handle?: string | null
          creator_type?: string | null
          email: string
          follower_range?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          onboarding_completed?: boolean | null
          platforms?: string[] | null
          settings?: Json | null
          subscription_tier?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          creator_handle?: string | null
          creator_type?: string | null
          email?: string
          follower_range?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          onboarding_completed?: boolean | null
          platforms?: string[] | null
          settings?: Json | null
          subscription_tier?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_preferences: {
        Row: {
          channels: string[] | null
          created_at: string
          delivery_time: string | null
          frequency: string | null
          id: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channels?: string[] | null
          created_at?: string
          delivery_time?: string | null
          frequency?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channels?: string[] | null
          created_at?: string
          delivery_time?: string | null
          frequency?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_schedules: {
        Row: {
          auto_generate: boolean
          content_type: Database["public"]["Enums"]["delivery_content_type_enum"]
          created_at: string
          custom_prompt: string | null
          draft_id: string | null
          id: string
          platform: Database["public"]["Enums"]["delivery_platform_enum"]
          recurring_config: Json | null
          scheduled_for: string
          status: Database["public"]["Enums"]["delivery_status_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_generate?: boolean
          content_type: Database["public"]["Enums"]["delivery_content_type_enum"]
          created_at?: string
          custom_prompt?: string | null
          draft_id?: string | null
          id?: string
          platform: Database["public"]["Enums"]["delivery_platform_enum"]
          recurring_config?: Json | null
          scheduled_for: string
          status?: Database["public"]["Enums"]["delivery_status_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_generate?: boolean
          content_type?: Database["public"]["Enums"]["delivery_content_type_enum"]
          created_at?: string
          custom_prompt?: string | null
          draft_id?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["delivery_platform_enum"]
          recurring_config?: Json | null
          scheduled_for?: string
          status?: Database["public"]["Enums"]["delivery_status_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_delivery_schedules_draft_id"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_delivery_schedules_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      drafts: {
        Row: {
          content: Json
          content_type: string
          created_at: string
          id: string
          metadata: Json | null
          platform: string
          scheduled_for: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          content_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          platform: string
          scheduled_for?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          content_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          platform?: string
          scheduled_for?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ingested_contents: {
        Row: {
          content_html: string | null
          content_md: string | null
          created_at: string
          fetched_at: string
          hash: string | null
          id: string
          metadata: Json
          published_at: string | null
          raw_content: string | null
          source_id: string
          status: string
          title: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          content_html?: string | null
          content_md?: string | null
          created_at?: string
          fetched_at?: string
          hash?: string | null
          id?: string
          metadata?: Json
          published_at?: string | null
          raw_content?: string | null
          source_id: string
          status?: string
          title?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          content_html?: string | null
          content_md?: string | null
          created_at?: string
          fetched_at?: string
          hash?: string | null
          id?: string
          metadata?: Json
          published_at?: string | null
          raw_content?: string | null
          source_id?: string
          status?: string
          title?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingested_contents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_steps: {
        Row: {
          created_at: string
          id: string
          is_required: boolean | null
          step_description: string | null
          step_name: string
          step_order: number
          step_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          step_description?: string | null
          step_name: string
          step_order: number
          step_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          step_description?: string | null
          step_name?: string
          step_order?: number
          step_type?: string
        }
        Relationships: []
      }
      source_analytics: {
        Row: {
          analytics_data: Json | null
          avg_reach: number | null
          created_at: string
          date: string
          engagement_rate: number | null
          id: string
          posts_analyzed: number | null
          source_id: string
          top_performing_content: string | null
        }
        Insert: {
          analytics_data?: Json | null
          avg_reach?: number | null
          created_at?: string
          date?: string
          engagement_rate?: number | null
          id?: string
          posts_analyzed?: number | null
          source_id: string
          top_performing_content?: string | null
        }
        Update: {
          analytics_data?: Json | null
          avg_reach?: number | null
          created_at?: string
          date?: string
          engagement_rate?: number | null
          id?: string
          posts_analyzed?: number | null
          source_id?: string
          top_performing_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_analytics_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          category: string | null
          created_at: string
          credibility_score: number | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          metrics: Json | null
          source_config: Json | null
          source_name: string
          source_type: string
          source_url: string | null
          sync_error: string | null
          sync_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          credibility_score?: number | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          metrics?: Json | null
          source_config?: Json | null
          source_name: string
          source_type: string
          source_url?: string | null
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          credibility_score?: number | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          metrics?: Json | null
          source_config?: Json | null
          source_name?: string
          source_type?: string
          source_url?: string | null
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      topic_research: {
        Row: {
          audience_insights: Json
          cached_until: string | null
          competitor_analysis: Json
          content_angles: string[]
          created_at: string
          credibility_score: number
          depth_level: string
          hashtags: string[]
          id: string
          key_stats: Json
          sources: Json
          summary: string | null
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audience_insights?: Json
          cached_until?: string | null
          competitor_analysis?: Json
          content_angles?: string[]
          created_at?: string
          credibility_score?: number
          depth_level: string
          hashtags?: string[]
          id?: string
          key_stats?: Json
          sources?: Json
          summary?: string | null
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audience_insights?: Json
          cached_until?: string | null
          competitor_analysis?: Json
          content_angles?: string[]
          created_at?: string
          credibility_score?: number
          depth_level?: string
          hashtags?: string[]
          id?: string
          key_stats?: Json
          sources?: Json
          summary?: string | null
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_research_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          cluster_id: string | null
          confidence_score: number
          created_at: string
          description: string | null
          id: string
          is_trending: boolean
          keywords: string[]
          source_content_id: string
          title: string
          topic_type: string | null
          trend_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cluster_id?: string | null
          confidence_score?: number
          created_at?: string
          description?: string | null
          id?: string
          is_trending?: boolean
          keywords?: string[]
          source_content_id: string
          title: string
          topic_type?: string | null
          trend_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cluster_id?: string | null
          confidence_score?: number
          created_at?: string
          description?: string | null
          id?: string
          is_trending?: boolean
          keywords?: string[]
          source_content_id?: string
          title?: string
          topic_type?: string | null
          trend_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_source_content_id_fkey"
            columns: ["source_content_id"]
            isOneToOne: false
            referencedRelation: "ingested_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_research: {
        Row: {
          categories: string[] | null
          created_at: string
          error_message: string | null
          generated_at: string | null
          id: string
          is_selected: boolean
          n8n_execution_id: string | null
          priority_score: number | null
          requested_at: string
          research_data: Json
          retry_count: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: string[] | null
          created_at?: string
          error_message?: string | null
          generated_at?: string | null
          id?: string
          is_selected?: boolean
          n8n_execution_id?: string | null
          priority_score?: number | null
          requested_at?: string
          research_data?: Json
          retry_count?: number | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: string[] | null
          created_at?: string
          error_message?: string | null
          generated_at?: string | null
          id?: string
          is_selected?: boolean
          n8n_execution_id?: string | null
          priority_score?: number | null
          requested_at?: string
          research_data?: Json
          retry_count?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean | null
          onboarding_step_id: string
          step_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          onboarding_step_id: string
          step_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          onboarding_step_id?: string
          step_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_onboarding_progress_onboarding_step_id_fkey"
            columns: ["onboarding_step_id"]
            isOneToOne: false
            referencedRelation: "onboarding_steps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_trigger_trend_research: {
        Args: { p_minutes?: number; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      delivery_content_type_enum:
        | "post"
        | "thread"
        | "story"
        | "reel"
        | "video"
        | "carousel"
        | "article"
      delivery_platform_enum:
        | "twitter"
        | "linkedin"
        | "instagram"
        | "facebook"
        | "youtube"
        | "tiktok"
      delivery_status_enum:
        | "scheduled"
        | "processing"
        | "sent"
        | "failed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      delivery_content_type_enum: [
        "post",
        "thread",
        "story",
        "reel",
        "video",
        "carousel",
        "article",
      ],
      delivery_platform_enum: [
        "twitter",
        "linkedin",
        "instagram",
        "facebook",
        "youtube",
        "tiktok",
      ],
      delivery_status_enum: [
        "scheduled",
        "processing",
        "sent",
        "failed",
        "cancelled",
      ],
    },
  },
} as const
