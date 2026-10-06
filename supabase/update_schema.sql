-- Update Customers table for Claiming Flow and functional parity
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'susu account',
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- Update Branches table for missing fields
ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update Transactions table to ensure all necessary fields for reporting
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS deposit_by TEXT;

-- Create index for faster claiming lookups
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_staff_email ON public.staff(email);

-- Ensure RLS policies are updated (Placeholder: Broad access for authenticated users)
-- In a production environment, these should be restricted further
CREATE POLICY "Allow authenticated staff to manage customers" 
ON public.customers FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow authenticated staff to manage transactions" 
ON public.transactions FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
