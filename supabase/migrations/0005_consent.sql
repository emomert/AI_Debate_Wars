-- Debator — signup consent + age gate (P0-7). Records that a user affirmed they
-- are 13+ and accepted the Terms & Privacy Policy at onboarding (GDPR Art. 7/8,
-- KVKK explicit consent, COPPA age gate). Additive + idempotent.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists age_confirmed boolean not null default false,
  add column if not exists terms_version text;

-- The user writes these to their OWN row through the existing
-- profiles_insert_own / profiles_update_own RLS policies (0004_social.sql) — no
-- new policy or service-role key is needed.
