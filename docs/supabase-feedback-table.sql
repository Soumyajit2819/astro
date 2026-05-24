create table if not exists public.feedback (
  id bigserial primary key,
  full_name text not null,
  email text not null,
  consultation_type text not null,
  feedback_text text not null,
  created_at timestamp not null default now()
);
