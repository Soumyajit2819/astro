-- Migration 002_membership_purchases_expiry.sql
-- Safe to re-run — all operations are idempotent.

ALTER TABLE public.membership_purchases
  ADD COLUMN IF NOT EXISTS purchase_type  text        NOT NULL DEFAULT 'new'
    CHECK (purchase_type IN ('new', 'renewal')),
  ADD COLUMN IF NOT EXISTS purchase_date  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expiry_date    timestamptz;

-- Unique constraint on payment_id (idempotent via DO block)
-- ADD CONSTRAINT IF NOT EXISTS is not valid PostgreSQL syntax; use DO instead.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'membership_purchases_payment_id_unique'
      AND conrelid = 'public.membership_purchases'::regclass
  ) THEN
    ALTER TABLE public.membership_purchases
      ADD CONSTRAINT membership_purchases_payment_id_unique UNIQUE (payment_id);
  END IF;
END
$$;

-- Index for idempotency check
CREATE INDEX IF NOT EXISTS idx_membership_purchases_payment_id
  ON public.membership_purchases (payment_id)
  WHERE payment_id IS NOT NULL;

-- Index for expiry queries
CREATE INDEX IF NOT EXISTS idx_membership_purchases_user_expiry
  ON public.membership_purchases (user_id, expiry_date DESC);
