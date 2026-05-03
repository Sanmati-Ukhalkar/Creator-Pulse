-- Create ingested_contents table for storing scraped content
CREATE TABLE IF NOT EXISTS public.ingested_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    title TEXT,
    raw_content TEXT,
    content_md TEXT,
    content_html TEXT,
    hash TEXT NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'fetched', -- fetched, processed, error
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, hash)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ingested_contents_user_id ON public.ingested_contents(user_id);
CREATE INDEX IF NOT EXISTS idx_ingested_contents_hash ON public.ingested_contents(hash);
