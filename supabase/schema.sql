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
-- OPTIONAL SEED DATA (Run while logged in via Supabase dashboard or app)
-- Note: In Supabase SQL editor, auth.uid() may be null unless running as an authenticated user,
-- so you can replace 'YOUR_USER_ID_HERE' with your auth user UUID from auth.users.
-- ==========================================================
/*
INSERT INTO public.habits (user_id, name, color, frequency)
VALUES 
    (auth.uid(), 'Morning Meditation', '#8b5cf6', 'daily'),
    (auth.uid(), 'Read 20 Pages', '#3b82f6', 'daily'),
    (auth.uid(), 'Hit Gym / Workout', '#10b981', 'weekdays');
*/
