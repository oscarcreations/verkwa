-- Migration: Add detailed staff profile fields and granular permissions
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS ghana_card_number text,
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS residential_address text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{
  "can_manage_accounts": true,
  "can_deposit": true,
  "can_withdraw": false,
  "can_manage_loans": false,
  "can_view_reports": false,
  "can_manage_ledgers": false,
  "can_manage_sms": false,
  "can_approve_transactions": false
}'::jsonb;

-- Create index on organization_id and email if not exists
CREATE INDEX IF NOT EXISTS idx_staff_org_id ON public.staff(organization_id);
