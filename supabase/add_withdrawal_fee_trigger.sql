-- Auto Withdrawal Commission Trigger (1% Fee)
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION auto_withdrawal_commission()
RETURNS TRIGGER AS $$
DECLARE
    fee_amount NUMERIC;
BEGIN
    IF NEW.type = 'Withdrawal' AND NEW.status IN ('approved', 'completed', 'ok', 'sent') THEN
        fee_amount := NEW.amount * 0.01;
        IF fee_amount > 0 THEN
            -- Check to prevent infinite loops (ensure we don't insert duplicate commission for same withdrawal)
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
                    'SYSTEM | 1% Withdrawal Fee'
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_withdrawal_approved ON public.transactions;
CREATE TRIGGER on_withdrawal_approved
AFTER INSERT OR UPDATE OF status ON public.transactions
FOR EACH ROW EXECUTE FUNCTION auto_withdrawal_commission();
