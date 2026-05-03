CreatorPulse - Database Guide
1. Introduction
This document details the schema of the Supabase PostgreSQL database used by the CreatorPulse application. It describes the tables, their columns, data types, constraints, and Row Level Security (RLS) policies, designed to support the AI-powered content creation workflow for Twitter/X, LinkedIn, and Instagram creators.
The database architecture is optimized for real-time content generation, trend analysis, voice learning, and performance tracking while ensuring data privacy and security through comprehensive RLS policies.
2. Core User Management Tables
2.1. creator_profiles
Stores comprehensive creator profile information and preferences.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


user_id (uuid, NOT NULL, REFERENCES auth.users)


email (text, NOT NULL)


full_name (text)


creator_handle (text, UNIQUE)


bio (text)


avatar_url (text)


timezone (text, DEFAULT 'UTC')


voice_training_status (text, DEFAULT 'pending', CHECK (voice_training_status IN ('pending', 'training', 'completed', 'failed')))


subscription_tier (text, DEFAULT 'free', CHECK (subscription_tier IN ('free', 'creator', 'agency', 'enterprise')))


onboarding_completed (boolean, DEFAULT false)


settings (jsonb, DEFAULT '{}')


created_at (timestamptz, DEFAULT now())


updated_at (timestamptz, DEFAULT now())


Indexes:
creator_profiles_user_id_idx (UNIQUE on user_id)


creator_profiles_creator_handle_idx (UNIQUE on creator_handle)


creator_profiles_subscription_tier_idx (subscription_tier)


Row Level Security (RLS): Enabled
 Policies:
Users can create their own profile: auth.uid() = user_id


Users can view their own profile: auth.uid() = user_id


Users can update their own profile: auth.uid() = user_id


Triggers:
update_creator_profiles_updated_at: Updates updated_at column on row update


2.2. platform_connections
Manages social media platform connections and authentication tokens.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


user_id (uuid, NOT NULL, REFERENCES auth.users)


platform (text, NOT NULL, CHECK (platform IN ('twitter', 'linkedin', 'instagram')))


platform_user_id (text, NOT NULL)


platform_username (text, NOT NULL)


access_token (text) -- Comment: Encrypted access token


refresh_token (text) -- Comment: Encrypted refresh token


token_expires_at (timestamptz)


platform_data (jsonb, DEFAULT '{}') -- Comment: Platform-specific metadata


is_active (boolean, DEFAULT true)


last_sync_at (timestamptz)


created_at (timestamptz, DEFAULT now())


updated_at (timestamptz, DEFAULT now())


Indexes:
platform_connections_user_platform_idx (UNIQUE on user_id, platform)


platform_connections_platform_user_id_idx (platform, platform_user_id)


platform_connections_active_idx (is_active)


Row Level Security (RLS): Enabled
 Policies:
Users can create their own connections: auth.uid() = user_id


Users can view their own connections: auth.uid() = user_id


Users can update their own connections: auth.uid() = user_id


Users can delete their own connections: auth.uid() = user_id


Triggers:
update_platform_connections_updated_at: Updates updated_at column on row update


3. Content Generation Tables
3.1. content_drafts
Core table storing AI-generated content drafts across all platforms.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


user_id (uuid, NOT NULL, REFERENCES auth.users)


platform (text, NOT NULL, CHECK (platform IN ('twitter', 'linkedin', 'instagram')))


content_type (text, NOT NULL, CHECK (content_type IN ('single_tweet', 'thread', 'quote_tweet', 'linkedin_short', 'linkedin_long', 'linkedin_carousel', 'instagram_reel', 'instagram_carousel')))


content (text, NOT NULL)


hook (text)


hashtags (jsonb, DEFAULT '[]')


mentions (jsonb, DEFAULT '[]')


media_urls (jsonb, DEFAULT '[]')


trend_source_id (uuid, REFERENCES trend_insights(id))


voice_confidence_score (decimal(3,2), DEFAULT 0.0) -- Comment: 0.0 to 1.0 confidence in voice matching


engagement_prediction (jsonb, DEFAULT '{}') -- Comment: Predicted likes, shares, comments


status (text, DEFAULT 'pending', CHECK (status IN ('pending', 'approved', 'rejected', 'published', 'archived')))


feedback_score (integer, CHECK (feedback_score IN (-1, 0, 1))) -- Comment: -1 thumbs down, 0 neutral, 1 thumbs up


user_edits (text) -- Comment: User modifications to the original draft


published_at (timestamptz)


published_url (text)


actual_performance (jsonb, DEFAULT '{}') -- Comment: Actual engagement metrics after publishing


created_at (timestamptz, DEFAULT now())


updated_at (timestamptz, DEFAULT now())


Indexes:
content_drafts_user_id_idx (user_id)


content_drafts_platform_idx (platform)


content_drafts_status_idx (status)


content_drafts_created_at_idx (created_at)


content_drafts_feedback_score_idx (feedback_score)


content_drafts_trend_source_idx (trend_source_id)


Row Level Security (RLS): Enabled
 Policies:
Users can create their own drafts: auth.uid() = user_id


Users can view their own drafts: auth.uid() = user_id


Users can update their own drafts: auth.uid() = user_id


Users can delete their own drafts: auth.uid() = user_id


Triggers:
update_content_drafts_updated_at: Updates updated_at column on row update


3.2. voice_training_data
Stores creator voice samples and training progress.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


user_id (uuid, NOT NULL, REFERENCES auth.users)


sample_content (text, NOT NULL)


platform (text, NOT NULL, CHECK (platform IN ('twitter', 'linkedin', 'instagram')))


engagement_metrics (jsonb, DEFAULT '{}') -- Comment: Original performance metrics


content_features (jsonb, DEFAULT '{}') -- Comment: Extracted linguistic features


is_training_sample (boolean, DEFAULT true)


sample_rank (integer) -- Comment: Quality ranking of the sample


created_at (timestamptz, DEFAULT now())


Indexes:
voice_training_data_user_id_idx (user_id)


voice_training_data_platform_idx (platform)


voice_training_data_training_sample_idx (is_training_sample)


voice_training_data_rank_idx (sample_rank)


Row Level Security (RLS): Enabled
 Policies:
Users can create their own voice data: auth.uid() = user_id


Users can view their own voice data: auth.uid() = user_id


Users can update their own voice data: auth.uid() = user_id


Users can delete their own voice data: auth.uid() = user_id


3.3. voice_models
Tracks AI voice model versions and performance metrics.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


user_id (uuid, NOT NULL, REFERENCES auth.users)


model_version (text, NOT NULL)


model_config (jsonb, NOT NULL) -- Comment: Model hyperparameters and settings


training_data_count (integer, NOT NULL)


validation_score (decimal(5,4)) -- Comment: Model validation accuracy


is_active (boolean, DEFAULT false)


training_started_at (timestamptz)


training_completed_at (timestamptz)


created_at (timestamptz, DEFAULT now())


Indexes:
voice_models_user_id_idx (user_id)


voice_models_active_idx (is_active)


voice_models_version_idx (model_version)


Row Level Security (RLS): Enabled
 Policies:
Users can view their own models: auth.uid() = user_id


System can create/update models: Service role access only


4. Trend Intelligence Tables
4.1. content_sources
Manages monitored content sources for trend detection.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


user_id (uuid, NOT NULL, REFERENCES auth.users)


source_type (text, NOT NULL, CHECK (source_type IN ('twitter_handle', 'twitter_hashtag', 'linkedin_profile', 'youtube_channel', 'newsletter_rss', 'instagram_account')))


source_identifier (text, NOT NULL) -- Comment: Handle, hashtag, URL, etc.


source_name (text, NOT NULL)


source_url (text)


priority_level (integer, DEFAULT 5, CHECK (priority_level BETWEEN 1 AND 10))


is_active (boolean, DEFAULT true)


last_crawled_at (timestamptz)


crawl_frequency (interval, DEFAULT '1 hour')


source_metadata (jsonb, DEFAULT '{}') -- Comment: Platform-specific data


created_at (timestamptz, DEFAULT now())


updated_at (timestamptz, DEFAULT now())


Indexes:
content_sources_user_id_idx (user_id)


content_sources_type_idx (source_type)


content_sources_active_idx (is_active)


content_sources_priority_idx (priority_level)


content_sources_last_crawled_idx (last_crawled_at)


Row Level Security (RLS): Enabled
 Policies:
Users can create their own sources: auth.uid() = user_id


Users can view their own sources: auth.uid() = user_id


Users can update their own sources: auth.uid() = user_id


Users can delete their own sources: auth.uid() = user_id


Triggers:
update_content_sources_updated_at: Updates updated_at column on row update


4.2. trend_insights
Stores detected trends and emerging topics.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


user_id (uuid, NOT NULL, REFERENCES auth.users)


trend_topic (text, NOT NULL)


trend_description (text, NOT NULL)


confidence_score (decimal(3,2), NOT NULL) -- Comment: 0.0 to 1.0 confidence in trend detection


momentum_score (decimal(5,2)) -- Comment: Trend velocity and growth rate


source_count (integer, NOT NULL) -- Comment: Number of sources mentioning this trend


peak_prediction (timestamptz) -- Comment: Predicted peak engagement time


relevant_keywords (jsonb, DEFAULT '[]')


source_evidence (jsonb, DEFAULT '[]') -- Comment: Supporting sources and mentions


content_opportunities (jsonb, DEFAULT '[]') -- Comment: Suggested content angles


trend_category (text)


geographic_data (jsonb, DEFAULT '{}') -- Comment: Geographic trend distribution


status (text, DEFAULT 'active', CHECK (status IN ('active', 'declining', 'expired')))


expires_at (timestamptz)


created_at (timestamptz, DEFAULT now())


updated_at (timestamptz, DEFAULT now())


Indexes:
trend_insights_user_id_idx (user_id)


trend_insights_confidence_idx (confidence_score)


trend_insights_momentum_idx (momentum_score)


trend_insights_status_idx (status)


trend_insights_created_at_idx (created_at)


trend_insights_expires_at_idx (expires_at)


Row Level Security (RLS): Enabled
 Policies:
Users can view their own trends: auth.uid() = user_id


System can create/update trends: Service role access only


Triggers:
update_trend_insights_updated_at: Updates updated_at column on row update


4.3. trend_content_mapping
Links trends to generated content for tracking effectiveness.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


user_id (uuid, NOT NULL, REFERENCES auth.users)


trend_id (uuid, NOT NULL, REFERENCES trend_insights(id) ON DELETE CASCADE)


content_draft_id (uuid, NOT NULL, REFERENCES content_drafts(id) ON DELETE CASCADE)


relevance_score (decimal(3,2)) -- Comment: How well content matches trend


created_at (timestamptz, DEFAULT now())


Indexes:
trend_content_mapping_user_id_idx (user_id)


trend_content_mapping_trend_idx (trend_id)


trend_content_mapping_content_idx (content_draft_id)


trend_content_mapping_relevance_idx (relevance_score)


Row Level Security (RLS): Enabled
 Policies:
Users can view their own mappings: auth.uid() = user_id


System can create mappings: Service role access only


5. Delivery & Notification Tables
5.1. delivery_preferences
User preferences for content delivery and notifications.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


user_id (uuid, NOT NULL, REFERENCES auth.users)


delivery_time (time, DEFAULT '08:00:00') -- Comment: Local delivery time


delivery_days (jsonb, DEFAULT '["monday","tuesday","wednesday","thursday","friday"]') -- Comment: Days of week


email_enabled (boolean, DEFAULT true)


whatsapp_enabled (boolean, DEFAULT false)


whatsapp_number (text)


push_notifications_enabled (boolean, DEFAULT true)


content_formats (jsonb, DEFAULT '[]') -- Comment: Preferred content types


platforms (jsonb, DEFAULT '[]') -- Comment: Enabled platforms


trend_alerts_enabled (boolean, DEFAULT true)


max_drafts_per_delivery (integer, DEFAULT 5)


created_at (timestamptz, DEFAULT now())


updated_at (timestamptz, DEFAULT now())


Indexes:
delivery_preferences_user_id_idx (UNIQUE on user_id)


delivery_preferences_delivery_time_idx (delivery_time)


Row Level Security (RLS): Enabled
 Policies:
Users can create their own preferences: auth.uid() = user_id


Users can view their own preferences: auth.uid() = user_id


Users can update their own preferences: auth.uid() = user_id


Triggers:
update_delivery_preferences_updated_at: Updates updated_at column on row update


5.2. daily_deliveries
Tracks daily content deliveries to users.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


user_id (uuid, NOT NULL, REFERENCES auth.users)


delivery_date (date, NOT NULL)


delivery_status (text, DEFAULT 'pending', CHECK (delivery_status IN ('pending', 'delivered', 'failed', 'skipped')))


content_draft_ids (jsonb, DEFAULT '[]') -- Comment: Array of delivered draft IDs


trend_insight_ids (jsonb, DEFAULT '[]') -- Comment: Array of included trend IDs


delivery_channel (text, CHECK (delivery_channel IN ('email', 'whatsapp', 'push')))


delivered_at (timestamptz)


opened_at (timestamptz)


error_message (text)


created_at (timestamptz, DEFAULT now())


Indexes:
daily_deliveries_user_date_idx (UNIQUE on user_id, delivery_date)


daily_deliveries_status_idx (delivery_status)


daily_deliveries_delivery_date_idx (delivery_date)


daily_deliveries_delivered_at_idx (delivered_at)


Row Level Security (RLS): Enabled
 Policies:
Users can view their own deliveries: auth.uid() = user_id


System can create/update deliveries: Service role access only


6. Analytics & Performance Tables
6.1. creator_analytics
Comprehensive analytics for creator performance tracking.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


user_id (uuid, NOT NULL, REFERENCES auth.users)


metric_date (date, NOT NULL)


platform (text, NOT NULL, CHECK (platform IN ('twitter', 'linkedin', 'instagram', 'overall')))


drafts_generated (integer, DEFAULT 0)


drafts_accepted (integer, DEFAULT 0)


drafts_rejected (integer, DEFAULT 0)


content_published (integer, DEFAULT 0)


avg_review_time_minutes (decimal(8,2))


total_impressions (bigint, DEFAULT 0)


total_engagements (bigint, DEFAULT 0)


follower_count (integer)


engagement_rate (decimal(5,4))


voice_confidence_avg (decimal(3,2))


trend_utilization_rate (decimal(3,2)) -- Comment: Percentage of trends acted upon


baseline_comparison (jsonb, DEFAULT '{}') -- Comment: Pre-AI vs AI-assisted metrics


created_at (timestamptz, DEFAULT now())


updated_at (timestamptz, DEFAULT now())


Indexes:
creator_analytics_user_date_idx (user_id, metric_date)


creator_analytics_platform_idx (platform)


creator_analytics_metric_date_idx (metric_date)


Row Level Security (RLS): Enabled
 Policies:
Users can view their own analytics: auth.uid() = user_id


System can create/update analytics: Service role access only


Triggers:
update_creator_analytics_updated_at: Updates updated_at column on row update


6.2. content_performance
Detailed performance tracking for individual content pieces.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


user_id (uuid, NOT NULL, REFERENCES auth.users)


content_draft_id (uuid, NOT NULL, REFERENCES content_drafts(id) ON DELETE CASCADE)


platform_post_id (text) -- Comment: Platform-specific post ID


impressions (bigint, DEFAULT 0)


likes (integer, DEFAULT 0)


shares (integer, DEFAULT 0)


comments (integer, DEFAULT 0)


clicks (integer, DEFAULT 0)


saves (integer, DEFAULT 0)


engagement_rate (decimal(5,4))


reach (bigint)


video_views (bigint) -- Comment: For video content


performance_score (decimal(5,2)) -- Comment: Normalized performance score


vs_prediction_accuracy (decimal(3,2)) -- Comment: How accurate was the prediction


last_updated_at (timestamptz, DEFAULT now())


created_at (timestamptz, DEFAULT now())


Indexes:
content_performance_user_id_idx (user_id)


content_performance_content_draft_idx (content_draft_id)


content_performance_score_idx (performance_score)


content_performance_engagement_rate_idx (engagement_rate)


Row Level Security (RLS): Enabled
 Policies:
Users can view their own performance data: auth.uid() = user_id


System can create/update performance data: Service role access only


7. Billing & Usage Tables
7.1. usage_tracking
Tracks usage for billing and analytics purposes.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


user_id (uuid, NOT NULL, REFERENCES auth.users)


usage_date (date, NOT NULL)


action_type (text, NOT NULL, CHECK (action_type IN ('draft_generated', 'draft_accepted', 'draft_rejected', 'trend_analyzed', 'voice_training')))


platform (text, CHECK (platform IN ('twitter', 'linkedin', 'instagram')))


credits_consumed (decimal(8,2), DEFAULT 1.0)


metadata (jsonb, DEFAULT '{}') -- Comment: Additional usage context


created_at (timestamptz, DEFAULT now())


Indexes:
usage_tracking_user_date_idx (user_id, usage_date)


usage_tracking_action_type_idx (action_type)


usage_tracking_created_at_idx (created_at)


Row Level Security (RLS): Enabled
 Policies:
Users can view their own usage: auth.uid() = user_id


System can create usage records: Service role access only


7.2. subscription_billing
Manages subscription and billing information.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


user_id (uuid, NOT NULL, REFERENCES auth.users)


stripe_customer_id (text, UNIQUE)


stripe_subscription_id (text, UNIQUE)


subscription_status (text, NOT NULL, CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'unpaid', 'trialing')))


current_period_start (timestamptz)


current_period_end (timestamptz)


credit_balance (decimal(10,2), DEFAULT 0.0)


monthly_credit_limit (decimal(10,2))


overage_rate (decimal(6,4)) -- Comment: Cost per credit over limit


billing_metadata (jsonb, DEFAULT '{}')


created_at (timestamptz, DEFAULT now())


updated_at (timestamptz, DEFAULT now())


Indexes:
subscription_billing_user_id_idx (UNIQUE on user_id)


subscription_billing_stripe_customer_idx (stripe_customer_id)


subscription_billing_stripe_subscription_idx (stripe_subscription_id)


subscription_billing_status_idx (subscription_status)


Row Level Security (RLS): Enabled
 Policies:
Users can view their own billing: auth.uid() = user_id


System can create/update billing: Service role access only


Triggers:
update_subscription_billing_updated_at: Updates updated_at column on row update


8. Agency Management Tables
8.1. agency_clients
Manages agency client relationships and permissions.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


agency_user_id (uuid, NOT NULL, REFERENCES auth.users)


client_user_id (uuid, NOT NULL, REFERENCES auth.users)


client_name (text, NOT NULL)


client_brand (text)


permissions (jsonb, DEFAULT '{}') -- Comment: What agency can do for client


billing_allocation (decimal(5,2)) -- Comment: Percentage of agency credits


is_active (boolean, DEFAULT true)


created_at (timestamptz, DEFAULT now())


updated_at (timestamptz, DEFAULT now())


Indexes:
agency_clients_agency_user_idx (agency_user_id)


agency_clients_client_user_idx (client_user_id)


agency_clients_agency_client_idx (UNIQUE on agency_user_id, client_user_id)


agency_clients_active_idx (is_active)


Row Level Security (RLS): Enabled
 Policies:
Agency users can manage their clients: auth.uid() = agency_user_id


Client users can view their agency relationships: auth.uid() = client_user_id


Triggers:
update_agency_clients_updated_at: Updates updated_at column on row update


9. System Tables
9.1. ai_processing_logs
Logs AI processing requests and responses for debugging and optimization.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


user_id (uuid, REFERENCES auth.users)


processing_type (text, NOT NULL, CHECK (processing_type IN ('content_generation', 'trend_analysis', 'voice_training', 'performance_prediction')))


input_data (jsonb, NOT NULL)


output_data (jsonb)


model_version (text)


processing_time_ms (integer)


tokens_consumed (integer)


status (text, DEFAULT 'pending', CHECK (status IN ('pending', 'completed', 'failed', 'timeout')))


error_message (text)


webhook_response (jsonb) -- Comment: Full webhook response for debugging


created_at (timestamptz, DEFAULT now())


completed_at (timestamptz)


Indexes:
ai_processing_logs_user_id_idx (user_id)


ai_processing_logs_type_idx (processing_type)


ai_processing_logs_status_idx (status)


ai_processing_logs_created_at_idx (created_at)


Row Level Security (RLS): Enabled
 Policies:
System access only: Service role restricted


9.2. system_health_metrics
Monitors system performance and health indicators.
Columns:
id (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())


metric_name (text, NOT NULL)


metric_value (decimal(12,4), NOT NULL)


metric_unit (text)


tags (jsonb, DEFAULT '{}') -- Comment: Additional metric metadata


recorded_at (timestamptz, DEFAULT now())


Indexes:
system_health_metrics_name_idx (metric_name)


system_health_metrics_recorded_at_idx (recorded_at)


system_health_metrics_name_time_idx (metric_name, recorded_at)


Row Level Security (RLS): Enabled
 Policies:
System access only: Service role restricted


10. Database Functions and Triggers
Automatic Timestamp Updates
sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

Voice Model Activation
sql
CREATE OR REPLACE FUNCTION activate_voice_model()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        -- Deactivate other models for this user
        UPDATE voice_models 
        SET is_active = false 
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

Usage Credit Calculation
sql
CREATE OR REPLACE FUNCTION calculate_daily_credits(user_uuid uuid, target_date date)
RETURNS decimal AS $$
DECLARE
    total_credits decimal;
BEGIN
    SELECT COALESCE(SUM(credits_consumed), 0) 
    INTO total_credits
    FROM usage_tracking 
    WHERE user_id = user_uuid AND usage_date = target_date;
    
    RETURN total_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

11. Data Retention and Archival
Content Draft Archival
Drafts older than 90 days with status 'rejected' are automatically archived


Published drafts are retained for 1 year for performance analysis


Archived data is moved to separate tables with reduced indexing


Analytics Data Retention
Daily analytics are retained indefinitely for trend analysis


Detailed performance metrics are aggregated to weekly/monthly summaries after 6 months


AI processing logs are retained for 30 days for debugging purposes


Privacy and Compliance
All user data can be completely purged upon account deletion


GDPR compliance through comprehensive data export functions


PII data is encrypted at rest using Supabase's built-in encryption


© CreatorPulse Inc - All rights reserved. This document contains confidential database schema information. Unauthorized distribution is prohibited.

