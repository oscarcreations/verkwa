-- Rename employees table to staff
ALTER TABLE public.employees RENAME TO staff;

-- Update foreign key constraint names (Postgres auto-renames indexes but not constraints)
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_added_by_fkey;
ALTER TABLE public.customers ADD CONSTRAINT customers_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.staff(id);

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_staff_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);

-- Update index name
DROP INDEX IF EXISTS idx_employees_email;
CREATE INDEX IF NOT EXISTS idx_staff_email ON public.staff(email);

-- Update RLS policies (drop old, recreate for staff)
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to employees" ON public.staff;
CREATE POLICY "Allow all access to staff" ON public.staff FOR ALL USING (true) WITH CHECK (true);

-- Update default role values
ALTER TABLE public.staff ALTER COLUMN role SET DEFAULT 'Employee'::text;
