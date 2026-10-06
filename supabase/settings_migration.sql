-- Settings table: Add new columns for business profile and notifications
-- Run this migration to update the settings table

-- Add new columns to settings table
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Ghana'::text,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS allow_deposit_notification BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_withdrawal_notification BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_loan_notification BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_new_customer_notification BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_account_statement_notification BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_account_balance BOOLEAN DEFAULT true;

-- Enable RLS on settings table
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts on re-run)
DROP POLICY IF EXISTS "Allow full access to settings" ON public.settings;

-- RLS Policies: Allow full access (anon + authenticated)
-- Your Supabase client uses the anon key with Clerk handling auth at the app layer,
-- so requests arrive as the "anon" role. These policies grant full access.
CREATE POLICY "Allow full access to settings"
ON public.settings FOR ALL
TO anon
USING (true)
WITH CHECK (true);
