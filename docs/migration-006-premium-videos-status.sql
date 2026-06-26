-- Migration 006_premium_videos_status.sql
-- The existing table uses is_active boolean; we add a status text column
-- for published/draft semantics. is_active is kept for backward compat.
ALTER TABLE public.premium_videos
  ADD COLUMN IF NOT EXISTS status     text NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'draft')),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Update existing rows: map is_active → status
UPDATE public.premium_videos
SET status = CASE WHEN is_active THEN 'published' ELSE 'draft' END
WHERE status = 'published'; -- only affect rows not yet migrated
