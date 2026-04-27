-- Add missing columns to nloginpolicy
ALTER TABLE public.nloginpolicy ADD COLUMN IF NOT EXISTS strt_tm VARCHAR(5);
ALTER TABLE public.nloginpolicy ADD COLUMN IF NOT EXISTS end_tm VARCHAR(5);
ALTER TABLE public.nloginpolicy ADD COLUMN IF NOT EXISTS otp_enabled_at VARCHAR(1);
