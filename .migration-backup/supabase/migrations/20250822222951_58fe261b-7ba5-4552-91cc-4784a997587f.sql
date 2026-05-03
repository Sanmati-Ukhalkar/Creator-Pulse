
-- First, ensure the updated_at trigger function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the existing table if it exists to start fresh
DROP TABLE IF EXISTS public.trend_research CASCADE;

-- Create trend_research table with production-ready schema
CREATE TABLE public.trend_research (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  research_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), -- When user requested
  generated_at TIMESTAMP WITH TIME ZONE, -- When n8n completed (nullable)
  n8n_execution_id TEXT UNIQUE, -- For idempotency (UNIQUE creates index automatically)
  is_selected BOOLEAN NOT NULL DEFAULT false,
  priority_score NUMERIC(5,2) DEFAULT 0.0,
  categories TEXT[] DEFAULT '{}',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create optimized indexes for performance
CREATE INDEX trend_research_user_id_idx ON public.trend_research(user_id);
CREATE INDEX trend_research_status_idx ON public.trend_research(status);
CREATE INDEX trend_research_requested_at_idx ON public.trend_research(requested_at DESC);
CREATE INDEX trend_research_generated_at_idx ON public.trend_research(generated_at DESC) WHERE generated_at IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX trend_research_user_status_requested_idx ON public.trend_research(user_id, status, requested_at DESC);
CREATE INDEX trend_research_user_selected_idx ON public.trend_research(user_id, is_selected) WHERE is_selected = true;

-- GIN indexes for JSON and array data with operator classes
CREATE INDEX trend_research_categories_gin_idx ON public.trend_research USING GIN(categories array_ops);
CREATE INDEX trend_research_research_data_gin_idx ON public.trend_research USING GIN(research_data jsonb_ops);

-- Enable Row Level Security
ALTER TABLE public.trend_research ENABLE ROW LEVEL SECURITY;

-- RLS Policies with proper WITH CHECK constraints
CREATE POLICY "Users can view their own trend research" 
  ON public.trend_research 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trend research" 
  ON public.trend_research 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trend research" 
  ON public.trend_research 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id); -- Prevents changing user_id

CREATE POLICY "Users can delete their own trend research" 
  ON public.trend_research 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_trend_research_updated_at
  BEFORE UPDATE ON public.trend_research
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check rate limiting (5 minutes default)
CREATE OR REPLACE FUNCTION public.can_trigger_trend_research(p_user_id UUID, p_minutes INTEGER DEFAULT 5)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.trend_research 
    WHERE user_id = p_user_id 
    AND status IN ('pending', 'processing')
    AND requested_at > now() - (p_minutes || ' minutes')::interval
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
