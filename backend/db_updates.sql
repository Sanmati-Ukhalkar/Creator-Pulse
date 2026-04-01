ALTER TABLE drafts 
  ADD COLUMN IF NOT EXISTS upstream_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS upstream_status VARCHAR(50) DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{"likes": 0, "comments": 0, "shares": 0, "views": 0}'::jsonb;
