# Requirements Document

## Introduction

This feature upgrades the existing AstroGenZ Premium Membership System from a "lifetime access" model to a **30-day renewable subscription**, adds a **Live Astrology Sessions** section, integrates a **WhatsApp contact button** post-payment, merges the standalone `/admin/membership` panel into the existing `/admin` shell, and keeps all changes additive so nothing on the live production site breaks.

The system builds on top of the already-existing Supabase tables (`profiles`, `membership_settings`, `membership_purchases`, `premium_videos`, `membership_coupons`), the Razorpay auto-activation API route (`/api/membership/activate`), and the existing Supabase JS client (`lib/supabase-auth.ts`).

**CRITICAL INTEGRATION CONSTRAINTS:**
- Reuse the existing `supabase-auth.ts` client — do NOT create a second Supabase client
- Reuse the existing Razorpay API routes (`/api/payments/create-order`, `/api/payments/verify`) — do NOT duplicate payment logic
- Reuse the existing environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RAZORPAY_KEY_SECRET`, etc.)
- Preserve all existing pages, booking flows, services, reports, navigation, SEO, and admin functionality exactly as they are
- Every new API route that performs a privileged admin action must verify both the `astro_admin_session` cookie AND that the authenticated Supabase user has `is_admin = true` in the `profiles` table

---

## Glossary

- **Membership_System**: The combined set of Next.js pages, API routes, and Supabase tables that manage premium membership on AstroGenZ.
- **Premium_Page**: The `/membership/premium` route — the gated video library accessible only to active members.
- **Purchase_Page**: The `/membership/purchase` route — the Razorpay checkout flow.
- **Admin_Shell**: The `AdminShell` React component rendered at `/admin`, already protected by the `astro_admin_session` cookie via middleware.
- **Membership_Admin**: The new Membership Management section added inside `AdminShell` — replaces the existing `/admin/membership` page.
- **Expiry_Engine**: The server-side API route (`/api/membership/activate`) that computes and enforces the 30-day membership window after Razorpay HMAC verification.
- **Live_Events_Section**: The new "Live Astrology Sessions" area visible inside the Premium_Page.
- **Event_Guard**: The server-side API route that returns a YouTube live link only after verifying active membership status via Supabase session JWT.
- **WhatsApp_Button**: The UI element shown on the purchase-success screen linking the member to the astrologer's WhatsApp number stored in `admin_settings`.
- **Admin_Settings**: The Supabase table `admin_settings` that stores configurable key-value pairs such as the WhatsApp number.
- **Renewal_Page**: The `/membership/purchase` route re-used for renewal; expired members land here from expiry prompts.
- **Membership_Banner**: The `MembershipBanner` component rendered on the homepage; already reads price from `membership_settings`.
- **Audit_Log**: The Supabase table `membership_audit_log` that records important admin and system actions for accountability.
- **Dual_Auth**: The two-layer admin authorization: (1) `astro_admin_session` cookie checked by Next.js middleware, AND (2) `profiles.is_admin = true` verified by the API route itself.

---

## Requirements

### Requirement 1: 30-Day Expiry System

**User Story:** As a member, I want my membership to last exactly 30 days from the date I pay, so that I know when I need to renew and do not pay indefinitely.

#### Acceptance Criteria

1. WHEN a Razorpay payment is verified successfully via HMAC signature on the server, THE Expiry_Engine SHALL set `purchase_date` to the current UTC timestamp and `expiry_date` to `purchase_date + INTERVAL '30 days'` on the corresponding `membership_purchases` row.
2. WHEN a Razorpay payment is verified successfully, THE Expiry_Engine SHALL set `membership_status` to `"active"` and `premium` to `true` on the `profiles` row for that user; THE Expiry_Engine SHALL do this atomically in a single server operation to prevent partial state.
3. WHEN the current UTC time is past `expiry_date` and `membership_status` is `"active"`, THE Expiry_Engine SHALL set `membership_status` to `"expired"` and `premium` to `false` on the `profiles` row without any manual admin action.
4. WHEN a user navigates to the Premium_Page and their `membership_status` is `"expired"`, THE Premium_Page SHALL display a "Your membership has expired" message and a "Renew Membership" button that links to the Renewal_Page; THE Premium_Page SHALL NOT display any premium video content to expired members.
5. WHEN a user navigates to the Premium_Page and their `membership_status` is neither `"active"` nor `"expired"`, THE Premium_Page SHALL redirect the user to `/membership`.
6. WHEN a renewal payment is verified successfully, THE Expiry_Engine SHALL set the new `expiry_date` to `MAX(current expiry_date, now()) + INTERVAL '30 days'`, ensuring the member never loses already-paid days.
7. THE Membership_System SHALL record each purchase — including renewals — as a separate row in `membership_purchases` with `payment_id` unique per Razorpay payment, so that the full payment history is preserved and duplicate payments are detectable.
8. WHEN a Razorpay `payment_id` already exists in `membership_purchases`, THE Expiry_Engine SHALL return HTTP 200 with `{ ok: true, already_processed: true }` without modifying any row, preventing duplicate membership activation from repeated webhook or retry calls.
9. WHILE a user's `membership_status` is `"active"` and more than 24 hours remain before `expiry_date`, THE Premium_Page SHALL display "X days remaining" in the member header; WHILE fewer than 24 hours remain, THE Premium_Page SHALL display "Less than 1 day remaining".
10. IF `expiry_date` is within 5 days and `membership_status` is `"active"`, THE Premium_Page SHALL display a renewal reminder banner prompting the user to renew.
11. THE Expiry_Engine SHALL check expiry status server-side (via a dedicated `/api/membership/status` route) on every request to the Premium_Page, so that a stale browser session cannot bypass the expiry check; the page SHALL redirect to the Renewal_Page if the server reports `"expired"`.
12. THE Membership_System SHALL implement a Supabase `pg_cron` scheduled job (or equivalent Supabase Edge Function cron) that runs every hour and sets `membership_status = 'expired'` and `premium = false` on all `profiles` rows where the linked `membership_purchases` row has `expiry_date < now()` and `membership_status = 'active'`, providing a server-side fallback that operates even without user interaction.

---

### Requirement 2: Admin Authentication — Dual Layer

**User Story:** As the site owner, I want every admin action to be authenticated via both the existing session cookie AND a database-verified admin flag, so that cookie theft or URL manipulation alone cannot compromise membership data.

#### Acceptance Criteria

1. EVERY admin API route that performs a write operation (price update, member extend/disable, video CRUD, live event CRUD, coupon CRUD, WhatsApp number update, audit log write) SHALL verify TWO conditions before executing: (a) the `astro_admin_session` cookie equals `"authorized"`, AND (b) the Supabase user authenticated via the request's `Authorization: Bearer <jwt>` header has `profiles.is_admin = true`; IF either condition fails, the route SHALL return HTTP 401 and make no database changes.
2. THE `profiles` table SHALL include an `is_admin` boolean column (default `false`); admin users are flagged by setting `is_admin = true` directly in the database by the site owner; this value is NEVER set via a public-facing API.
3. THE Admin_Shell UI page at `/admin` SHALL continue to be protected by the existing Next.js middleware `astro_admin_session` cookie check — this layer is preserved unchanged.
4. THE Expiry_Engine API route (`/api/membership/activate`) SHALL NOT require the admin cookie; it SHALL authenticate exclusively via Razorpay HMAC signature verification as currently implemented.
5. THE Event_Guard API route (`/api/membership/live-link`) SHALL NOT require the admin cookie; it SHALL verify the requesting user's Supabase session JWT and `membership_status = 'active'` before returning a YouTube live link.
6. WHEN a non-admin authenticated user sends a direct HTTP request to any admin API route, THE Membership_System SHALL return HTTP 403 (not 401) to distinguish "unauthenticated" from "authenticated but not authorized".
7. THE existing admin passcode flow (ADMIN_PASSCODE env var, `/api/admin-auth` route) SHALL be preserved unchanged so that existing bookmarked admin logins continue to work.

---

### Requirement 3: Payment Security — Server-Side Only Activation

**User Story:** As the site owner, I want membership to activate only after server-side Razorpay HMAC verification, so that no frontend manipulation can grant premium access without a real payment.

#### Acceptance Criteria

1. THE Membership_System SHALL NEVER set `profiles.premium = true` or `profiles.membership_status = "active"` from any client-side code; ALL membership activation MUST go through the server-side `/api/membership/activate` route.
2. THE `/api/membership/activate` route SHALL verify the Razorpay signature using `HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)` before any database write; IF the signature does not match, the route SHALL return HTTP 400 and make no changes.
3. THE `/api/membership/activate` route SHALL use the existing `RAZORPAY_KEY_SECRET` environment variable — it SHALL NOT introduce a new environment variable for the same secret.
4. WHEN the `/api/membership/activate` route is called with a `payment_id` that already exists in `membership_purchases`, THE route SHALL return HTTP 200 `{ ok: true, already_processed: true }` without modifying any database row, providing idempotency against Razorpay retries.
5. THE Razorpay order creation SHALL continue to use the existing `/api/payments/create-order` route — the Membership_System SHALL NOT create a duplicate order-creation route.
6. THE Razorpay signature verification SHALL continue to use the existing `/api/payments/verify` route for the consultation booking flow; the membership flow MAY call this same route or perform its own HMAC check inside `/api/membership/activate`, but SHALL NOT create a third verification implementation.
7. THE `/api/membership/activate` route SHALL record the activation result in `membership_audit_log` with action `"membership_activated"` regardless of whether the membership is new or a renewal.

---

### Requirement 4: Membership Renewal — No Day Loss

**User Story:** As an existing member, I want renewing my membership to always add 30 full days on top of my current expiry or today's date (whichever is later), so that I never lose days I have already paid for.

#### Acceptance Criteria

1. WHEN a renewal payment is verified, THE Expiry_Engine SHALL compute `new_expiry = MAX(profiles.expiry_date, now()) + INTERVAL '30 days'`; it SHALL write this value to both the new `membership_purchases` row and `profiles.expiry_date`.
2. THE Expiry_Engine SHALL set `profiles.membership_status = 'active'` on renewal regardless of whether the previous status was `"active"` or `"expired"`.
3. THE Expiry_Engine SHALL never reduce `profiles.expiry_date`; IF the computed `new_expiry` is earlier than the current `profiles.expiry_date`, THE route SHALL reject the operation and return HTTP 409.
4. THE Renewal_Page SHALL display the current expiry date (if any) alongside the new expiry date that will result from renewal, so the member can see exactly what they are paying for before confirming payment.
5. THE Membership_System SHALL record the renewal in `membership_purchases` as a new row (type `"renewal"`) with its own `payment_id`, `amount_paid`, `purchase_date`, and `expiry_date` columns, preserving the full payment history.
6. THE `membership_purchases` table SHALL include a `purchase_type` column with values `"new"` or `"renewal"` to distinguish first-time purchases from renewals in audit and reporting.

---

### Requirement 5: Premium Videos

**User Story:** As an admin, I want to manage an unlimited library of premium videos with full metadata, so that changes instantly appear for members without any code deployment.

#### Acceptance Criteria

1. THE `premium_videos` table SHALL store: `id`, `title`, `description`, `thumbnail_url`, `video_url` (YouTube URL), `category`, `status` (`"published"` or `"draft"`), `sort_order` (integer), `created_at`, `updated_at`.
2. THE Premium_Page SHALL display only videos where `status = 'published'`, sorted by `sort_order` ascending.
3. WHEN an admin changes a video's `status` to `"published"` and saves, THE change SHALL appear on the public Premium_Page without any code deployment or server restart.
4. THE Membership_Admin SHALL allow the admin to: add a new video, edit all fields of an existing video, toggle `status` between `"published"` and `"draft"`, reorder videos by changing `sort_order`, and delete a video.
5. THE Premium_Page video library SHALL support filtering by `category` — clicking a category chip SHALL show only videos with that category value.
6. THE Premium_Page SHALL support a text search input that filters displayed videos by `title` or `description` without a server round-trip.
7. WHEN a video is deleted, THE Membership_Admin SHALL show a confirmation dialog before proceeding; THE deletion SHALL write a `"premium_video_deleted"` record to `membership_audit_log`.

---

### Requirement 6: Live Sessions

**User Story:** As a premium member, I want to see upcoming live astrology sessions with secure join links, so that I can attend exclusive events as part of my membership without the raw YouTube URL being exposed to non-members.

#### Acceptance Criteria

1. THE `live_events` table SHALL store: `id`, `title`, `description`, `thumbnail_url`, `event_date` (timestamptz), `youtube_link`, `is_active` (boolean), `created_at`.
2. THE Live_Events_Section inside the Premium_Page SHALL display upcoming events (where `event_date > now() - INTERVAL '2 hours'` and `is_active = true`) sorted by `event_date` ascending.
3. WHEN a live event's `event_date` is more than 2 hours in the past, THE Live_Events_Section SHALL move that event to a "Past Sessions" sub-section automatically without admin action, unless the admin has set `is_active = false`, in which case it is hidden entirely.
4. THE `youtube_link` column value SHALL NEVER be returned by any public API without first verifying that the requesting user has `membership_status = 'active'`; the raw YouTube URL SHALL NOT appear in any page's HTML source for non-members.
5. WHEN a member clicks "Join Live Session", THE client SHALL call the `/api/membership/live-link` route with the event `id`; THE route SHALL verify the user's Supabase JWT and `membership_status = 'active'` before returning the `youtube_link`; IF verification fails, THE route SHALL return HTTP 403.
6. THE Live_Events_Section SHALL display a "No upcoming live sessions" placeholder when no qualifying events exist.
7. THE Membership_Admin SHALL allow the admin to add, edit, toggle `is_active`, and delete live events; deletion SHALL write a `"live_event_deleted"` record to `membership_audit_log`.
8. WHEN a user with an expired membership navigates to a live event URL directly, THE page SHALL redirect to the Renewal_Page before any event metadata or link is displayed.

---

### Requirement 7: Audit Log

**User Story:** As the site owner, I want a record of all important membership and admin actions, so that I can investigate issues and understand membership lifecycle events.

#### Acceptance Criteria

1. THE `membership_audit_log` table SHALL store: `id`, `action` (text), `performed_by` (text — admin email or system), `target_user_id` (uuid, nullable), `metadata` (jsonb, nullable), `created_at` (timestamptz default now()).
2. THE Membership_System SHALL write a row to `membership_audit_log` for each of the following actions: `membership_activated`, `membership_renewed`, `membership_extended`, `membership_disabled`, `membership_expired` (written by the cron job), `price_changed`, `premium_video_added`, `premium_video_deleted`, `live_event_created`, `live_event_deleted`.
3. THE audit log SHALL be append-only — no update or delete operations on `membership_audit_log` SHALL be permitted via the application layer (enforce via RLS: `FOR UPDATE` and `FOR DELETE` policies set to `USING (false)`).
4. THE Membership_Admin SHALL display the 50 most recent audit log entries in a read-only "Audit Log" sub-tab, showing `action`, `performed_by`, `target_user_id`, and `created_at` formatted in the admin's local timezone.
5. THE `metadata` column SHALL store relevant context as JSON — for example, `{"old_price": 999, "new_price": 1499}` for `price_changed`, or `{"extended_by_days": 30, "new_expiry": "2025-08-01"}` for `membership_extended`.

---

### Requirement 8: WhatsApp Integration

**User Story:** As a new member, I want to see a WhatsApp contact button immediately after payment, so that I can reach the astrologer directly to join the members group.

#### Acceptance Criteria

1. WHEN the Purchase_Page transitions to the `"done"` step (after successful `/api/membership/activate`), THE Purchase_Page SHALL display a "Contact Astrologer on WhatsApp" button.
2. THE WhatsApp_Button SHALL read the number from the `/api/membership/whatsapp-number` route (which reads `admin_settings` table key `"whatsapp_number"`), NOT from hardcoded source code.
3. IF the `admin_settings` table has no row with `key = 'whatsapp_number'`, THE Purchase_Page SHALL hide the WhatsApp_Button gracefully without a broken link or JavaScript error.
4. THE Membership_Admin SHALL allow the admin to update the WhatsApp number via a labelled input field; saving SHALL call the admin API route which verifies Dual_Auth before updating `admin_settings`.
5. THE `admin_settings` table SHALL have columns: `id` (bigint PK), `key` (text unique not null), `value` (text), `updated_at` (timestamptz default now()).

---

### Requirement 9: Merge Membership Admin into /admin

**User Story:** As an admin, I want all membership management controls inside the existing `/admin` panel, so that I have a single dashboard for the entire site.

#### Acceptance Criteria

1. THE Admin_Shell component SHALL include a "Membership" section alongside the existing sections (Payment Proofs, Brand & Hero, Astrologers, Services, FAQs, Coupons); THE Admin_Shell component file SHALL be modified additively — existing sections SHALL not be removed or altered.
2. WHEN an admin selects the Membership section, THE UI SHALL display sub-tabs: Settings, Members, Videos, Live Events, Coupons, Audit Log.
3. THE Settings sub-tab SHALL allow updating `membership_price`, `membership_enabled`, and the WhatsApp number in `admin_settings`.
4. THE Members sub-tab SHALL list all profiles with columns: email, full_name, membership_status, expiry_date, amount_paid (from latest purchase); with "Extend 30 Days" and "Disable" action buttons per row.
5. WHEN "Extend 30 Days" is clicked, THE UI SHALL show a confirmation dialog; on confirm, THE client SHALL call a server API route that verifies Dual_Auth, extends the expiry, and writes to `membership_audit_log`.
6. WHEN "Disable" is clicked on an active member, THE UI SHALL show a confirmation dialog; on confirm, THE server SHALL set `membership_status = 'expired'` and `premium = false`, and write to `membership_audit_log`.
7. THE existing `/admin/membership` route SHALL redirect to `/admin` so that no existing bookmarks return a 404.
8. THE Coupons sub-tab SHALL preserve existing coupon management functionality (create/edit/delete/toggle `membership_coupons` rows) exactly as currently implemented in the standalone `/admin/membership` page.

---

### Requirement 10: Homepage Banner and Membership Page Copy

**User Story:** As a visitor, I want all membership text to accurately describe 30-day access, so that I am not misled about what I am purchasing.

#### Acceptance Criteria

1. THE Membership_Banner SHALL display "30-day access · Renew anytime" (or equivalent) and SHALL NOT display "Lifetime access" or "No renewal".
2. THE Membership_Banner price SHALL continue to be read from `membership_settings.membership_price` — it SHALL NOT be hardcoded.
3. THE `/membership` page benefits list SHALL replace "Lifetime Access · No subscriptions. No renewals." with accurate 30-day renewable copy.
4. THE `/membership` page FAQs SHALL accurately describe the 30-day renewable model, with an entry explaining how renewal works.
5. WHEN a logged-in user with `membership_status = 'active'` views `/membership`, THE page SHALL display their `expiry_date` alongside the "Go to Premium Library" button.
6. WHEN a logged-in user with `membership_status = 'expired'` views `/membership`, THE page SHALL display "Your membership expired on [date]" and a "Renew Now" button linking to the Renewal_Page.

---

### Requirement 11: Existing System Preservation

**User Story:** As the site owner, I want the entire existing website to continue working exactly as before after this upgrade, so that no users or consultation clients are impacted.

#### Acceptance Criteria

1. THE existing consultation booking flow (services selection, birth details form, Razorpay payment, WhatsApp redirect) SHALL remain completely unchanged.
2. THE existing `/api/payments/create-order` and `/api/payments/verify` routes SHALL remain unchanged; the membership system SHALL reuse them, not duplicate them.
3. THE existing `lib/supabase.ts` raw-fetch client (used by the consultation booking system) SHALL remain unchanged; the membership system SHALL use `lib/supabase-auth.ts` (Supabase JS SDK) exclusively for membership features.
4. THE existing `lib/supabase-auth.ts` Supabase client SHALL be reused for all new membership API routes — no second Supabase client instance SHALL be created.
5. THE existing admin panel functionality (Payment Proofs, Brand & Hero editing, Astrologers, Services, FAQ, Coupons) SHALL continue to work after the Membership section is added to `AdminShell`.
6. THE existing `middleware.ts` matcher SHALL be updated to include new membership API routes that require admin protection, but SHALL NOT remove the existing `/admin/:path*` matcher.
7. THE existing navigation links, homepage layout, hero section, astrologer profile, demo class section, and feedback section SHALL remain unchanged.
8. THE existing `profiles` table `premium` boolean column SHALL continue to be the primary source of truth for premium access checks in the existing premium video page; `membership_status` is an additional field that MUST stay in sync with `premium`.

---

### Requirement 12: Responsive Design and Branding

**User Story:** As a user on any device, I want all new membership UI to look excellent and match the AstroGenZ brand, so that the experience is consistent.

#### Acceptance Criteria

1. ALL new UI components SHALL use the existing Tailwind tokens: `bg-ivory (#f5f0e8)`, `text-sage (#5a1e0a)`, `text-gold (#8b1a1a)`, `bg-ember (#c0392b)`, `rounded-[2rem]`, `shadow-glow`, `font-display` (Georgia), `font-body` (Trebuchet MS).
2. ALL new layouts SHALL be mobile-first: single column below `sm` (640 px), multi-column on wider screens.
3. THE Live_Events_Section SHALL display event cards in a 1-column (mobile) / 2-column (`sm`) / 3-column (`lg`) responsive grid.
4. THE Membership_Admin sub-tabs inside Admin_Shell SHALL be horizontally scrollable on mobile so all tab labels remain accessible.
5. IF a thumbnail image fails to load, THE component SHALL display a branded fallback placeholder using the AstroGenZ colour palette.
6. THE expiry countdown, renewal reminder banner, and "X days remaining" indicators SHALL be clearly visible on screens as narrow as 320 px without truncation or overflow.
