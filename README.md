# Cosmic Consultation Studio

Simple astrology consultation and class website built with:

- Next.js 15 + Tailwind CSS frontend
- Supabase-backed shared content
- UPI payment instructions with WhatsApp confirmation flow

## Structure

- `frontend/`: main website and admin page
- `frontend/lib/site-config.ts`: fallback content and shared app types
- `frontend/lib/supabase.ts`: direct Supabase REST client
- `docs/supabase-astrologer-columns.sql`: optional extra columns for UPI and social links
- `docs/supabase-quick-test-policies.sql`: quick open-access policies for testing only

## Local setup

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Key flows

- Website sections: hero, astrologer profile, services, class schedule, testimonials, FAQ, contact, footer
- Booking form: user selects a service or class, copies UPI ID, pays manually, then continues to WhatsApp
- WhatsApp flow: prefilled message opens to the astrologer so the user can send payment screenshot
- Admin page: astrologer can modify live Supabase data for astrologers, services, schedule, and FAQ

## Supabase setup

1. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `frontend/.env.local`.
2. Make sure your public schema contains these tables:
   - `astrologers`
   - `services`
   - `schedule`
   - `faq`
3. If you want editable UPI and social links inside the same `astrologers` table, run:

```sql
\i docs/supabase-astrologer-columns.sql
```

or copy the SQL from [docs/supabase-astrologer-columns.sql](/Users/apple/astro/docs/supabase-astrologer-columns.sql) into the Supabase SQL editor.

4. If Supabase blocks browser reads or writes because of RLS, use the quick testing SQL in [docs/supabase-quick-test-policies.sql](/Users/apple/astro/docs/supabase-quick-test-policies.sql).

## Security note

The current `/admin` page is a live editor but it is not authenticated yet. For quick testing, it can save to Supabase directly from the browser. For production, the next step should be adding real admin login and write protection.

## Editing content

1. Open `/admin` in the app.
2. Update the fields you want.
3. Click `Save to Supabase`.
4. All users visiting `/` will see the updated content.
