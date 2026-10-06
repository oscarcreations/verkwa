ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS allow_sms boolean DEFAULT true;

CREATE TABLE IF NOT EXISTS public.sms_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  customer_id uuid,
  phone text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sms_logs_pkey PRIMARY KEY (id),
  CONSTRAINT sms_logs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL
);
