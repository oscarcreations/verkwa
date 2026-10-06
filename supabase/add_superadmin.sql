-- SQL Script to register the new superadmin employee
-- Run this in your Supabase SQL Editor

INSERT INTO public.staff (first_name, last_name, email, role, status)
VALUES ('Super', 'Admin', 'getfoundro@gmail.com', 'Superadmin', true)
ON CONFLICT (email) 
DO UPDATE SET role = 'Superadmin', status = true;
