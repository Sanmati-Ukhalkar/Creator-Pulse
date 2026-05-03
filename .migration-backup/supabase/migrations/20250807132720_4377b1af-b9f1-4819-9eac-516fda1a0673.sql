-- Create sources table for managing content sources
CREATE TABLE public.sources (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('twitter', 'rss', 'tags')),
    source_name TEXT NOT NULL,
    source_url TEXT,
    source_config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'error')),
    sync_error TEXT,
    metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sources" 
ON public.sources 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sources" 
ON public.sources 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sources" 
ON public.sources 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sources" 
ON public.sources 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sources_updated_at
BEFORE UPDATE ON public.sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_sources_user_id ON public.sources(user_id);
CREATE INDEX idx_sources_type_active ON public.sources(source_type, is_active);
CREATE INDEX idx_sources_last_sync ON public.sources(last_sync_at);

-- Create source_analytics table for tracking performance
CREATE TABLE public.source_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    posts_analyzed INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0.00,
    avg_reach INTEGER DEFAULT 0,
    top_performing_content TEXT,
    analytics_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for analytics
ALTER TABLE public.source_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for analytics (users can only see analytics for their sources)
CREATE POLICY "Users can view analytics for their sources" 
ON public.source_analytics 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.sources 
        WHERE sources.id = source_analytics.source_id 
        AND sources.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert analytics for their sources" 
ON public.source_analytics 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sources 
        WHERE sources.id = source_analytics.source_id 
        AND sources.user_id = auth.uid()
    )
);

-- Create indexes for analytics
CREATE INDEX idx_source_analytics_source_id ON public.source_analytics(source_id);
CREATE INDEX idx_source_analytics_date ON public.source_analytics(date);
CREATE UNIQUE INDEX idx_source_analytics_unique_daily ON public.source_analytics(source_id, date);