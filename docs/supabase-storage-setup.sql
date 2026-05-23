insert into storage.buckets (id, name, public)
values ('astrologer-images', 'astrologer-images', true)
on conflict (id) do nothing;

create policy "public read astrologer images"
on storage.objects
for select
to public
using (bucket_id = 'astrologer-images');

create policy "public upload astrologer images"
on storage.objects
for insert
to public
with check (bucket_id = 'astrologer-images');

create policy "public update astrologer images"
on storage.objects
for update
to public
using (bucket_id = 'astrologer-images')
with check (bucket_id = 'astrologer-images');
