-- Debator — cost & abuse protection for the public paid routes (docs/11).
-- Per-IP request rate limits + global/per-IP daily spend caps, enforced in the
-- database via SECURITY DEFINER functions. The functions are callable by the
-- anon role (so anonymous traffic is limited without exposing a service-role
-- key to the server), but the underlying tables are locked (RLS on, no policies
-- = deny all direct access) so only these functions can touch them.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run (idempotent).

-- ── Tables ──────────────────────────────────────────────────────────────────
create table if not exists public.rate_limit_hits (
  bucket        text not null,          -- e.g. 'turn:ip:1.2.3.4'
  window_start  timestamptz not null,   -- start of the fixed window
  count         int not null default 0,
  primary key (bucket, window_start)
);
create index if not exists rate_limit_hits_window_idx
  on public.rate_limit_hits (window_start);

create table if not exists public.spend_ledger (
  scope       text not null,            -- 'global' or 'ip:<addr>'
  day         date not null,            -- UTC day
  spent_usd   numeric(12, 6) not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (scope, day)
);

alter table public.rate_limit_hits enable row level security;
alter table public.spend_ledger    enable row level security;
-- No policies on purpose → direct client access is denied; only the
-- SECURITY DEFINER functions below (which run as the owner) may read/write.

-- ── Atomic fixed-window rate limit ───────────────────────────────────────────
-- Increments the current window's counter and returns TRUE if still allowed
-- (count <= p_limit). Opportunistically prunes older windows for the bucket.
create or replace function public.rl_hit(
  p_bucket text,
  p_limit int,
  p_window_seconds int
) returns boolean
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_start timestamptz;
  v_count int;
begin
  v_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  insert into public.rate_limit_hits (bucket, window_start, count)
    values (p_bucket, v_start, 1)
  on conflict (bucket, window_start)
    do update set count = public.rate_limit_hits.count + 1
  returning count into v_count;

  delete from public.rate_limit_hits
    where bucket = p_bucket and window_start < v_start;

  return v_count <= p_limit;
end;
$$;

-- ── Spend caps ───────────────────────────────────────────────────────────────
-- TRUE if today's spend is under BOTH the global and per-IP caps (i.e. allowed).
create or replace function public.spend_allowed(
  p_ip text,
  p_global_cap numeric,
  p_ip_cap numeric
) returns boolean
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_global numeric := 0;
  v_ip numeric := 0;
begin
  select coalesce(spent_usd, 0) into v_global
    from public.spend_ledger where scope = 'global' and day = current_date;
  select coalesce(spent_usd, 0) into v_ip
    from public.spend_ledger where scope = 'ip:' || p_ip and day = current_date;
  return coalesce(v_global, 0) < p_global_cap and coalesce(v_ip, 0) < p_ip_cap;
end;
$$;

-- Adds the actual cost of a call to today's global + per-IP ledgers.
create or replace function public.spend_record(
  p_ip text,
  p_amount numeric
) returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if p_amount is null or p_amount <= 0 then
    return;
  end if;
  insert into public.spend_ledger (scope, day, spent_usd)
    values ('global', current_date, p_amount)
  on conflict (scope, day)
    do update set spent_usd = public.spend_ledger.spent_usd + p_amount, updated_at = now();
  insert into public.spend_ledger (scope, day, spent_usd)
    values ('ip:' || p_ip, current_date, p_amount)
  on conflict (scope, day)
    do update set spent_usd = public.spend_ledger.spent_usd + p_amount, updated_at = now();
end;
$$;

grant execute on function public.rl_hit(text, int, int) to anon, authenticated;
grant execute on function public.spend_allowed(text, numeric, numeric) to anon, authenticated;
grant execute on function public.spend_record(text, numeric) to anon, authenticated;
