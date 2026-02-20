-- Create creator_profiles table
CREATE TABLE public.creator_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    creator_handle TEXT UNIQUE,
    bio TEXT,
    avatar_url TEXT,
    industry TEXT,
    creator_type TEXT,
    follower_range TEXT,
    platforms TEXT[] DEFAULT '{}',
    timezone TEXT DEFAULT 'UTC',
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    onboarding_completed BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create onboarding_steps table
CREATE TABLE public.onboarding_steps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    step_name TEXT NOT NULL,
    step_order INTEGER NOT NULL CHECK (step_order > 0),
    step_description TEXT,
    is_required BOOLEAN DEFAULT true,
    step_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_onboarding_progress table
CREATE TABLE public.user_onboarding_progress (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    onboarding_step_id UUID NOT NULL REFERENCES public.onboarding_steps(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    step_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, onboarding_step_id)
);

-- Create content_samples table for storing onboarding content samples
CREATE TABLE public.content_samples (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    platform TEXT NOT NULL,
    content TEXT NOT NULL,
    engagement_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery_preferences table
CREATE TABLE public.delivery_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    delivery_time TEXT DEFAULT '09:00',
    frequency TEXT DEFAULT 'daily',
    channels TEXT[] DEFAULT '{"email"}',
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for creator_profiles
CREATE POLICY "Users can view their own profile" 
ON public.creator_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.creator_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.creator_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" 
ON public.creator_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for onboarding_steps (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view onboarding steps" 
ON public.onboarding_steps 
FOR SELECT 
TO authenticated
USING (true);

-- Create RLS policies for user_onboarding_progress
CREATE POLICY "Users can view their own progress" 
ON public.user_onboarding_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress" 
ON public.user_onboarding_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
ON public.user_onboarding_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" 
ON public.user_onboarding_progress 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for content_samples
CREATE POLICY "Users can view their own content samples" 
ON public.content_samples 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own content samples" 
ON public.content_samples 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content samples" 
ON public.content_samples 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content samples" 
ON public.content_samples 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for delivery_preferences
CREATE POLICY "Users can view their own delivery preferences" 
ON public.delivery_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own delivery preferences" 
ON public.delivery_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own delivery preferences" 
ON public.delivery_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own delivery preferences" 
ON public.delivery_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_creator_profiles_updated_at
    BEFORE UPDATE ON public.creator_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_onboarding_progress_updated_at
    BEFORE UPDATE ON public.user_onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_preferences_updated_at
    BEFORE UPDATE ON public.delivery_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_creator_profiles_user_id ON public.creator_profiles(user_id);
CREATE INDEX idx_creator_profiles_creator_handle ON public.creator_profiles(creator_handle);
CREATE INDEX idx_user_onboarding_progress_user_id ON public.user_onboarding_progress(user_id);
CREATE INDEX idx_user_onboarding_progress_step_id ON public.user_onboarding_progress(onboarding_step_id);
CREATE INDEX idx_content_samples_user_id ON public.content_samples(user_id);
CREATE INDEX idx_content_samples_platform ON public.content_samples(platform);
CREATE INDEX idx_delivery_preferences_user_id ON public.delivery_preferences(user_id);

-- Seed onboarding steps data
INSERT INTO public.onboarding_steps (step_name, step_order, step_description, step_type, is_required) VALUES
('Profile Setup', 1, 'Complete your creator profile with industry and creator type', 'profile_setup', true),
('Platform Connection', 2, 'Connect your social media platforms and add content samples', 'platform_connect', true),
('Voice Training', 3, 'Train AI to understand your content style and voice', 'voice_training', false),
('Delivery Preferences', 4, 'Set up your content delivery preferences and schedule', 'delivery_preferences', true)
ON CONFLICT DO NOTHING;

-- Create function to auto-create creator profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.creator_profiles (user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name')
    );
    RETURN NEW;
END;
$$;

-- Create trigger to auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();