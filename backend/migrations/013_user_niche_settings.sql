-- 013_user_niche_settings.sql

-- Add niche and audience to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS niche TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_audience TEXT;

-- Create listening_queries table
CREATE TABLE IF NOT EXISTS listening_queries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query_string TEXT NOT NULL,
    source_platform TEXT NOT NULL DEFAULT 'tavily',
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listening_queries_user ON listening_queries(user_id);
