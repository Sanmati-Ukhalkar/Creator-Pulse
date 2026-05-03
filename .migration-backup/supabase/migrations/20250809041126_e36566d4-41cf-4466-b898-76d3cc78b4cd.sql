-- Retry Migration: Fix policy existence checks and apply full schema

-- 1) Extend existing sources table with category and credibility_score (1-10)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sources' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.sources ADD COLUMN category text DEFAULT 'uncategorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sources' AND column_name = 'credibility_score'
  ) THEN
    ALTER TABLE public.sources ADD COLUMN credibility_score integer DEFAULT 5;
  END IF;

  -- Ensure range check exists for credibility_score
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sources_credibility_score_range_check'
  ) THEN
    ALTER TABLE public.sources 
      ADD CONSTRAINT sources_credibility_score_range_check 
      CHECK (credibility_score BETWEEN 1 AND 10);
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_sources_user_category ON public.sources (user_id, category);
CREATE INDEX IF NOT EXISTS idx_sources_credibility ON public.sources (user_id, credibility_score);

-- 2) Create ingested_contents table for raw scraped content
CREATE TABLE IF NOT EXISTS public.ingested_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text,
  raw_content text,
  content_md text,
  content_html text,
  published_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  hash text,
  status text NOT NULL DEFAULT 'fetched', -- fetched | processed | error
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ingested_contents_user_url_unique UNIQUE (user_id, url)
);

-- Indexes for ingestion table
CREATE INDEX IF NOT EXISTS idx_ingested_user_fetched_at ON public.ingested_contents (user_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingested_source ON public.ingested_contents (source_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingested_user_hash_unique ON public.ingested_contents (user_id, hash) WHERE hash IS NOT NULL;

-- Enable RLS and policies for ingested_contents
ALTER TABLE IF EXISTS public.ingested_contents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'ingested_contents' AND policyname = 'Users can view their ingested contents'
  ) THEN
    CREATE POLICY "Users can view their ingested contents"
      ON public.ingested_contents
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'ingested_contents' AND policyname = 'Users can insert their ingested contents'
  ) THEN
    CREATE POLICY "Users can insert their ingested contents"
      ON public.ingested_contents
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id AND EXISTS (
          SELECT 1 FROM public.sources s WHERE s.id = source_id AND s.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'ingested_contents' AND policyname = 'Users can update their ingested contents'
  ) THEN
    CREATE POLICY "Users can update their ingested contents"
      ON public.ingested_contents
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'ingested_contents' AND policyname = 'Users can delete their ingested contents'
  ) THEN
    CREATE POLICY "Users can delete their ingested contents"
      ON public.ingested_contents
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at trigger
DROP TRIGGER IF EXISTS update_ingested_contents_updated_at ON public.ingested_contents;
CREATE TRIGGER update_ingested_contents_updated_at
BEFORE UPDATE ON public.ingested_contents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Create topics table for extracted topics
CREATE TABLE IF NOT EXISTS public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_content_id uuid NOT NULL REFERENCES public.ingested_contents(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  trend_score integer NOT NULL DEFAULT 0,
  is_trending boolean NOT NULL DEFAULT false,
  topic_type text, -- trending | evergreen | other
  keywords text[] NOT NULL DEFAULT '{}',
  cluster_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT topics_confidence_range CHECK (confidence_score >= 0 AND confidence_score <= 100),
  CONSTRAINT topics_trend_score_range CHECK (trend_score >= 0 AND trend_score <= 100),
  CONSTRAINT topics_user_source_title_unique UNIQUE (user_id, source_content_id, title)
);

-- Indexes for topics
CREATE INDEX IF NOT EXISTS idx_topics_user_trend ON public.topics (user_id, is_trending, trend_score DESC);
CREATE INDEX IF NOT EXISTS idx_topics_source ON public.topics (source_content_id);
CREATE INDEX IF NOT EXISTS idx_topics_keywords_gin ON public.topics USING GIN (keywords);

-- RLS for topics
ALTER TABLE IF EXISTS public.topics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'topics' AND policyname = 'Users can view their topics'
  ) THEN
    CREATE POLICY "Users can view their topics"
      ON public.topics
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'topics' AND policyname = 'Users can insert their topics'
  ) THEN
    CREATE POLICY "Users can insert their topics"
      ON public.topics
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id AND EXISTS (
          SELECT 1 FROM public.ingested_contents c WHERE c.id = source_content_id AND c.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'topics' AND policyname = 'Users can update their topics'
  ) THEN
    CREATE POLICY "Users can update their topics"
      ON public.topics
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'topics' AND policyname = 'Users can delete their topics'
  ) THEN
    CREATE POLICY "Users can delete their topics"
      ON public.topics
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at trigger
DROP TRIGGER IF EXISTS update_topics_updated_at ON public.topics;
CREATE TRIGGER update_topics_updated_at
BEFORE UPDATE ON public.topics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Create topic_research table for research outputs with caching
CREATE TABLE IF NOT EXISTS public.topic_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  depth_level text NOT NULL, -- surface | medium | deep
  summary text,
  key_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_angles text[] NOT NULL DEFAULT '{}',
  audience_insights jsonb NOT NULL DEFAULT '{}'::jsonb,
  competitor_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  hashtags text[] NOT NULL DEFAULT '{}',
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  credibility_score numeric(5,2) NOT NULL DEFAULT 0,
  cached_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT topic_research_depth_check CHECK (depth_level IN ('surface','medium','deep')),
  CONSTRAINT topic_research_credibility_range CHECK (credibility_score >= 0 AND credibility_score <= 100),
  CONSTRAINT topic_research_topic_depth_unique UNIQUE (topic_id, depth_level)
);

-- Indexes for topic_research
CREATE INDEX IF NOT EXISTS idx_topic_research_user_created ON public.topic_research (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topic_research_cached_until ON public.topic_research (cached_until);

-- RLS for topic_research
ALTER TABLE IF EXISTS public.topic_research ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'topic_research' AND policyname = 'Users can view their topic research'
  ) THEN
    CREATE POLICY "Users can view their topic research"
      ON public.topic_research
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'topic_research' AND policyname = 'Users can insert their topic research'
  ) THEN
    CREATE POLICY "Users can insert their topic research"
      ON public.topic_research
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id AND EXISTS (
          SELECT 1 FROM public.topics t WHERE t.id = topic_id AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'topic_research' AND policyname = 'Users can update their topic research'
  ) THEN
    CREATE POLICY "Users can update their topic research"
      ON public.topic_research
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'topic_research' AND policyname = 'Users can delete their topic research'
  ) THEN
    CREATE POLICY "Users can delete their topic research"
      ON public.topic_research
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at trigger
DROP TRIGGER IF EXISTS update_topic_research_updated_at ON public.topic_research;
CREATE TRIGGER update_topic_research_updated_at
BEFORE UPDATE ON public.topic_research
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
