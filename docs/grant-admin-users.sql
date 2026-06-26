-- ============================================================
-- Grant is_admin = true to admin users
-- Run this in Supabase SQL Editor.
-- Replace the emails with the two admin Google accounts.
-- ============================================================

-- First ensure the column exists (safe if already run migration-001)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Grant admin to first admin account
UPDATE public.profiles
SET is_admin = true
WHERE email = 'admin1@gmail.com';   -- ← replace with your first admin email

-- Grant admin to second admin account
UPDATE public.profiles
SET is_admin = true
WHERE email = 'admin2@gmail.com';   -- ← replace with your second admin email

-- Verify both accounts
SELECT id, email, is_admin
FROM public.profiles
WHERE is_admin = true;

-- ──────────────────────────────────────────────────────────
-- NOTE: If the profile row doesn't exist yet for an email,
-- the user must sign in via Google on /admin/membership first
-- so the trigger creates the profile row, then run this SQL.
-- ──────────────────────────────────────────────────────────
