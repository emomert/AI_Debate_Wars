-- Debator — move signup consent off the public profiles row (RLS hardening).
--
-- profiles is intentionally world-readable (username/avatar are the public
-- identity shown on community posts), but 0005 put the consent/age-gate columns
-- on that same row — so anyone holding the public anon key could read every
-- user's terms_accepted_at / age_confirmed / terms_version. Consent is
-- compliance metadata, not identity: it moves to profile_consent, readable and
-- writable ONLY by its owner. Additive + guarded → safe to re-run.

create table if not exists public.profile_consent (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  terms_accepted_at timestamptz,
  age_confirmed     boolean not null default false,
  terms_version     text,
  updated_at        timestamptz not null default now()
);

alter table public.profile_consent enable row level security;

drop policy if exists "profile_consent_select_own" on public.profile_consent;
create policy "profile_consent_select_own" on public.profile_consent
  for select using (auth.uid() = user_id);

drop policy if exists "profile_consent_insert_own" on public.profile_consent;
create policy "profile_consent_insert_own" on public.profile_consent
  for insert with check (auth.uid() = user_id);

drop policy if exists "profile_consent_update_own" on public.profile_consent;
create policy "profile_consent_update_own" on public.profile_consent
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Copy any consent already recorded on profiles, then drop those columns
-- (which also removes them from profiles' world-readable SELECT). The copy is
-- guarded on column existence so this file stays re-runnable after the drop.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'terms_accepted_at'
  ) then
    insert into public.profile_consent
        (user_id, terms_accepted_at, age_confirmed, terms_version)
      select user_id, terms_accepted_at, age_confirmed, terms_version
        from public.profiles
        where terms_accepted_at is not null or age_confirmed
      on conflict (user_id) do nothing;
  end if;
end $$;

alter table public.profiles
  drop column if exists terms_accepted_at,
  drop column if exists age_confirmed,
  drop column if exists terms_version;
