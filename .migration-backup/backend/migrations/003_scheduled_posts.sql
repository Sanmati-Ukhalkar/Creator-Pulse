-- Scheduled Posts Table
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL DEFAULT 'linkedin',
    content TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'cancelled')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_due 
    ON scheduled_posts(status, scheduled_at) 
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user 
    ON scheduled_posts(user_id, scheduled_at);
