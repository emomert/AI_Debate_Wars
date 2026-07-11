-- Debator — privacy-safe match analytics "cards" (dimensions only).
--
-- ONE flat row per finished match, written SERVER-SIDE from the verdict route
-- (via the service-role key). Deliberately stores NO content: no topic text, no
-- transcript, no custom-tone wording — only the tone PRESET name. Powers the
-- owner-only admin dashboard.
--
-- RLS is ON with NO policies → anon/authenticated get zero direct access (same
-- lock as rate_limit_hits in 0003). Only the service-role key (server-only,
-- bypasses RLS) reads/writes it. Additive + idempotent → safe to re-run.

create table if not exists public.match_analytics (
  id               uuid primary key default gen_random_uuid(),
  -- one row per client session; a re-judge upserts the same row.
  app_session_id   text not null unique,
  -- nullable + set-null on delete: keep aggregate counts but drop the identity
  -- link when a user deletes their account (no orphaned PII).
  user_id          uuid references auth.users (id) on delete set null,
  mode             text not null,
  round_count      int  not null,
  battle_count     int  not null default 1,
  deep_debate      boolean not null default false,
  -- tone PRESET only (serious/aggressive/casual/custom/unhinged) — never the
  -- free-text custom wording.
  tone             text not null,
  response_length  text not null,
  pace             text not null,
  language         text not null default 'en',
  model_a_id       text not null,
  model_b_id       text not null,
  judge_mode       text not null,   -- auto | thirdModel | modelA | modelB
  judge_model_id   text not null,   -- the resolved model that actually judged
  winner           text,            -- modelA | modelB | tie | not_applicable | null
  score_a          int,
  score_b          int,
  match_cost       numeric(12, 6) not null default 0, -- accumulated turn+judge cost
  verdict_cost     numeric(12, 6) not null default 0, -- this verdict call's cost
  created_at       timestamptz not null default now()
);

create index if not exists match_analytics_created_idx
  on public.match_analytics (created_at desc);

alter table public.match_analytics enable row level security;
-- No policies on purpose → deny-all for anon/authenticated. Only the
-- service-role key (server analytics writer + admin route) may touch it.
