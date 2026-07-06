-- Add otp_secret column to nemplyrinfo and its audit table
ALTER TABLE public.nemplyrinfo ADD COLUMN IF NOT EXISTS otp_secret VARCHAR(32);
ALTER TABLE public.nemplyrinfo_aud ADD COLUMN IF NOT EXISTS otp_secret VARCHAR(32);
