-- ==========================================================
-- HABIT TRACKER DATABASE SCHEMA & ROW-LEVEL SECURITY (RLS)
-- Run this script in your Supabase Project -> SQL Editor
-- ==========================================================

-- 1. Create the `habits` table
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    frequency TEXT NOT NULL DEFAULT 'daily',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);

-- 2. Create the `daily_logs` table (Cascade-deletes when parent habit is deleted)
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    completed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_habit_daily UNIQUE (habit_id, completed_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_logs_habit_id ON public.daily_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON public.daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_completed_at ON public.daily_logs(completed_at);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures complete isolation between user accounts.
-- ==========================================================

-- Enable Row Level Security
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view their own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can create their own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can update their own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can delete their own habits" ON public.habits;

DROP POLICY IF EXISTS "Users can view their own daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can create their own daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can update their own daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can delete their own daily logs" ON public.daily_logs;

-- Policies for `habits`
CREATE POLICY "Users can view their own habits"
    ON public.habits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habits"
    ON public.habits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
    ON public.habits FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
    ON public.habits FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for `daily_logs`
CREATE POLICY "Users can view their own daily logs"
    ON public.daily_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily logs"
    ON public.daily_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily logs"
    ON public.daily_logs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily logs"
    ON public.daily_logs FOR DELETE
    USING (auth.uid() = user_id);

-- ==========================================================
-- 3. Create the `profiles` table for user profile & avatar URL
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ==========================================================
-- 4. STORAGE BUCKET & FOLDER-LOCKED STORAGE POLICIES
-- ==========================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    1048576,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 1048576,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

DROP POLICY IF EXISTS "Public can view avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatar into own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatar in own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatar from own folder" ON storage.objects;

CREATE POLICY "Public can view avatar images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatar into own folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update avatar in own folder"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete avatar from own folder"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

