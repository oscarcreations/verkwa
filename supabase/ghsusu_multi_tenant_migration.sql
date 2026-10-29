-- =========================================================================
-- GHSUSU MULTI-TENANT ARCHITECTURE & SUPABASE AUTH MIGRATION
-- Run this migration in your Supabase SQL Editor.
-- =========================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create the `organizations` (Susu Companies / Cooperatives) table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE,
  phone text,
  email text,
  address text,
  city text DEFAULT 'Accra',
  region text DEFAULT 'Greater Accra',
  country text DEFAULT 'Ghana',
  logo_url text,
  sms_sender_id text DEFAULT 'GHSUSU',
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'growth', 'enterprise')),
  sms_balance integer NOT NULL DEFAULT 50,
  max_members integer NOT NULL DEFAULT 50,
  max_branches integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

-- 2. Insert Default Organization (Verkwa Susu) so no existing data is orphaned
INSERT INTO public.organizations (id, name, slug, phone, sms_sender_id, plan, sms_balance, max_members, max_branches)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Verkwa Susu Enterprise',
  'verkwa-susu',
  '0592728838',
  'VERKWA',
  'growth',
  500,
  1000,
  3
)
ON CONFLICT (id) DO NOTHING;

-- 3. Add organization_id to branches
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Default existing branches to Verkwa
UPDATE public.branches 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 4. Upgrade `staff` table to link directly to Supabase Auth (`auth.users.id`)
-- Add user_id (links to auth.users), organization_id, and drop clerk_id
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS phone text,
DROP COLUMN IF EXISTS clerk_id;

-- Default existing staff to Verkwa
UPDATE public.staff 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 5. Add organization_id to `customers` (members)
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.customers 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 6. Add organization_id to `transactions`
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.transactions 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 7. Add organization_id to `sms_logs`
ALTER TABLE public.sms_logs
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.sms_logs 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 8. Add organization_id to `client_requests`
ALTER TABLE public.client_requests
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.client_requests 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 9. Add organization_id to `settings`
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.settings 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 10. Helper function: Get Current User's Active Organization
CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.staff WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 11. Helper function: Get Current User Role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.staff WHERE user_id = auth.uid() LIMIT 1;
$$;
