CREATE TABLE IF NOT EXISTS design_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  html_template_path TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS carousel_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  topic TEXT NOT NULL,
  source_id UUID,
  angle TEXT,
  tone TEXT,
  target_audience TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  template_id UUID REFERENCES design_templates(id),
  cost_usd DECIMAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS carousel_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES carousel_jobs(id) ON DELETE CASCADE,
  slide_order INT NOT NULL,
  slide_type TEXT NOT NULL,
  idea TEXT NOT NULL,
  headline TEXT,
  subtext TEXT,
  visual_description TEXT,
  layout TEXT,
  color_scheme TEXT,
  font_size TEXT,
  elements JSONB,
  png_url TEXT,
  render_status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS carousel_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES carousel_jobs(id) ON DELETE CASCADE,
  pdf_storage_path TEXT NOT NULL,
  zip_storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task 1.2: Add indexes on carousel_jobs.user_id and carousel_slides.job_id
CREATE INDEX idx_carousel_jobs_user_id ON carousel_jobs(user_id);
CREATE INDEX idx_carousel_slides_job_id ON carousel_slides(job_id);
