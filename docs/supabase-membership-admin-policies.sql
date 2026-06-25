-- ============================================================
-- AstroGenZ Membership Admin Policies
-- Run this in Supabase SQL Editor to allow the admin panel
-- (which uses the anon key) to manage membership data.
-- ============================================================

-- Allow anon key to read/write membership_settings
do $$ begin
  create policy "membership_settings: anon write"
    on public.membership_settings for all
    to public
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

-- Allow anon key to read all purchases (for admin panel)
do $$ begin
  create policy "purchases: anon read all"
    on public.membership_purchases for select
    to public
    using (true);
exception when duplicate_object then null;
end $$;

-- Allow anon key to update purchase status (approve/reject)
do $$ begin
  create policy "purchases: anon update"
    on public.membership_purchases for update
    to public
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

-- Allow anon key to update profiles (set premium = true)
do $$ begin
  create policy "profiles: anon update premium"
    on public.profiles for update
    to public
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

-- Allow anon key to read all profiles (for admin panel)
do $$ begin
  create policy "profiles: anon read all"
    on public.profiles for select
    to public
    using (true);
exception when duplicate_object then null;
end $$;

-- Allow anon key to manage premium_videos
do $$ begin
  create policy "premium_videos: anon all"
    on public.premium_videos for all
    to public
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;
