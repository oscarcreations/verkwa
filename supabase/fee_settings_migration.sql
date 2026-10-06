-- Fee Settings table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.fee_settings (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL,
  applies_to text NOT NULL,
  percentage numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fee_settings_pkey PRIMARY KEY (id),
  CONSTRAINT fee_settings_applies_to_check CHECK (applies_to IN ('Withdrawal', 'Deposit', 'Loan', 'Loan Payment'))
);

-- Insert default fee types
INSERT INTO public.fee_settings (name, applies_to, percentage, is_active) VALUES
  ('Withdrawal Fee', 'Withdrawal', 1.00, true),
  ('Deposit Fee', 'Deposit', 0.00, false),
  ('Loan Processing Fee', 'Loan', 0.00, false),
  ('Loan Payment Fee', 'Loan Payment', 0.00, false)
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.fee_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to fee_settings" ON public.fee_settings FOR ALL USING (true) WITH CHECK (true);

-- Updated trigger that reads from fee_settings
CREATE OR REPLACE FUNCTION auto_transaction_fee()
RETURNS TRIGGER AS $$
DECLARE
  fee_record RECORD;
  fee_amount NUMERIC;
BEGIN
  IF NEW.type IN ('Withdrawal', 'Deposit', 'Loan', 'Loan Payment')
     AND NEW.status IN ('approved', 'completed', 'ok', 'sent') THEN

    SELECT percentage INTO fee_record
    FROM public.fee_settings
    WHERE applies_to = NEW.type AND is_active = true AND percentage > 0
    LIMIT 1;

    IF FOUND AND fee_record > 0 THEN
      fee_amount := NEW.amount * (fee_record / 100);

      IF NOT EXISTS (
        SELECT 1 FROM public.transactions
        WHERE customer_id = NEW.customer_id
          AND type = 'Commission'
          AND amount = fee_amount
          AND created_at >= NEW.created_at - INTERVAL '2 seconds'
          AND created_at <= NEW.created_at + INTERVAL '2 seconds'
      ) THEN
        INSERT INTO public.transactions (customer_id, amount, type, staff_id, branch_id, status, deposit_by)
        VALUES (
          NEW.customer_id,
          fee_amount,
          'Commission',
          NEW.staff_id,
          NEW.branch_id,
          'completed',
          'SYSTEM | ' || fee_record || '% ' || NEW.type || ' Fee'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_withdrawal_approved ON public.transactions;
CREATE TRIGGER on_transaction_fee
AFTER INSERT OR UPDATE OF status ON public.transactions
FOR EACH ROW EXECUTE FUNCTION auto_transaction_fee();
