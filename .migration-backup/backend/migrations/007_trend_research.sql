-- Create trend_research table for storing researched trends
CREATE TABLE IF NOT EXISTS public.trend_research (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    title TEXT,
    status TEXT DEFAULT 'pending', -- pending, researching, completed, failed
    research_data JSONB DEFAULT '{}'::jsonb,
    priority_score INTEGER DEFAULT 0,
    n8n_execution_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups based on user
CREATE INDEX IF NOT EXISTS idx_trend_research_user_id ON public.trend_research(user_id);
