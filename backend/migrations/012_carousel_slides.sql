CREATE TABLE IF NOT EXISTS carousel_slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES carousel_jobs(id) ON DELETE CASCADE,
    slide_order INTEGER NOT NULL,
    slide_type VARCHAR(50),
    idea TEXT,
    headline TEXT,
    subtext TEXT,
    visual_description TEXT,
    layout VARCHAR(50),
    font_size VARCHAR(50),
    elements JSONB,
    color_scheme VARCHAR(50),
    render_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carousel_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES carousel_jobs(id) ON DELETE CASCADE,
    pdf_storage_path TEXT,
    zip_storage_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
