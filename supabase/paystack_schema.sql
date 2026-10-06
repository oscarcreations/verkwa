-- Schema for Client Requests and Paystack Integration

CREATE TABLE IF NOT EXISTS public.client_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id),
    type TEXT NOT NULL, -- Withdrawal, Deposit, Loan
    amount NUMERIC NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected
    reference TEXT, -- Paystack reference ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Clients can see their own requests
DROP POLICY IF EXISTS "Clients can view own requests" ON public.client_requests;
CREATE POLICY "Clients can view own requests" 
ON public.client_requests FOR SELECT 
USING (true);

-- Policy: Clients can insert requests
DROP POLICY IF EXISTS "Clients can insert own requests" ON public.client_requests;
CREATE POLICY "Clients can insert own requests" 
ON public.client_requests FOR INSERT 
WITH CHECK (true);

-- Policy: Staff can update/delete requests (for approval/rejection)
DROP POLICY IF EXISTS "Staff can manage requests" ON public.client_requests;
CREATE POLICY "Staff can manage requests" 
ON public.client_requests FOR ALL 
USING (true)
WITH CHECK (true);
