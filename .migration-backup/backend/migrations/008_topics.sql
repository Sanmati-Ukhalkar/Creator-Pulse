-- Create topics table for storing AI-generated or manually added topics
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    keywords TEXT[] DEFAULT '{}',
    confidence_score INTEGER DEFAULT 0,
    trend_score INTEGER DEFAULT 0,
    is_trending BOOLEAN DEFAULT FALSE,
    topic_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups based on user
CREATE INDEX IF NOT EXISTS idx_topics_user_id ON public.topics(user_id);
