-- Add upstream tracking fields to drafts table
ALTER TABLE drafts
ADD COLUMN IF NOT EXISTS upstream_id TEXT,
ADD COLUMN IF NOT EXISTS upstream_status TEXT;
