-- Add Reserved Capital support for clients
-- Run this in your Supabase SQL Editor

-- 1. Add reserved_balance column to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS reserved_balance NUMERIC DEFAULT 0;

-- 2. Update transaction types to include 'Reserve' (moving funds from operating to reserved)
-- and 'Release' (moving funds from reserved back to operating)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('Deposit', 'Withdrawal', 'Loan', 'Loan Payment', 'Commission', 'Service Fee', 'Interest', 'Other Income', 'Reserve', 'Release'));

-- 3. Create a trigger to update reserved_balance when a 'Reserve' or 'Release' transaction is approved/completed
CREATE OR REPLACE FUNCTION update_reserved_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('approved', 'completed', 'ok', 'sent') THEN
        IF NEW.type = 'Reserve' THEN
            UPDATE public.customers 
            SET reserved_balance = reserved_balance + NEW.amount
            WHERE id = NEW.customer_id;
        ELSIF NEW.type = 'Release' THEN
            UPDATE public.customers 
            SET reserved_balance = reserved_balance - NEW.amount
            WHERE id = NEW.customer_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_reserved_transaction ON public.transactions;
CREATE TRIGGER on_reserved_transaction
AFTER INSERT OR UPDATE OF status ON public.transactions
FOR EACH ROW EXECUTE FUNCTION update_reserved_balance();
