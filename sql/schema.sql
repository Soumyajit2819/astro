CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(32),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE astrologers (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  bio TEXT,
  specialties JSONB,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE services (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price_inr NUMERIC(10, 2) NOT NULL,
  payment_qr_url TEXT,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE courses (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_months INTEGER NOT NULL DEFAULT 4,
  classes_per_week INTEGER NOT NULL DEFAULT 2
);

CREATE TYPE booking_status AS ENUM ('pending', 'paid', 'failed');
CREATE TYPE payment_status AS ENUM ('created', 'authorized', 'paid', 'failed', 'refunded');
CREATE TYPE schedule_type AS ENUM ('class_session', 'qa_session', 'monthly_test');
CREATE TYPE notification_type AS ENUM ('payment_success', 'enrollment', 'reschedule', 'consultation', 'announcement');

CREATE TABLE bookings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id BIGINT NOT NULL REFERENCES services(id),
  date_of_birth DATE NOT NULL,
  time_of_birth TIME NOT NULL,
  place_of_birth VARCHAR(255) NOT NULL,
  message TEXT,
  status booking_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  razorpay_order_id VARCHAR(255) UNIQUE NOT NULL,
  razorpay_payment_id VARCHAR(255),
  razorpay_signature VARCHAR(255),
  amount_inr NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'created',
  gateway_payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE schedules (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_name VARCHAR(32) NOT NULL,
  session_type schedule_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  rescheduled_from TIMESTAMP,
  notes TEXT
);

CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE faq (
  id BIGSERIAL PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100)
);

CREATE TABLE feedback (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  consultation_type VARCHAR(255) NOT NULL,
  feedback_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
