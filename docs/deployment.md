# Deployment Guide

## 1. Supabase PostgreSQL setup

1. Create a new project in [Supabase](https://supabase.com).
2. Open the SQL editor and run [`sql/schema.sql`](/Users/apple/astro/sql/schema.sql).
3. Copy the connection string and convert it to SQLAlchemy format for the backend:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/postgres
```

4. Seed base data by calling `GET /api/seed` after the backend is live.

## 2. Render deployment for FastAPI

1. Create a new Web Service in Render from the `backend/` directory.
2. Set the build command:

```bash
pip install -r requirements.txt
```

3. Set the start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

4. Add environment variables in Render:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/postgres
FRONTEND_URL=https://your-frontend-domain.vercel.app
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=your_live_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@yourdomain.com
ADMIN_NOTIFICATION_EMAIL=admin@yourdomain.com
```

5. In Razorpay dashboard, configure:
   - Webhook URL: `https://your-render-service.onrender.com/api/payments/webhook`
   - Allowed frontend origin: your Vercel domain

6. After deploy, verify:
   - `GET /api/health`
   - `GET /api/seed`

## 3. Vercel deployment for Next.js

1. Import the `frontend/` directory as a new Vercel project.
2. Add environment variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-render-service.onrender.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxx
```

3. Run the default Vercel build command:

```bash
npm install
npm run build
```

4. Redeploy after confirming the Render URL is correct.

## 4. Domain setup

1. Point your custom frontend domain to Vercel using the DNS records provided by Vercel.
2. Point your API subdomain such as `api.yourdomain.com` to Render if you want a branded backend URL.
3. Update:
   - `FRONTEND_URL` in Render
   - `NEXT_PUBLIC_API_BASE_URL` in Vercel
   - Razorpay webhook URL
   - Resend verified sending domain

## 5. Production connection flow

1. User opens Vercel-hosted Next.js site.
2. Booking form posts to Render-hosted FastAPI API.
3. FastAPI writes booking and payment records to Supabase PostgreSQL.
4. FastAPI creates a Razorpay order and frontend opens Razorpay checkout.
5. Successful payment triggers:
   - frontend verification request
   - optional Razorpay webhook confirmation
   - PostgreSQL payment status update
   - confirmation email through Resend

## 6. Production hardening

1. Move `Base.metadata.create_all()` to Alembic migrations before go-live.
2. Add authentication and role checks for admin endpoints.
3. Add background jobs for email retries and webhook processing.
4. Store teacher availability in PostgreSQL instead of hardcoded values.
5. Add logging, rate limiting, and monitoring.
