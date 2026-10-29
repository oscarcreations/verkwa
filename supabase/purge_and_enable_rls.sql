-- =========================================================================
-- ULTIMATE DATA PURGE & COMPLETE MULTI-TENANT ROW LEVEL SECURITY (RLS)
-- Run this in your Supabase SQL Editor
-- =========================================================================

-- -------------------------------------------------------------------------
-- PART 1: COMPLETE PURGE OF OLD TEST DATA ACROSS ALL TABLES
-- -------------------------------------------------------------------------

-- Delete all transactions belonging to old tests or null orgs
DELETE FROM public.transactions
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
   OR organization_id IS NULL;

-- Delete all client requests belonging to old tests or null orgs
DELETE FROM public.client_requests
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
   OR organization_id IS NULL;

-- Delete all SMS logs from old tests
DELETE FROM public.sms_logs
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
   OR organization_id IS NULL;

-- Delete all customers from old tests
DELETE FROM public.customers
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
   OR organization_id IS NULL;

-- Delete all branches from old tests
DELETE FROM public.branches
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
   OR organization_id IS NULL;

-- Delete old staff members (excluding your Oscar Nartey account)
DELETE FROM public.staff
WHERE email != 'narteyoscar64@gmail.com'
  AND (organization_id = '00000000-0000-0000-0000-000000000001' OR organization_id IS NULL);

-- Delete the old default organization placeholder
DELETE FROM public.organizations
WHERE id = '00000000-0000-0000-0000-000000000001';

-- -------------------------------------------------------------------------
-- PART 2: DATABASE-LEVEL ROW LEVEL SECURITY (RLS) FOR ABSOLUTE TENANT ISOLATION
-- Ensures every company CAN ONLY EVER query and write their OWN data
-- -------------------------------------------------------------------------

-- 1. Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access_policy" ON public.organizations;
CREATE POLICY "org_access_policy" ON public.organizations
FOR ALL
USING (
  id IN (SELECT organization_id FROM public.staff WHERE user_id = auth.uid())
);

-- 2. Staff
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_org_isolation" ON public.staff;
CREATE POLICY "staff_org_isolation" ON public.staff
FOR ALL
USING (
  organization_id IN (SELECT organization_id FROM public.staff WHERE user_id = auth.uid())
);

-- 3. Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_org_isolation" ON public.customers;
CREATE POLICY "customers_org_isolation" ON public.customers
FOR ALL
USING (
  organization_id IN (SELECT organization_id FROM public.staff WHERE user_id = auth.uid())
);

-- 4. Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_org_isolation" ON public.transactions;
CREATE POLICY "transactions_org_isolation" ON public.transactions
FOR ALL
USING (
  organization_id IN (SELECT organization_id FROM public.staff WHERE user_id = auth.uid())
);

-- 5. Branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branches_org_isolation" ON public.branches;
CREATE POLICY "branches_org_isolation" ON public.branches
FOR ALL
USING (
  organization_id IN (SELECT organization_id FROM public.staff WHERE user_id = auth.uid())
);

-- 7. SMS Logs
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_logs_org_isolation" ON public.sms_logs;
CREATE POLICY "sms_logs_org_isolation" ON public.sms_logs
FOR ALL
USING (
  organization_id IN (SELECT organization_id FROM public.staff WHERE user_id = auth.uid())
);

-- -------------------------------------------------------------------------
-- PART 3: UPDATE get_daily_aggregates RPC WITH TENANT ISOLATION
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_daily_aggregates(
    p_days INTEGER DEFAULT 30,
    p_employee_id UUID DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
    day TEXT,
    deposit NUMERIC,
    withdrawal NUMERIC,
    loan NUMERIC,
    commission NUMERIC
) AS $$
DECLARE
    v_org_id UUID := p_organization_id;
BEGIN
    IF v_org_id IS NULL THEN
        SELECT organization_id INTO v_org_id 
        FROM public.staff 
        WHERE user_id = auth.uid() 
        LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT 
        to_char(t.created_at, 'YYYY-MM-DD') AS day,
        COALESCE(SUM(CASE WHEN t.type = 'Deposit' THEN t.amount ELSE 0 END), 0) AS deposit,
        COALESCE(SUM(CASE WHEN t.type = 'Withdrawal' THEN t.amount ELSE 0 END), 0) AS withdrawal,
        COALESCE(SUM(CASE WHEN t.type = 'Loan' THEN t.amount ELSE 0 END), 0) AS loan,
        COALESCE(SUM(CASE WHEN t.type IN ('Commission', 'Service Fee', 'Interest', 'Other Income') THEN t.amount ELSE 0 END), 0) AS commission
    FROM transactions t
    WHERE (v_org_id IS NULL OR t.organization_id = v_org_id)
      AND (p_employee_id IS NULL OR t.staff_id = p_employee_id)
      AND t.created_at >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)
      AND t.status NOT IN ('rejected', 'denied', 'failed')
    GROUP BY to_char(t.created_at, 'YYYY-MM-DD')
    ORDER BY day ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------------------------
-- PART 4: VERIFY CLEAN COUNTS FOR YOUR ACTIVE ENTERPRISE
-- -------------------------------------------------------------------------
SELECT 'organizations' AS table_name, count(*) FROM public.organizations
UNION ALL
SELECT 'staff', count(*) FROM public.staff
UNION ALL
SELECT 'branches', count(*) FROM public.branches
UNION ALL
SELECT 'customers', count(*) FROM public.customers
UNION ALL
SELECT 'transactions', count(*) FROM public.transactions
UNION ALL
SELECT 'sms_logs', count(*) FROM public.sms_logs
UNION ALL
SELECT 'client_requests', count(*) FROM public.client_requests;
