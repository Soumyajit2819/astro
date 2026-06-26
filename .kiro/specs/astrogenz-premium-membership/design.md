# Technical Design: AstroGenZ Premium Membership System Upgrade

## Overview

This document describes the production-ready, backward-compatible upgrade of the AstroGenZ Premium
Membership System from a lifetime-access model to a 30-day renewable subscription. Every change
is additive — no existing tables, routes, or components are deleted or broken.

**Stack:** Next.js 15 (App Router), TypeScript, Supabase (PostgreSQL + RLS), Razorpay, Tailwind CSS.

---

## 1. Architecture Overview

### High-Level System Diagram

```
Browser (Next.js Client Components)
│
├── /membership              → Public landing page (benefits, price, FAQ)
├── /membership/purchase     → Razorpay checkout + coupon + WhatsApp CTA post-pay
├── /membership/premium      → Gated video library + live events (active members only)
└── /admin                   → AdminShell — single dashboard for all management
    └── Membership section (new): Settings | Members | Videos | Live Events | Coupons | Audit Log
│
Next.js API Routes (Edge/Node)
│
├── /api/membership/activate         → Razorpay HMAC verify + DB write + expiry + audit
├── /api/membership/status           → Server-side membership check (JWT)
├── /api/membership/live-link        → Protected YouTube link delivery (JWT + active check)
├── /api/membership/whatsapp-number  → Public — reads admin_settings
├── /api/membership/validate-coupon  → Coupon validation (existing, unchanged)
├── /api/membership/sync-profile     → Upsert profile row (existing, unchanged)
│
├── /api/admin/membership/settings        → Dual_Auth: price, enabled, WhatsApp
├── /api/admin/membership/members         → Dual_Auth: list all members
├── /api/admin/membership/members/extend  → Dual_Auth: +30 days
├── /api/admin/membership/members/disable → Dual_Auth: expire member
├── /api/admin/membership/videos          → Dual_Auth: CRUD videos
├── /api/admin/membership/videos/[id]     → Dual_Auth: DELETE video
├── /api/admin/membership/live-events     → Dual_Auth: CRUD events
├── /api/admin/membership/live-events/[id]→ Dual_Auth: DELETE event
└── /api/admin/membership/audit-log       → Dual_Auth: read last 50 entries
│
Supabase (PostgreSQL)
│
├── profiles               (modified: +is_admin, +membership_status, +expiry_date)
├── membership_purchases   (modified: +purchase_type, +expiry_date, +purchase_date)
├── membership_settings    (existing, unchanged)
├── premium_videos         (existing, +status column)
├── membership_coupons     (existing, unchanged)
├── membership_coupon_uses (existing, unchanged)
├── live_events            (new)
├── admin_settings         (new)
└── membership_audit_log   (new)
│
pg_cron (hourly job)
└── Marks expired memberships → status='expired', premium=false
```

### Separation of Concerns

| Concern | Owner | Notes |
|---|---|---|
| Consultation booking | `lib/supabase.ts` + backend Python | Completely untouched |
| Membership auth | `lib/supabase-auth.ts` (Supabase JS SDK) | Only client for membership |
| Payment order creation | `/api/payments/create-order` | Reused, not duplicated |
| Signature verification | `/api/payments/verify` + inline in `/api/membership/activate` | Existing routes reused |
| Admin session | `astro_admin_session` cookie | Middleware unchanged |
| Admin privilege | `profiles.is_admin` column | DB-level flag, never set via API |

---

## 2. Database Schema

### Migration Strategy

All changes use `ALTER TABLE … ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS`.
No `DROP TABLE`, no `DROP COLUMN`, no destructive operations. Safe to run multiple times.

---

### 2.1 `profiles` — Additive Columns Only

```sql
-- Migration 001_profiles_membership_columns.sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin         boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS membership_status text        NOT NULL DEFAULT 'none'
    CHECK (membership_status IN ('none', 'active', 'expired')),
  ADD COLUMN IF NOT EXISTS expiry_date      timestamptz;

-- Index for the cron job and status queries
CREATE INDEX IF NOT EXISTS idx_profiles_membership_status
  ON public.profiles (membership_status);

CREATE INDEX IF NOT EXISTS idx_profiles_expiry_date
  ON public.profiles (expiry_date)
  WHERE expiry_date IS NOT NULL;

-- RLS: is_admin must never be writable via the public API
-- The existing "profiles: own update" policy already restricts updates
-- to the authenticated user's own row, but we must prevent them from
-- setting is_admin = true. Add a WITH CHECK constraint:
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles: own update" ON public.profiles;
  CREATE POLICY "profiles: own update"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND is_admin = false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

### 2.2 `membership_purchases` — Additive Columns

```sql
-- Migration 002_membership_purchases_expiry.sql
ALTER TABLE public.membership_purchases
  ADD COLUMN IF NOT EXISTS purchase_type  text        NOT NULL DEFAULT 'new'
    CHECK (purchase_type IN ('new', 'renewal')),
  ADD COLUMN IF NOT EXISTS purchase_date  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expiry_date    timestamptz;

-- Unique constraint prevents duplicate payment_id activations
ALTER TABLE public.membership_purchases
  ADD CONSTRAINT IF NOT EXISTS membership_purchases_payment_id_unique
  UNIQUE (payment_id);

-- Index for idempotency check
CREATE INDEX IF NOT EXISTS idx_membership_purchases_payment_id
  ON public.membership_purchases (payment_id)
  WHERE payment_id IS NOT NULL;

-- Index for expiry queries
CREATE INDEX IF NOT EXISTS idx_membership_purchases_user_expiry
  ON public.membership_purchases (user_id, expiry_date DESC);
```

### 2.3 `live_events` — New Table

```sql
-- Migration 003_live_events.sql
CREATE TABLE IF NOT EXISTS public.live_events (
  id            bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  title         text         NOT NULL,
  description   text,
  thumbnail_url text,
  event_date    timestamptz  NOT NULL,
  youtube_link  text         NOT NULL,
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.live_events ENABLE ROW LEVEL SECURITY;

-- Members can read event metadata but NOT the youtube_link column
-- The youtube_link is served exclusively through /api/membership/live-link
DO $$ BEGIN
  CREATE POLICY "live_events: active member read metadata"
    ON public.live_events FOR SELECT
    USING (
      is_active = true
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND membership_status = 'active'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service role (used by admin API routes) has full access
DO $$ BEGIN
  CREATE POLICY "live_events: service role all"
    ON public.live_events FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for upcoming event queries
CREATE INDEX IF NOT EXISTS idx_live_events_date_active
  ON public.live_events (event_date, is_active);
```

### 2.4 `admin_settings` — New Table

```sql
-- Migration 004_admin_settings.sql
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id         bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  key        text         NOT NULL UNIQUE,
  value      text,
  updated_at timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Public read (used by /api/membership/whatsapp-number — no auth required)
DO $$ BEGIN
  CREATE POLICY "admin_settings: public read"
    ON public.admin_settings FOR SELECT
    TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only service role may write (admin API routes use service key)
DO $$ BEGIN
  CREATE POLICY "admin_settings: service role write"
    ON public.admin_settings FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed default WhatsApp placeholder (safe to re-run)
INSERT INTO public.admin_settings (key, value)
VALUES ('whatsapp_number', '')
ON CONFLICT (key) DO NOTHING;
```

### 2.5 `membership_audit_log` — New Table

```sql
-- Migration 005_membership_audit_log.sql
CREATE TABLE IF NOT EXISTS public.membership_audit_log (
  id              bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  action          text         NOT NULL,
  performed_by    text         NOT NULL,
  target_user_id  uuid         REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata        jsonb,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.membership_audit_log ENABLE ROW LEVEL SECURITY;

-- Append-only: no application-layer updates or deletes
DO $$ BEGIN
  CREATE POLICY "audit_log: no update"
    ON public.membership_audit_log FOR UPDATE
    USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "audit_log: no delete"
    ON public.membership_audit_log FOR DELETE
    USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service role can insert and select
DO $$ BEGIN
  CREATE POLICY "audit_log: service role insert select"
    ON public.membership_audit_log FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.membership_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_target_user
  ON public.membership_audit_log (target_user_id)
  WHERE target_user_id IS NOT NULL;
```

### 2.6 `premium_videos` — Add `status` Column

```sql
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
```

### 2.7 `pg_cron` — Hourly Expiry Job

```sql
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
```

---

## 3. API Endpoints

All admin routes use the `verifyDualAuth` helper (see Section 8). All membership routes that
require a logged-in user verify the `Authorization: Bearer <supabase_jwt>` header using the
service-role Supabase client.

### Auth Legend
- **RazorpayHMAC** — HMAC-SHA256 signature check against `RAZORPAY_KEY_SECRET`
- **SupabaseJWT** — Supabase session JWT from `Authorization: Bearer` header
- **Dual_Auth** — `astro_admin_session` cookie = `"authorized"` AND `profiles.is_admin = true`
- **Public** — No authentication required

---

### POST `/api/membership/activate` (modified)

**Auth:** RazorpayHMAC

**Request body:**
```typescript
{
  razorpay_order_id:   string;   // Razorpay order ID
  razorpay_payment_id: string;   // Razorpay payment ID
  razorpay_signature:  string;   // HMAC signature from Razorpay
  user_id:             string;   // Supabase user UUID
  amount_paid:         number;   // Final charged amount in INR
  coupon_id?:          number;   // Optional coupon used
}
```

**Response (200 — new activation):**
```typescript
{ ok: true; expiry_date: string; purchase_type: "new" | "renewal" }
```

**Response (200 — already processed):**
```typescript
{ ok: true; already_processed: true }
```

**Response (400):**
```typescript
{ error: "Invalid payment signature." }
```

**Side effects:**
1. Verifies Razorpay HMAC; returns 400 on mismatch.
2. Checks `membership_purchases.payment_id` — if exists, returns idempotency response.
3. Reads `profiles.expiry_date` to determine `purchase_type` and compute `new_expiry = MAX(expiry_date, now()) + 30 days`.
4. Inserts row into `membership_purchases` with `purchase_type`, `purchase_date`, `expiry_date`, `status = 'approved'`.
5. Updates `profiles` atomically: `premium = true`, `membership_status = 'active'`, `expiry_date = new_expiry`.
6. Records coupon usage if `coupon_id` provided.
7. Writes `membership_audit_log` entry with action `"membership_activated"` or `"membership_renewed"`.

---

### GET `/api/membership/status` (new)

**Auth:** SupabaseJWT (Bearer token)

**Request:** No body. JWT read from `Authorization` header.

**Response (200):**
```typescript
{
  membership_status: "none" | "active" | "expired";
  expiry_date:       string | null;  // ISO 8601 UTC
  days_remaining:    number | null;  // null if not active
  premium:           boolean;
}
```

**Response (401):** `{ error: "Unauthorized" }`

**Side effects:** None. Pure read. Used by the Premium page on every load for server-side enforcement.

---

### GET `/api/membership/live-link?eventId=X` (new)

**Auth:** SupabaseJWT

**Query params:** `eventId` (number, required)

**Response (200):**
```typescript
{ youtube_link: string }
```

**Response (403):**
```typescript
{ error: "Active membership required." }
```

**Response (404):**
```typescript
{ error: "Event not found or inactive." }
```

**Side effects:** None. Reads `live_events.youtube_link` only after verifying `membership_status = 'active'`.

---

### GET `/api/membership/whatsapp-number` (new)

**Auth:** Public (no auth required)

**Response (200):**
```typescript
{ whatsapp_number: string | null }
```

**Side effects:** None. Reads `admin_settings` where `key = 'whatsapp_number'`.

---

### POST `/api/admin/membership/settings` (new)

**Auth:** Dual_Auth

**Request body:**
```typescript
{
  membership_price?:    number;   // optional — update price
  membership_enabled?:  boolean;  // optional — toggle membership on/off
  whatsapp_number?:     string;   // optional — E.164 format e.g. "919876543210"
}
```

**Response (200):** `{ ok: true }`

**Response (401/403):** `{ error: string }`

**Side effects:**
1. Updates `membership_settings` row if price or enabled provided.
2. Upserts `admin_settings` where `key = 'whatsapp_number'` if provided.
3. Writes `membership_audit_log` with action `"price_changed"` and metadata `{ old_price, new_price }` if price changed.

---

### POST `/api/admin/membership/members/extend` (new)

**Auth:** Dual_Auth

**Request body:**
```typescript
{ user_id: string }  // UUID of the profile to extend
```

**Response (200):**
```typescript
{ ok: true; new_expiry_date: string }
```

**Side effects:**
1. Computes `new_expiry = MAX(profiles.expiry_date, now()) + 30 days`.
2. Updates `profiles.expiry_date`, sets `membership_status = 'active'`, `premium = true`.
3. Inserts `membership_purchases` row with `purchase_type = 'renewal'`, `amount_paid = 0`, `approved_by = adminEmail`.
4. Writes `membership_audit_log` with action `"membership_extended"` and metadata `{ extended_by_days: 30, new_expiry }`.

---

### POST `/api/admin/membership/members/disable` (new)

**Auth:** Dual_Auth

**Request body:**
```typescript
{ user_id: string }
```

**Response (200):** `{ ok: true }`

**Side effects:**
1. Updates `profiles`: `membership_status = 'expired'`, `premium = false`.
2. Writes `membership_audit_log` with action `"membership_disabled"`.

---

### GET `/api/admin/membership/members` (new)

**Auth:** Dual_Auth

**Query params:** `page` (default 1), `pageSize` (default 50)

**Response (200):**
```typescript
{
  members: Array<{
    id:                string;
    email:             string | null;
    full_name:         string | null;
    membership_status: "none" | "active" | "expired";
    expiry_date:       string | null;
    premium:           boolean;
    latest_purchase: {
      amount_paid:   number | null;
      purchase_date: string | null;
      purchase_type: "new" | "renewal";
    } | null;
  }>;
  total: number;
}
```

**Side effects:** None. Read-only.

---

### POST `/api/admin/membership/videos` (new)

**Auth:** Dual_Auth

**Request body:**
```typescript
{
  id?:           number;   // present = update, absent = create
  title:         string;
  description?:  string;
  thumbnail_url?: string;
  video_url:     string;   // YouTube URL
  category?:     string;
  status:        "published" | "draft";
  sort_order?:   number;
}
```

**Response (200):** `{ ok: true; video: PremiumVideo }`

**Side effects:**
- INSERT if no `id`; PATCH if `id` provided.
- Sets `updated_at = now()`.
- Writes `membership_audit_log` with action `"premium_video_added"` (new only).

---

### DELETE `/api/admin/membership/videos/[id]` (new)

**Auth:** Dual_Auth

**Response (200):** `{ ok: true }`

**Side effects:**
- Deletes row from `premium_videos` by `id`.
- Writes `membership_audit_log` with action `"premium_video_deleted"` and metadata `{ video_id, title }`.

---

### POST `/api/admin/membership/live-events` (new)

**Auth:** Dual_Auth

**Request body:**
```typescript
{
  id?:           number;   // present = update, absent = create
  title:         string;
  description?:  string;
  thumbnail_url?: string;
  event_date:    string;   // ISO 8601 UTC
  youtube_link:  string;
  is_active?:    boolean;  // default true
}
```

**Response (200):** `{ ok: true; event: LiveEvent }`

**Side effects:**
- INSERT or PATCH `live_events`.
- Writes `membership_audit_log` with action `"live_event_created"` (new only).

---

### DELETE `/api/admin/membership/live-events/[id]` (new)

**Auth:** Dual_Auth

**Response (200):** `{ ok: true }`

**Side effects:**
- Deletes row from `live_events`.
- Writes `membership_audit_log` with action `"live_event_deleted"` and metadata `{ event_id, title }`.

---

### GET `/api/admin/membership/audit-log` (new)

**Auth:** Dual_Auth

**Query params:** `limit` (default 50, max 200)

**Response (200):**
```typescript
{
  entries: Array<{
    id:             number;
    action:         string;
    performed_by:   string;
    target_user_id: string | null;
    metadata:       Record<string, unknown> | null;
    created_at:     string;
  }>;
}
```

**Side effects:** None. Read-only.

---

## 4. Authentication Flow

### 4.1 How Dual_Auth Works

Every admin write API route calls `verifyDualAuth(request)` as its very first operation before
touching the database.

**Layer 1 — Cookie check:**
Read the `astro_admin_session` cookie from the request. If its value is not `"authorized"`, return
HTTP 401 immediately. This cookie is set by `POST /api/admin-auth` when the correct `ADMIN_PASSCODE`
is entered. It is `httpOnly`, `SameSite=Lax`, and expires in 7 days.

**Layer 2 — Supabase JWT + is_admin check:**
Read the `Authorization: Bearer <jwt>` header. Use the Supabase service-role client to call
`supabase.auth.getUser(jwt)` to decode and verify the token. Then query `profiles.is_admin` for
that user's UUID. If `is_admin` is not `true`, return HTTP 403 (not 401 — the user is
authenticated but not privileged).

**Why both layers?** Cookie theft alone is insufficient — the attacker also needs a valid Supabase
JWT from an account with `is_admin = true`. JWT theft alone is insufficient — the attacker also
needs the session cookie.

---

### 4.2 Sequence Diagram — Admin API Request

```
Admin Browser                  Next.js API Route              Supabase
     │                               │                            │
     │  POST /api/admin/…            │                            │
     │  Cookie: astro_admin_session  │                            │
     │  Authorization: Bearer <jwt>  │                            │
     │──────────────────────────────>│                            │
     │                               │ verifyDualAuth()           │
     │                               │ 1. Check cookie = "authorized"
     │                               │    → 401 if missing/wrong  │
     │                               │ 2. getUser(jwt)           │
     │                               │──────────────────────────>│
     │                               │<── { id, email } ─────────│
     │                               │ 3. SELECT is_admin WHERE id=…
     │                               │──────────────────────────>│
     │                               │<── { is_admin: true } ────│
     │                               │    → 403 if false         │
     │                               │ 4. Execute business logic  │
     │                               │──────────────────────────>│
     │                               │<── DB response ───────────│
     │<── 200 { ok: true } ──────────│                            │
```

### 4.3 Sequence Diagram — Member Accessing Premium Content

```
Member Browser            Next.js Page / API           Supabase
     │                         │                           │
     │  GET /membership/premium │                           │
     │─────────────────────────>│                           │
     │                         │ (client-side useEffect)   │
     │                         │ 1. supabaseAuth.getSession()
     │                         │──────────────────────────>│
     │                         │<── session + JWT ─────────│
     │                         │ 2. GET /api/membership/status
     │                         │    Authorization: Bearer jwt
     │                         │ (server-side check)       │
     │                         │ getUser(jwt)             │
     │                         │──────────────────────────>│
     │                         │<── user.id ───────────────│
     │                         │ SELECT membership_status, expiry_date
     │                         │──────────────────────────>│
     │                         │<── { status:'active', expiry_date }
     │                         │                           │
     │                         │ IF status ≠ 'active':     │
     │                         │   redirect → /membership/purchase
     │                         │                           │
     │                         │ 3. Load premium_videos    │
     │                         │──────────────────────────>│
     │                         │<── [ video rows ] ────────│
     │                         │ 4. Load live_events       │
     │                         │   (metadata only, no youtube_link)
     │                         │──────────────────────────>│
     │                         │<── [ event rows ] ────────│
     │<── Render premium page ──│                           │
     │                         │                           │
     │  Click "Join Live"       │                           │
     │  GET /api/membership/live-link?eventId=X            │
     │─────────────────────────>│                           │
     │                         │ Verify JWT + membership_status='active'
     │                         │──────────────────────────>│
     │                         │<── youtube_link ──────────│
     │<── { youtube_link } ─────│                           │
     │  window.open(youtube_link)                           │
```

### 4.4 Existing Admin Passcode Flow — Preserved Unchanged

`/api/admin-auth` (POST and DELETE) and `middleware.ts` are not modified. The cookie name
`astro_admin_session`, the `ADMIN_PASSCODE` env var, and the `/admin-login` page remain exactly
as they are. Dual_Auth adds a second check *inside* API routes but does not change how the cookie
is granted or the middleware behaviour.

---

## 5. Payment Flow

### 5.1 New Purchase (30-Day Expiry)

```
Member Browser                  Next.js                     Razorpay       Supabase
     │                             │                            │               │
     │ Click "Pay Rs. X"           │                            │               │
     │────────────────────────────>│                            │               │
     │                             │ POST /api/payments/create-order           │
     │                             │ { amount, currency, receipt }             │
     │                             │──────────────────────────>│               │
     │                             │<── { id, amount } ─────────│               │
     │                             │                            │               │
     │ Razorpay modal opens        │                            │               │
     │────────────────────────────>│                            │               │
     │                 User completes payment                   │               │
     │<─────────────────────────────────────── handler({order_id, payment_id, sig})
     │                             │                            │               │
     │ POST /api/membership/activate                            │               │
     │ { order_id, payment_id, sig, user_id, amount_paid }     │               │
     │────────────────────────────>│                            │               │
     │                             │ HMAC verify                │               │
     │                             │ Check payment_id not in purchases          │
     │                             │ Compute expiry = now() + 30 days           │
     │                             │ INSERT membership_purchases               │
     │                             │──────────────────────────────────────────>│
     │                             │ UPDATE profiles (status=active, expiry)   │
     │                             │──────────────────────────────────────────>│
     │                             │ INSERT membership_audit_log               │
     │                             │──────────────────────────────────────────>│
     │<── { ok:true, expiry_date } ─│                            │               │
     │                             │                            │               │
     │ Show success + WhatsApp CTA │                            │               │
```

### 5.2 Renewal (MAX Expiry Logic)

Identical flow to new purchase. The only difference is inside `/api/membership/activate`:

```
existing expiry_date = profiles.expiry_date   (may be in the future if renewing early)
base_date            = MAX(existing expiry_date, now())
new_expiry           = base_date + INTERVAL '30 days'
purchase_type        = 'renewal'   (because profiles.expiry_date IS NOT NULL)
```

This guarantees the member never loses pre-paid days.

### 5.3 Idempotency — No Duplicate Activation

Before any write, `activate` queries:
```sql
SELECT id FROM membership_purchases WHERE payment_id = $1 LIMIT 1;
```
If a row is found, the route returns `{ ok: true, already_processed: true }` with HTTP 200 and
makes no further DB changes. The `UNIQUE` constraint on `payment_id` also enforces this at the
DB level as a safety net.

### 5.4 Reuse of Existing Routes

- `POST /api/payments/create-order` — used exactly as-is by the membership purchase page.
- `POST /api/payments/verify` — still available and used by the consultation booking flow.
  The membership flow does its own inline HMAC check inside `activate` (same algorithm, same
  env var) rather than making a second HTTP call; this does not create a third implementation —
  it is the same 3-line crypto snippet already present in the route.

---

## 6. Membership Lifecycle

### 6.1 State Machine

```
             ┌──────────────────────────────┐
             │                              │
             ▼                              │
         [ none ]                           │
             │                              │
    Payment verified (new)                  │
             │                              │
             ▼                              │
         [ active ] ─── expiry_date passes ──► [ expired ]
             │                                      │
             │ ◄──── renewal payment verified ───────┘
             │
         (stays active, expiry extended)
```

**State transitions:**

| From | Event | To | Writer |
|---|---|---|---|
| none | Payment verified | active | `/api/membership/activate` |
| active | expiry_date < now() | expired | `pg_cron` (hourly) |
| active | `/api/membership/status` called | expired | `/api/membership/status` (server-side, inline check) |
| expired | Renewal payment verified | active | `/api/membership/activate` |
| active | Admin "Disable" action | expired | `/api/admin/membership/members/disable` |
| expired | Admin "Extend 30 Days" action | active | `/api/admin/membership/members/extend` |

**Sync invariant:** `profiles.premium` is ALWAYS kept in sync with `membership_status`:
- `membership_status = 'active'` ↔ `premium = true`
- `membership_status ≠ 'active'` ↔ `premium = false`

Both columns are written together in every state transition. The existing `premium` column
continues to be the gating signal for RLS policies on `premium_videos`.

### 6.2 Expiry Enforcement — Three Layers

**Layer 1 — Per-request server check (`/api/membership/status`):**
Every time the Premium page loads (in its `useEffect`), it calls `/api/membership/status`.
This route reads `profiles.expiry_date` from the DB and computes whether the membership is
actually still valid at this instant. If expired, the page redirects to `/membership/purchase`.
A stale cookie or stale client state cannot bypass this.

**Layer 2 — Inline check in Event_Guard (`/api/membership/live-link`):**
Before returning a YouTube link, the route re-queries `profiles.membership_status = 'active'`.

**Layer 3 — `pg_cron` hourly sweep:**
Runs `UPDATE profiles SET membership_status='expired', premium=false WHERE expiry_date < now()`.
This ensures the DB stays consistent even if no user visits the site. RLS on `premium_videos`
depends on `premium = true`, so this layer protects video access independently of page logic.

### 6.3 Renewal Expiry Computation

```typescript
const existingExpiry = profile.expiry_date ? new Date(profile.expiry_date) : null;
const base = existingExpiry && existingExpiry > new Date() ? existingExpiry : new Date();
const newExpiry = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days in ms
```

Equivalent SQL used in the admin extend route:
```sql
UPDATE profiles
SET
  expiry_date       = GREATEST(expiry_date, now()) + INTERVAL '30 days',
  membership_status = 'active',
  premium           = true
WHERE id = $1;
```

---

## 7. File Structure

### New API Routes (create)

```
frontend/app/api/
├── membership/
│   ├── activate/route.ts              ← MODIFY existing (add expiry logic)
│   ├── status/route.ts                ← NEW
│   └── live-link/route.ts             ← NEW
│   └── whatsapp-number/route.ts       ← NEW
└── admin/
    └── membership/
        ├── settings/route.ts          ← NEW
        ├── members/route.ts           ← NEW
        ├── members/extend/route.ts    ← NEW
        ├── members/disable/route.ts   ← NEW
        ├── videos/route.ts            ← NEW
        ├── videos/[id]/route.ts       ← NEW
        ├── live-events/route.ts       ← NEW
        ├── live-events/[id]/route.ts  ← NEW
        └── audit-log/route.ts         ← NEW
```

### New Components (create)

```
frontend/components/
├── membership-expiry-banner.tsx   ← Shows "X days remaining" + renewal CTA
├── live-event-card.tsx            ← Single live event card with "Join" button
├── live-events-section.tsx        ← Grid of upcoming + past events
├── whatsapp-button.tsx            ← WhatsApp CTA shown post-payment
└── admin-membership/
    ├── membership-settings-tab.tsx   ← Price, enabled, WhatsApp input
    ├── members-tab.tsx               ← Member list with Extend/Disable actions
    ├── videos-tab.tsx                ← Video CRUD UI
    ├── live-events-tab.tsx           ← Live events CRUD UI
    ├── membership-coupons-tab.tsx    ← Migrated from /admin/membership page
    └── audit-log-tab.tsx             ← Read-only audit log table
```

### Modified Files (additive only)

```
frontend/components/admin-shell.tsx                ← Add "Membership" section with sub-tabs
frontend/app/membership/premium/page.tsx           ← Add expiry check, banner, live events
frontend/app/membership/purchase/page.tsx          ← Add WhatsApp CTA on success, renewal copy
frontend/app/membership/page.tsx                   ← Update copy (30-day), show expiry if active
frontend/app/admin/membership/page.tsx             ← Add redirect to /admin
frontend/middleware.ts                              ← Add new admin API matchers
frontend/lib/supabase-auth.ts                      ← Add new types: LiveEvent, AdminSettings, etc.
```

### New SQL Migration Files (create)

```
docs/
├── migration-001-profiles-membership-columns.sql
├── migration-002-membership-purchases-expiry.sql
├── migration-003-live-events.sql
├── migration-004-admin-settings.sql
├── migration-005-membership-audit-log.sql
├── migration-006-premium-videos-status.sql
└── migration-007-pg-cron-expiry.sql
```

### New Shared Library File (create)

```
frontend/lib/dual-auth.ts    ← verifyDualAuth helper used by all admin routes
```

**No files are deleted.** The existing `/admin/membership/page.tsx` is kept and redirects to `/admin`.

---

## 8. Dual Auth Implementation

### `frontend/lib/dual-auth.ts`

```typescript
/**
 * dual-auth.ts
 * ─────────────
 * Two-layer admin authentication helper.
 * Layer 1: astro_admin_session cookie = "authorized" (set by /api/admin-auth)
 * Layer 2: Supabase JWT resolves to a user with profiles.is_admin = true
 *
 * Usage in every admin API route:
 *   const auth = await verifyDualAuth(request);
 *   if (!auth.ok) {
 *     return NextResponse.json({ error: auth.error }, { status: auth.status });
 *   }
 *   // auth.adminEmail is available for audit log entries
 */

import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_COOKIE = "astro_admin_session";

// Service-role client — never exposed to the browser
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export type DualAuthResult =
  | { ok: true;  adminEmail: string; adminUserId: string }
  | { ok: false; error: string; status: 401 | 403 };

export async function verifyDualAuth(request: NextRequest): Promise<DualAuthResult> {
  // ── Layer 1: cookie check ──────────────────────────────────────────────────
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE)?.value;

  if (sessionCookie !== "authorized") {
    return { ok: false, error: "Admin session required.", status: 401 };
  }

  // ── Layer 2: Supabase JWT + is_admin check ─────────────────────────────────
  const authHeader = request.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!jwt) {
    return { ok: false, error: "Missing Authorization header.", status: 401 };
  }

  // Verify the JWT and get the user
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
  if (userError || !userData.user) {
    return { ok: false, error: "Invalid or expired JWT.", status: 401 };
  }

  const userId = userData.user.id;
  const adminEmail = userData.user.email ?? "unknown";

  // Check is_admin flag in profiles table
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { ok: false, error: "User profile not found.", status: 403 };
  }

  if (!profile.is_admin) {
    return { ok: false, error: "Admin privilege required.", status: 403 };
  }

  return { ok: true, adminEmail, adminUserId: userId };
}

// ── Audit log helper ────────────────────────────────────────────────────────
export async function writeAuditLog(params: {
  action: string;
  performedBy: string;
  targetUserId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await supabaseAdmin.from("membership_audit_log").insert({
    action:         params.action,
    performed_by:   params.performedBy,
    target_user_id: params.targetUserId ?? null,
    metadata:       params.metadata ?? null,
  });
  // Audit log failures are non-fatal — log to stderr only
}
```

### Example Admin Route Using `verifyDualAuth`

```typescript
// frontend/app/api/admin/membership/members/disable/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyDualAuth, writeAuditLog } from "@/lib/dual-auth";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Verify both auth layers
  const auth = await verifyDualAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // 2. Parse and validate body
  const { user_id } = (await request.json()) as { user_id?: string };
  if (!user_id) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  // 3. Execute business logic
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ membership_status: "expired", premium: false })
    .eq("id", user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 4. Write audit log (non-fatal)
  await writeAuditLog({
    action:       "membership_disabled",
    performedBy:  auth.adminEmail,
    targetUserId: user_id,
  });

  return NextResponse.json({ ok: true });
}
```

---

## 9. Migration Plan

### Order of SQL Migrations

Run each migration in the Supabase SQL Editor in this exact order. Each is idempotent
(`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) and safe to re-run.

```
001  migration-001-profiles-membership-columns.sql
     → Adds is_admin, membership_status, expiry_date to profiles
     → Updates "profiles: own update" RLS policy to block is_admin writes

002  migration-002-membership-purchases-expiry.sql
     → Adds purchase_type, purchase_date, expiry_date to membership_purchases
     → Adds UNIQUE constraint on payment_id
     → Adds indexes

003  migration-003-live-events.sql
     → Creates live_events table with RLS

004  migration-004-admin-settings.sql
     → Creates admin_settings table with RLS
     → Seeds whatsapp_number = '' row

005  migration-005-membership-audit-log.sql
     → Creates membership_audit_log with append-only RLS

006  migration-006-premium-videos-status.sql
     → Adds status and updated_at columns to premium_videos
     → Backfills status from is_active

007  migration-007-pg-cron-expiry.sql
     → Enables pg_cron extension
     → Schedules hourly expiry job
     NOTE: Run this last. Requires pg_cron enabled in Supabase dashboard first.
           Dashboard → Database → Extensions → pg_cron → Enable
```

### How to Grant Admin to an Existing User

Run this in the Supabase SQL Editor (replace the email):

```sql
-- Grant admin to a specific user by email
UPDATE public.profiles
SET is_admin = true
WHERE email = 'owner@astrogenz.com';

-- Verify
SELECT id, email, is_admin FROM public.profiles WHERE email = 'owner@astrogenz.com';
```

This is the **only** way to set `is_admin = true`. The API never exposes a route to set this flag,
and the RLS `WITH CHECK` policy on the `profiles` table prevents self-elevation.

### Zero-Downtime Approach

All migrations are additive `ALTER TABLE … ADD COLUMN IF NOT EXISTS`. PostgreSQL adds nullable
columns instantly without a table lock. The only DDL that acquires a brief lock is `ADD CONSTRAINT`,
which runs in milliseconds on a table of normal size.

**Existing code continues to work during migration** because:
- The old `/api/membership/activate` still works even without `expiry_date` — the column is
  nullable and the existing code path does not reference it.
- The new code path is deployed *after* all migrations are confirmed in Supabase.
- The `/admin/membership` redirect page is deployed alongside the new `AdminShell` Membership
  section, so existing bookmarks never 404.

### Updated `middleware.ts` Matcher

```typescript
export const config = {
  matcher: [
    "/admin/:path*",
    "/membership/premium/:path*",
    // New admin API routes — middleware enforces cookie before route handler runs
    // (the route itself also calls verifyDualAuth for the JWT layer)
    "/api/admin/:path*",
  ],
};
```

The new `/api/admin/:path*` matcher adds the cookie-layer guard at the middleware level as a
fast-fail before any route handler logic runs. The Dual_Auth check inside the route handler
still runs as the second layer.

### Environment Variables — No New Secrets Needed

All new API routes reuse the existing env vars:

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All routes (existing) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase JS client (existing) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin routes + activate (existing) |
| `RAZORPAY_KEY_SECRET` | Activate route HMAC (existing) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Purchase page (existing) |
| `ADMIN_PASSCODE` | Admin-auth route (existing) |

No new environment variables are introduced.

---

## 10. Component Design Notes

### `MembershipExpiryBanner`

Rendered at the top of the Premium page. Receives `expiryDate: Date` and `daysRemaining: number` as props.

- `daysRemaining > 5` → quiet info bar: "Membership active · X days remaining"
- `1 < daysRemaining ≤ 5` → amber warning: "Renew soon — X days remaining" + Renew button
- `daysRemaining <= 1` → red warning: "Less than 1 day remaining — Renew now" + Renew button

### `LiveEventsSection`

Reads events from Supabase using `supabaseAuth` client (member RLS) — gets metadata without
`youtube_link`. On "Join" click, calls `/api/membership/live-link?eventId=X` to get the URL,
then opens it in a new tab.

Splits events into two groups:
- Upcoming: `event_date > now() - 2h` AND `is_active = true`
- Past: `event_date <= now() - 2h` AND `is_active = true`

### `WhatsAppButton`

Fetches `/api/membership/whatsapp-number` on mount. If the number is empty or the fetch fails,
renders nothing (no broken link). When present, renders:

```html
<a href="https://wa.me/{whatsapp_number}?text=Hi%2C+I+just+joined+AstroGenZ+Premium!"
   target="_blank" rel="noopener noreferrer">
  Contact Astrologer on WhatsApp
</a>
```

### `AdminShell` Membership Section

Added as a new `<section>` at the bottom of the existing `AdminShell` component. Uses a
`useState<MembershipAdminTab>` to track the active sub-tab. The sub-tab list is rendered as a
horizontally-scrollable `<div className="flex gap-2 overflow-x-auto">` on mobile.

The section fetches a fresh Supabase session via `supabaseAuth.getSession()` and passes the JWT
as the `Authorization: Bearer` header on every admin API call from the client side.

Sub-tabs: Settings | Members | Videos | Live Events | Coupons | Audit Log

---

## 11. Backward Compatibility Checklist

| Item | Status |
|---|---|
| `/api/payments/create-order` | Unchanged |
| `/api/payments/verify` | Unchanged |
| `/api/membership/activate` | Modified (additive — new fields written, old path still works) |
| `/api/membership/sync-profile` | Unchanged |
| `/api/membership/validate-coupon` | Unchanged |
| `/api/admin-auth` | Unchanged |
| `lib/supabase.ts` | Unchanged |
| `lib/supabase-auth.ts` | Extended with new types (no removals) |
| `profiles.premium` | Still written + still used by RLS on premium_videos |
| `profiles` existing columns | No removals; only 3 columns added |
| `membership_purchases` existing columns | No removals; 3 columns added |
| `premium_videos` existing columns | No removals; 2 columns added with safe defaults |
| Existing RLS policies | None removed; new policies added alongside |
| Admin passcode login flow | Unchanged |
| Consultation booking | Unchanged |
| Homepage, services, FAQ | Unchanged |
| `/admin/membership` route | Kept, redirects to `/admin` |
