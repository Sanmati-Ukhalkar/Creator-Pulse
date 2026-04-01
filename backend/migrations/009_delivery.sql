-- Create delivery_preferences table
CREATE TABLE IF NOT EXISTS public.delivery_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delivery_time TEXT DEFAULT '09:00',
    frequency TEXT DEFAULT 'daily',
    channels TEXT[] DEFAULT ARRAY['email'],
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create delivery_schedules table for tracking delivery status
CREATE TABLE IF NOT EXISTS public.delivery_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID, -- Optional link to content
    status TEXT DEFAULT 'pending', -- pending, processing, sent, failed
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_prefs_user_id ON public.delivery_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_user_id ON public.delivery_schedules(user_id);
