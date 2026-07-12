-- Debator — coin economy (docs/23_COINS.md; spec 2026-07-12-coin-economy-design.md).
-- Ledger + promo codes, enforced in the database via SECURITY DEFINER functions
-- keyed on auth.uid() (a caller can only ever act on their own balance). The
-- tables are locked (RLS on; only coin_ledger gets an own-rows SELECT policy)
-- so balances can never be forged from the client. Safe to re-run (idempotent).
--
-- Design notes:
--   · Daily free coins are NOT ledgered as grants — the remaining allowance is
--     computed as (allowance − today's 'daily' spends), so unused coins expire
--     at midnight UTC by construction (no cleanup job, no rollover).
--   · Purchased + promo coins never expire; both count into one spendable
--     balance ("purchased" below). Purchase credits (Polar webhook, next step)
--     are inserted by the service role with a UNIQUE order_id for idempotency.
--   · A match spend is idempotent per (user, session): re-sent turn requests
--     can call coin_spend_match every time; only the first charge lands.

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.coin_ledger (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  delta       int  not null check (delta <> 0),
  bucket      text not null check (bucket in ('purchased', 'promo', 'daily')),
  reason      text not null,             -- 'match' | 'promo:<CODE>' | 'order' | 'admin:<note>'
  match_id    text,                      -- debate session id for 'match' spends
  order_id    text,                      -- payment order id for purchase credits
  created_at  timestamptz not null default now()
);

create index if not exists coin_ledger_user_time_idx
  on public.coin_ledger (user_id, created_at desc);
create index if not exists coin_ledger_user_bucket_idx
  on public.coin_ledger (user_id, bucket);
-- One purchase credit per payment order (webhook retries stay idempotent).
create unique index if not exists coin_ledger_order_uidx
  on public.coin_ledger (order_id) where order_id is not null;
-- One spend row per (user, match, bucket) — the DB-level double-charge guard.
create unique index if not exists coin_ledger_match_spend_uidx
  on public.coin_ledger (user_id, match_id, bucket) where match_id is not null;

create table if not exists public.promo_codes (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,   -- stored UPPERCASE
  coins            int  not null check (coins > 0),
  max_redemptions  int  not null check (max_redemptions > 0),
  redeemed_count   int  not null default 0,
  expires_at       timestamptz,            -- null = no expiry
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  code_id     uuid not null references public.promo_codes (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (code_id, user_id)            -- one redemption per account per code
);

alter table public.coin_ledger       enable row level security;
alter table public.promo_codes       enable row level security;
alter table public.promo_redemptions enable row level security;

-- Users may READ their own ledger (balance/history UI); all writes go through
-- the functions below. Promo tables have no policies at all (definer-only).
drop policy if exists coin_ledger_select_own on public.coin_ledger;
create policy coin_ledger_select_own on public.coin_ledger
  for select to authenticated using (auth.uid() = user_id);

-- ── Balance / status ─────────────────────────────────────────────────────────
-- purchased_balance: spendable non-expiring coins (purchased + promo buckets).
-- daily_spent: 'daily' coins consumed today (UTC) — the app computes
-- remaining = allowance − daily_spent with the allowance from code config.
create or replace function public.coin_status()
returns table (purchased_balance int, daily_spent int)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return query select 0, 0;
    return;
  end if;
  return query select
    coalesce((select sum(delta)::int from public.coin_ledger
      where user_id = v_uid and bucket in ('purchased', 'promo')), 0),
    coalesce((select -sum(delta)::int from public.coin_ledger
      where user_id = v_uid and bucket = 'daily'
        and (created_at at time zone 'utc')::date = (now() at time zone 'utc')::date), 0);
end;
$$;

-- ── Charge a match ───────────────────────────────────────────────────────────
-- p_total: full coin price; p_premium: the share only purchased coins may pay
-- (both computed SERVER-side from the session — never trusted from the client).
-- p_allowance: FREE_DAILY_COINS from code config.
-- Splits daily-first for the non-premium share; idempotent per (user, session).
-- Returns ok + result code: 'CHARGED' | 'ALREADY' | 'AUTH' | 'BAD_INPUT' |
-- 'INSUFFICIENT' (+ the post-call status numbers for the UI).
create or replace function public.coin_spend_match(
  p_session_id text,
  p_total int,
  p_premium int,
  p_allowance int
) returns table (ok boolean, result text, purchased_balance int, daily_spent int)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_purchased int;
  v_daily_spent int;
  v_daily_available int;
  v_use_daily int;
  v_need_purchased int;
begin
  if v_uid is null then
    return query select false, 'AUTH', 0, 0; return;
  end if;
  if p_session_id is null or length(p_session_id) = 0
     or p_total is null or p_total <= 0
     or p_premium is null or p_premium < 0 or p_premium > p_total
     or p_allowance is null or p_allowance < 0 then
    return query select false, 'BAD_INPUT', 0, 0; return;
  end if;

  -- Serialize this user's coin operations (double-submit + balance races).
  perform pg_advisory_xact_lock(hashtext('coins:' || v_uid::text));

  select pb, ds into v_purchased, v_daily_spent
    from public.coin_status() as s(pb, ds);

  if exists (select 1 from public.coin_ledger
      where user_id = v_uid and match_id = p_session_id and reason = 'match') then
    return query select true, 'ALREADY', v_purchased, v_daily_spent; return;
  end if;

  v_daily_available := greatest(0, p_allowance - v_daily_spent);
  v_use_daily := least(v_daily_available, p_total - p_premium);
  v_need_purchased := p_total - v_use_daily;

  if v_purchased < v_need_purchased then
    return query select false, 'INSUFFICIENT', v_purchased, v_daily_spent; return;
  end if;

  if v_use_daily > 0 then
    insert into public.coin_ledger (user_id, delta, bucket, reason, match_id)
      values (v_uid, -v_use_daily, 'daily', 'match', p_session_id);
  end if;
  if v_need_purchased > 0 then
    insert into public.coin_ledger (user_id, delta, bucket, reason, match_id)
      values (v_uid, -v_need_purchased, 'purchased', 'match', p_session_id);
  end if;

  return query select true, 'CHARGED',
    v_purchased - v_need_purchased, v_daily_spent + v_use_daily;
end;
$$;

-- ── Redeem a promo code ──────────────────────────────────────────────────────
-- Guardrails: normalized code, active flag, expiry, global redemption cap
-- (row-locked against races), one redemption per account (PK), atomic credit.
-- Returns 'REDEEMED' | 'AUTH' | 'INVALID' | 'EXPIRED' | 'EXHAUSTED' | 'ALREADY_USED'.
create or replace function public.coin_redeem_promo(p_code text)
returns table (ok boolean, result text, coins int)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_promo public.promo_codes%rowtype;
begin
  if v_uid is null then
    return query select false, 'AUTH', 0; return;
  end if;

  -- Brute-force guard: the RPC is callable straight from the browser, so the
  -- attempt limit lives HERE (10/hour/user via the existing rl_hit limiter),
  -- not only in an API route. Codes are high-entropy on top.
  if not public.rl_hit('promo:' || v_uid::text, 10, 3600) then
    return query select false, 'RATE_LIMITED', 0; return;
  end if;

  select * into v_promo from public.promo_codes
    where code = upper(trim(p_code)) and active
    for update;                       -- locks the cap counter against races
  if not found then
    return query select false, 'INVALID', 0; return;
  end if;
  if v_promo.expires_at is not null and v_promo.expires_at < now() then
    return query select false, 'EXPIRED', 0; return;
  end if;
  if v_promo.redeemed_count >= v_promo.max_redemptions then
    return query select false, 'EXHAUSTED', 0; return;
  end if;

  begin
    insert into public.promo_redemptions (code_id, user_id) values (v_promo.id, v_uid);
  exception when unique_violation then
    return query select false, 'ALREADY_USED', 0; return;
  end;

  update public.promo_codes set redeemed_count = redeemed_count + 1
    where id = v_promo.id;
  insert into public.coin_ledger (user_id, delta, bucket, reason)
    values (v_uid, v_promo.coins, 'promo', 'promo:' || v_promo.code);

  return query select true, 'REDEEMED', v_promo.coins;
end;
$$;

grant execute on function public.coin_status() to authenticated;
grant execute on function public.coin_spend_match(text, int, int, int) to authenticated;
grant execute on function public.coin_redeem_promo(text) to authenticated;
