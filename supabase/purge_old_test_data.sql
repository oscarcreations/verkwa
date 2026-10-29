-- =========================================================================
-- COMPLETE PURGE OF OLD TEST DATA (CUSTOMERS, TRANSACTIONS, ETC.)
-- Keeping ONLY Oscar Nartey's new enterprise and staff account
-- Run this in your Supabase SQL Editor
-- =========================================================================

-- 1. Delete all old test transactions
DELETE FROM public.transactions
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
   OR organization_id IS NULL;

-- 2. Delete all old test client requests
DELETE FROM public.client_requests
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
   OR organization_id IS NULL;

-- 3. Delete all old test customer records
DELETE FROM public.customers
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
   OR organization_id IS NULL;

-- 4. Delete all old test branches (except any created by your new organization)
DELETE FROM public.branches
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
   OR organization_id IS NULL;

-- 5. Delete the old default organization placeholder
DELETE FROM public.organizations
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 6. Verify your clean tables
SELECT 'organizations' as tbl, count(*) FROM public.organizations
UNION ALL
SELECT 'staff' as tbl, count(*) FROM public.staff
UNION ALL
SELECT 'branches' as tbl, count(*) FROM public.branches
UNION ALL
SELECT 'customers' as tbl, count(*) FROM public.customers
UNION ALL
SELECT 'transactions' as tbl, count(*) FROM public.transactions;
