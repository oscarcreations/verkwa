-- =========================================================================
-- CLEAN UP CURRENT ENTERPRISE SLUG TO BE MEMORABLE (NO RANDOM NUMBERS)
-- Run this in your Supabase SQL Editor
-- =========================================================================

-- 1. Update your organization slug to clean "verkwa-susu"
UPDATE public.organizations
SET slug = 'verkwa-susu'
WHERE id = (
  SELECT organization_id FROM public.staff WHERE email = 'narteyoscar64@gmail.com' LIMIT 1
);

-- 2. Verify the clean slug
SELECT id, name, slug, email, phone FROM public.organizations;
