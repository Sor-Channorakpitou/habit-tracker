-- ==========================================================
-- SUPABASE STORAGE: PUBLIC AVATARS BUCKET & RLS POLICIES
-- Run this script in your Supabase Project -> SQL Editor
-- ==========================================================

-- 1. Create the `profiles` table to store avatar public URLs
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Allow anyone (or authenticated users) to view profiles for avatars
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Auto-create profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, avatar_url)
  VALUES (new.id, null)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- ==========================================================
-- 2. CREATE PUBLIC AVATARS STORAGE BUCKET
-- ==========================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    1048576, -- 1MB server-side guard
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 1048576,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- ==========================================================
-- 3. STORAGE RLS POLICIES (LOCKED STRICTLY TO auth.uid() FOLDER)
--
-- Security Audit:
-- Rather than opening the entire bucket, every mutating operation
-- (INSERT, UPDATE, DELETE) enforces:
--   (storage.foldername(name))[1] = auth.uid()::text
-- This guarantees a user authenticated as 'UUID-123' can NEVER write,
-- overwrite, or delete objects outside of their 'UUID-123/' directory.
-- ==========================================================

-- Clean up existing avatar storage policies if re-running
DROP POLICY IF EXISTS "Public can view avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatar into own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatar in own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatar from own folder" ON storage.objects;

-- A. SELECT: Public access (bucket is public, allows rendering avatar URLs anywhere)
CREATE POLICY "Public can view avatar images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- B. INSERT: Restricted strictly to the user's personal auth.uid() folder
CREATE POLICY "Users can upload avatar into own folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- C. UPDATE: Required for { upsert: true } to overwrite/replace existing avatar
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

-- D. DELETE: User can clean up or remove their own avatar
CREATE POLICY "Users can delete avatar from own folder"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
