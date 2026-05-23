-- For quick testing only.
-- This allows public read/write/delete access through the anon key.
-- Do not keep this open for production without adding real admin auth.

alter table public.astrologers enable row level security;
alter table public.services enable row level security;
alter table public.schedule enable row level security;
alter table public.faq enable row level security;

create policy "public full access astrologers"
on public.astrologers
for all
to anon
using (true)
with check (true);

create policy "public full access services"
on public.services
for all
to anon
using (true)
with check (true);

create policy "public full access schedule"
on public.schedule
for all
to anon
using (true)
with check (true);

create policy "public full access faq"
on public.faq
for all
to anon
using (true)
with check (true);
