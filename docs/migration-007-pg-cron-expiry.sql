-- Migration 007_pg_cron_expiry.sql
-- Requires pg_cron extension enabled in Supabase (Dashboard → Database → Extensions)

-- Enable extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule hourly expiry sweep
SELECT cron.schedule(
  'expire-memberships',          -- job name
  '0 * * * *',                   -- every hour on the hour
  $$
    -- Step 1: expire profiles whose latest purchase has passed expiry_date
    UPDATE public.profiles p
    SET
      membership_status = 'expired',
      premium           = false
    WHERE
      p.membership_status = 'active'
      AND p.expiry_date IS NOT NULL
      AND p.expiry_date < now();

    -- Step 2: write audit log entries for each expiry
    INSERT INTO public.membership_audit_log (action, performed_by, target_user_id, metadata)
    SELECT
      'membership_expired',
      'pg_cron',
      p.id,
      jsonb_build_object('expiry_date', p.expiry_date)
    FROM public.profiles p
    WHERE
      p.membership_status = 'expired'
      AND NOT EXISTS (
        SELECT 1 FROM public.membership_audit_log al
        WHERE al.target_user_id = p.id
          AND al.action = 'membership_expired'
          AND al.created_at > now() - INTERVAL '1 hour 5 minutes'
      );
  $$
);
