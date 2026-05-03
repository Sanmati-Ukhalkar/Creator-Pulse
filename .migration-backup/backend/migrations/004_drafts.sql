-- Drafts Table
CREATE TABLE IF NOT EXISTS drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT,
    content_type TEXT,
    title TEXT,
    content JSONB NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    status TEXT DEFAULT 'draft',
    scheduled_for TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drafts_user 
    ON drafts(user_id, created_at DESC);

CREATE TRIGGER drafts_updated_at
    BEFORE UPDATE ON drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
