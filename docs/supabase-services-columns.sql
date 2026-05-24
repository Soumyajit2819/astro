alter table public.services add column if not exists type text;
alter table public.services add column if not exists payment_qr_url text;
alter table public.services add column if not exists payment_url text;
