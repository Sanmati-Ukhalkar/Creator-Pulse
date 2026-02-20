
-- Create ENUM types for better data validation
CREATE TYPE delivery_platform_enum AS ENUM ('twitter', 'linkedin', 'instagram', 'facebook', 'youtube', 'tiktok');
CREATE TYPE delivery_content_type_enum AS ENUM ('post', 'thread', 'story', 'reel', 'video', 'carousel', 'article');
CREATE TYPE delivery_status_enum AS ENUM ('scheduled', 'processing', 'sent', 'failed', 'cancelled');

-- Create delivery_schedules table with enhanced schema
CREATE TABLE public.delivery_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform delivery_platform_enum NOT NULL,
  content_type delivery_content_type_enum NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status delivery_status_enum NOT NULL DEFAULT 'scheduled',
  draft_id UUID,
  auto_generate BOOLEAN NOT NULL DEFAULT false,
  custom_prompt TEXT,
  recurring_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints for data integrity
ALTER TABLE public.delivery_schedules
  ADD CONSTRAINT fk_delivery_schedules_user_id
  FOREIGN KEY (user_id) REFERENCES public.creator_profiles(user_id)
  ON DELETE CASCADE;

ALTER TABLE public.delivery_schedules
  ADD CONSTRAINT fk_delivery_schedules_draft_id
  FOREIGN KEY (draft_id) REFERENCES public.drafts(id)
  ON DELETE SET NULL;

-- Add performance indexes
CREATE INDEX idx_delivery_schedules_user_id ON public.delivery_schedules(user_id);
CREATE INDEX idx_delivery_schedules_scheduled_for ON public.delivery_schedules(scheduled_for);
CREATE INDEX idx_delivery_schedules_status ON public.delivery_schedules(status);
CREATE INDEX idx_delivery_schedules_platform ON public.delivery_schedules(platform);

-- Add Row Level Security (RLS)
ALTER TABLE public.delivery_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own delivery schedules" 
  ON public.delivery_schedules 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own delivery schedules" 
  ON public.delivery_schedules 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own delivery schedules" 
  ON public.delivery_schedules 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own delivery schedules" 
  ON public.delivery_schedules 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_delivery_schedules_updated_at
  BEFORE UPDATE ON public.delivery_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add validation trigger to ensure scheduled_for is in the future
CREATE OR REPLACE FUNCTION validate_delivery_schedule()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scheduled_for <= now() AND NEW.status = 'scheduled' THEN
    RAISE EXCEPTION 'Scheduled delivery time must be in the future';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_delivery_schedule_trigger
  BEFORE INSERT OR UPDATE ON public.delivery_schedules
  FOR EACH ROW EXECUTE FUNCTION validate_delivery_schedule();
