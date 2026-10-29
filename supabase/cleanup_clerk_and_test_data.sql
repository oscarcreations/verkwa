-- =========================================================================
-- CLEANUP SCRIPT: SAFE FOREIGN KEY HANDLING & REMOVAL OF OLD TEST DATA
-- Run this script in your Supabase SQL Editor.
-- =========================================================================

-- Step 1: Permanently drop the old clerk_id column from the staff table
ALTER TABLE public.staff 
DROP COLUMN IF EXISTS clerk_id;

-- Step 2: Make transactions foreign key ON DELETE SET NULL
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_staff_id_fkey;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_staff_id_fkey 
FOREIGN KEY (staff_id) 
REFERENCES public.staff(id) 
ON DELETE SET NULL;

-- Step 3: Make customers foreign key (added_by) ON DELETE SET NULL
ALTER TABLE public.customers
DROP CONSTRAINT IF EXISTS customers_added_by_fkey;

ALTER TABLE public.customers
ADD CONSTRAINT customers_added_by_fkey 
FOREIGN KEY (added_by) 
REFERENCES public.staff(id) 
ON DELETE SET NULL;

-- Step 4: Unlink old staff references from transactions & customers
UPDATE public.transactions
SET staff_id = NULL
WHERE staff_id IN (
  '0cbd926e-19cc-4c9b-b42c-182ce0c0240e',
  '6490f64d-6be2-4985-88a6-5a703a880aa8',
  '720bd032-2079-4eb1-bfaa-e79da19ad4ba',
  '966a9cc2-8aad-44c8-bd89-78e635725c5f',
  'aa6de088-d38e-45de-b694-dd2a77ef97f4'
);

UPDATE public.customers
SET added_by = NULL
WHERE added_by IN (
  '0cbd926e-19cc-4c9b-b42c-182ce0c0240e',
  '6490f64d-6be2-4985-88a6-5a703a880aa8',
  '720bd032-2079-4eb1-bfaa-e79da19ad4ba',
  '966a9cc2-8aad-44c8-bd89-78e635725c5f',
  'aa6de088-d38e-45de-b694-dd2a77ef97f4'
);

-- Step 5: Now delete the old test staff records
DELETE FROM public.staff
WHERE id IN (
  '0cbd926e-19cc-4c9b-b42c-182ce0c0240e',
  '6490f64d-6be2-4985-88a6-5a703a880aa8',
  '720bd032-2079-4eb1-bfaa-e79da19ad4ba',
  '966a9cc2-8aad-44c8-bd89-78e635725c5f',
  'aa6de088-d38e-45de-b694-dd2a77ef97f4'
);

-- Step 6: Verify remaining staff (should only show your Oscar Nartey account)
SELECT id, first_name, last_name, email, role, phone, user_id, organization_id, status 
FROM public.staff;
