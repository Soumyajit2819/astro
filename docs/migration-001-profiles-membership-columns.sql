-- Migration 001_profiles_membership_columns.sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin         boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS membership_status text        NOT NULL DEFAULT 'none'
    CHECK (membership_status IN ('none', 'active', 'expired')),
  ADD COLUMN IF NOT EXISTS expiry_date      timestamptz;

-- Index for the cron job and status queries
CREATE INDEX IF NOT EXISTS idx_profiles_membership_status
  ON public.profiles (membership_status);

CREATE INDEX IF NOT EXISTS idx_profiles_expiry_date
  ON public.profiles (expiry_date)
  WHERE expiry_date IS NOT NULL;

-- RLS: is_admin must never be writable via the public API
-- The existing "profiles: own update" policy already restricts updates
-- to the authenticated user's own row, but we must prevent them from
-- setting is_admin = true. Add a WITH CHECK constraint:
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles: own update" ON public.profiles;
  CREATE POLICY "profiles: own update"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND is_admin = false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
