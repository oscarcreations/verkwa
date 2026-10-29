-- =========================================================================
-- MULTI-TENANT FEE SETTINGS & AUTOMATIC TRANSACTION COMMISSION TRIGGER
-- Run this migration in your Supabase SQL Editor
-- =========================================================================

-- 1. Add organization_id to fee_settings
ALTER TABLE public.fee_settings
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Link existing fee_settings to default/active organization (Verkwa Susu)
UPDATE public.fee_settings
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'verkwa-susu' LIMIT 1)
WHERE organization_id IS NULL;

-- If still null, fallback to the earliest organization
UPDATE public.fee_settings
SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
WHERE organization_id IS NULL;

-- 3. Enable RLS on fee_settings
ALTER TABLE public.fee_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fee_settings_org_isolation" ON public.fee_settings;
CREATE POLICY "fee_settings_org_isolation" ON public.fee_settings
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.staff WHERE user_id = auth.uid()
  )
);

-- 4. Multi-Tenant Auto Transaction Fee Trigger Function
CREATE OR REPLACE FUNCTION auto_transaction_fee()
RETURNS TRIGGER AS $$
DECLARE
  fee_record RECORD;
  fee_amount NUMERIC;
BEGIN
  IF NEW.type IN ('Withdrawal', 'Deposit', 'Loan', 'Loan Payment')
     AND NEW.status IN ('approved', 'completed', 'ok', 'sent') THEN

    SELECT percentage, name INTO fee_record
    FROM public.fee_settings
    WHERE (organization_id IS NULL OR organization_id = NEW.organization_id)
      AND applies_to = NEW.type 
      AND is_active = true 
      AND percentage > 0
    ORDER BY (organization_id = NEW.organization_id) DESC, created_at DESC
    LIMIT 1;

    IF FOUND AND fee_record.percentage > 0 THEN
      fee_amount := NEW.amount * (fee_record.percentage / 100);

      IF NOT EXISTS (
        SELECT 1 FROM public.transactions
        WHERE customer_id = NEW.customer_id
          AND type = 'Commission'
          AND amount = fee_amount
          AND (organization_id = NEW.organization_id OR NEW.organization_id IS NULL)
          AND created_at >= NEW.created_at - INTERVAL '2 seconds'
          AND created_at <= NEW.created_at + INTERVAL '2 seconds'
      ) THEN
        INSERT INTO public.transactions (
          customer_id, 
          amount, 
          type, 
          staff_id, 
          branch_id, 
          organization_id, 
          status, 
          deposit_by
        )
        VALUES (
          NEW.customer_id,
          fee_amount,
          'Commission',
          NEW.staff_id,
          NEW.branch_id,
          NEW.organization_id,
          'completed',
          'SYSTEM | ' || fee_record.percentage || '% ' || NEW.type || ' Fee'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recreate trigger
DROP TRIGGER IF EXISTS on_transaction_fee ON public.transactions;
CREATE TRIGGER on_transaction_fee
AFTER INSERT OR UPDATE OF status ON public.transactions
FOR EACH ROW EXECUTE FUNCTION auto_transaction_fee();
