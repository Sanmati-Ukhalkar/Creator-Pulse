-- Published Posts Table
CREATE TABLE IF NOT EXISTS published_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL DEFAULT 'linkedin',
    platform_post_id TEXT,
    content TEXT NOT NULL,
    published_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'published' CHECK (status IN ('published', 'failed', 'deleted')),
    engagement_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_published_posts_user 
    ON published_posts(user_id, published_at DESC);
