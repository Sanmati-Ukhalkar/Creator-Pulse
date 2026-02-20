
-- Phase 0: Database State Verification & Fixes (Corrected Version)
-- Step 1: Create ENUM types for data validation

-- Source type validation
CREATE TYPE source_type_enum AS ENUM ('rss', 'twitter', 'linkedin', 'manual');

-- Draft status validation  
CREATE TYPE draft_status_enum AS ENUM ('draft', 'scheduled', 'published', 'archived');

-- Delivery frequency validation
CREATE TYPE frequency_enum AS ENUM ('daily', 'weekly', 'monthly');

-- Sync status validation
CREATE TYPE sync_status_enum AS ENUM ('pending', 'syncing', 'completed', 'failed');

-- Content status validation
CREATE TYPE content_status_enum AS ENUM ('fetched', 'processed', 'analyzed', 'archived');

-- Step 2: Apply ENUM constraints to existing tables
ALTER TABLE sources 
  ALTER COLUMN source_type TYPE source_type_enum 
  USING source_type::source_type_enum;

ALTER TABLE sources 
  ALTER COLUMN sync_status TYPE sync_status_enum 
  USING sync_status::sync_status_enum;

ALTER TABLE drafts 
  ALTER COLUMN status TYPE draft_status_enum 
  USING status::draft_status_enum;

ALTER TABLE delivery_preferences 
  ALTER COLUMN frequency TYPE frequency_enum 
  USING frequency::frequency_enum;

ALTER TABLE ingested_contents 
  ALTER COLUMN status TYPE content_status_enum 
  USING status::content_status_enum;

-- Step 3: Add Foreign Key Constraints with RESTRICT behavior for safer deletion
-- Sources must belong to valid users
ALTER TABLE sources 
  ADD CONSTRAINT fk_sources_user_id 
  FOREIGN KEY (user_id) REFERENCES creator_profiles(user_id) 
  ON DELETE RESTRICT;

-- Drafts must belong to valid users
ALTER TABLE drafts 
  ADD CONSTRAINT fk_drafts_user_id 
  FOREIGN KEY (user_id) REFERENCES creator_profiles(user_id) 
  ON DELETE RESTRICT;

-- Topics must belong to valid users
ALTER TABLE topics 
  ADD CONSTRAINT fk_topics_user_id 
  FOREIGN KEY (user_id) REFERENCES creator_profiles(user_id) 
  ON DELETE RESTRICT;

-- Ingested contents must belong to valid users and sources
ALTER TABLE ingested_contents 
  ADD CONSTRAINT fk_ingested_contents_user_id 
  FOREIGN KEY (user_id) REFERENCES creator_profiles(user_id) 
  ON DELETE RESTRICT;

ALTER TABLE ingested_contents 
  ADD CONSTRAINT fk_ingested_contents_source_id 
  FOREIGN KEY (source_id) REFERENCES sources(id) 
  ON DELETE RESTRICT;

-- Delivery preferences must belong to valid users
ALTER TABLE delivery_preferences 
  ADD CONSTRAINT fk_delivery_preferences_user_id 
  FOREIGN KEY (user_id) REFERENCES creator_profiles(user_id) 
  ON DELETE RESTRICT;

-- Content samples must belong to valid users
ALTER TABLE content_samples 
  ADD CONSTRAINT fk_content_samples_user_id 
  FOREIGN KEY (user_id) REFERENCES creator_profiles(user_id) 
  ON DELETE RESTRICT;

-- Topic research must belong to valid users and topics
ALTER TABLE topic_research 
  ADD CONSTRAINT fk_topic_research_user_id 
  FOREIGN KEY (user_id) REFERENCES creator_profiles(user_id) 
  ON DELETE RESTRICT;

ALTER TABLE topic_research 
  ADD CONSTRAINT fk_topic_research_topic_id 
  FOREIGN KEY (topic_id) REFERENCES topics(id) 
  ON DELETE RESTRICT;

-- User onboarding progress must belong to valid users
ALTER TABLE user_onboarding_progress 
  ADD CONSTRAINT fk_user_onboarding_progress_user_id 
  FOREIGN KEY (user_id) REFERENCES creator_profiles(user_id) 
  ON DELETE RESTRICT;

-- Source analytics must belong to valid sources
ALTER TABLE source_analytics 
  ADD CONSTRAINT fk_source_analytics_source_id 
  FOREIGN KEY (source_id) REFERENCES sources(id) 
  ON DELETE RESTRICT;

-- Step 4: Add the two missing foreign key relationships
-- Topics must link to the content they were generated from
ALTER TABLE topics
  ADD CONSTRAINT fk_topics_source_content_id
  FOREIGN KEY (source_content_id) REFERENCES ingested_contents(id)
  ON DELETE SET NULL;

-- User progress must be tied to a valid onboarding step
ALTER TABLE user_onboarding_progress
  ADD CONSTRAINT fk_user_onboarding_progress_step_id
  FOREIGN KEY (onboarding_step_id) REFERENCES onboarding_steps(id)
  ON DELETE RESTRICT;
