-- Update transactions table to allow more types including Commissions, Loans and manual Ledger entries
-- Run this in your Supabase SQL Editor

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('Deposit', 'Withdrawal', 'Loan', 'Loan Payment', 'Commission', 'Service Fee', 'Interest', 'Other Income', 'Reserve', 'Release'));

-- Ensure columns exist for ledger context
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deposit_by TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS note TEXT;
