-- Fix for branches table schema and RLS policies
-- Execute this in your Supabase SQL Editor

-- 1. Ensure columns exist
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Ensure RLS is enabled
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- 3. Add Policies (allowing authenticated users to manage branches)
-- Drop if they exist to avoid errors on re-run
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.branches;

CREATE POLICY "Enable all for authenticated users" 
ON public.branches FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
