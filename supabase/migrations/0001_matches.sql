-- Debator — match history + stats (docs/19 Phase 2/3).
-- Paste into Supabase → SQL Editor → Run. Safe to re-run (idempotent).

create table if not exists public.matches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  -- the client DebateSession.id, so re-saving a match (e.g. after a re-judge)
  -- upserts the same row instead of duplicating it.
  app_session_id  text not null,
  topic           text not null,
  mode            text not null,
  round_count     int not null,
  model_a         text not null,
  model_b         text not null,
  winner          text,
  total_cost      numeric(12, 6) not null default 0,
  deep_debate     boolean not null default false,
  -- full DebateSession snapshot (rehydrated when reopening a match).
  session         jsonb not null,
  created_at      timestamptz not null default now(),
  unique (user_id, app_session_id)
);

create index if not exists matches_user_created_idx
  on public.matches (user_id, created_at desc);

alter table public.matches enable row level security;

-- Row Level Security: a user can only read/write their OWN matches. Enforced in
-- the database, so even a crafted client can't touch another user's rows.
drop policy if exists "matches_select_own" on public.matches;
create policy "matches_select_own" on public.matches
  for select using (auth.uid() = user_id);

drop policy if exists "matches_insert_own" on public.matches;
create policy "matches_insert_own" on public.matches
  for insert with check (auth.uid() = user_id);

drop policy if exists "matches_update_own" on public.matches;
create policy "matches_update_own" on public.matches
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "matches_delete_own" on public.matches;
create policy "matches_delete_own" on public.matches
  for delete using (auth.uid() = user_id);
