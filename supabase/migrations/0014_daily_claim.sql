-- Debator — daily allowance becomes CLAIM-GATED (docs/23_COINS.md; spec
-- docs/superpowers/specs/2026-07-28-owner-changes-design.md §2). Safe to
-- re-run (idempotent).
--
-- The problem this fixes: the daily free allowance used to be IMPLICIT —
-- coin_status() reported daily_spent, and both the client and
-- coin_spend_match derived `available = 15 − daily_spent`. A user who never
-- opened the app still "had" 15 coins waiting; there was nothing to claim and
-- no signal that visiting daily mattered.
--
-- The fix keeps the allowance COMPUTED, never CREDITED. Claiming does NOT
-- insert coins into coin_ledger — it inserts a row recording that today was
-- claimed, and the existing (allowance − daily_spent) computation is gated on
-- that row existing. Consequences:
--   · A replayed, forged, or spammed claim call cannot mint anything — the
--     worst case is a no-op `insert … on conflict do nothing`.
--   · `primary key (user_id, claim_date)` makes double-claiming structurally
--     impossible, not merely guarded.
--   · claim_date is bucketed the SAME way coin_status() already buckets
--     daily_spent — `(now() at time zone 'utc')::date` — so the claim window
--     and the spend window can never drift apart.
--   · Non-rollover survives for free: an unclaimed day simply has no row, and
--     yesterday's row doesn't make today's coins spendable.

-- ── Table ───────────────────────────────────────────────────────────────────

create table if not exists public.coin_daily_claims (
  user_id    uuid not null references auth.users (id) on delete cascade,
  claim_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, claim_date)
);

alter table public.coin_daily_claims enable row level security;

-- Users may READ their own claim rows (so the client can show claimed-today
-- state); all writes go only through coin_claim_daily() below.
drop policy if exists coin_daily_claims_select_own on public.coin_daily_claims;
create policy coin_daily_claims_select_own on public.coin_daily_claims
  for select to authenticated using (auth.uid() = user_id);

-- ── coin_status(): gains claimed_today ────────────────────────────────────────
-- The OUT signature changed (purchased_balance, daily_spent) → (…, claimed_today)
-- so the function must be dropped before it can be recreated.
drop function if exists public.coin_status();

create function public.coin_status()
returns table (purchased_balance int, daily_spent int, claimed_today boolean)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return query select 0, 0, false;
    return;
  end if;
  return query select
    coalesce((select sum(delta)::int from public.coin_ledger
      where user_id = v_uid and bucket in ('purchased', 'promo')), 0),
    coalesce((select -sum(delta)::int from public.coin_ledger
      where user_id = v_uid and bucket = 'daily'
        and (created_at at time zone 'utc')::date = (now() at time zone 'utc')::date), 0),
    exists (select 1 from public.coin_daily_claims
      where user_id = v_uid and claim_date = (now() at time zone 'utc')::date);
end;
$$;

-- ── coin_spend_match(): recreated against the new coin_status() shape ────────
-- Copied from migration 0013 (the current version) with exactly two changes:
--   1. `from public.coin_status() as s(pb, ds)` widened to `s(pb, ds, ct)` —
--      the old two-column alias breaks against the new three-column return.
--   2. The daily allowance is now gated on `v_claimed_today`: an unclaimed day
--      has zero daily coins available, full stop.
-- Everything else — signature, the server-authoritative c_daily_allowance
-- (p_allowance retained but ignored), the advisory lock, BAD_INPUT
-- validation, the idempotency check, the ledger inserts, the return shape —
-- carries over unchanged.
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
  c_daily_allowance constant int := 15;  -- server-authoritative; ignores p_allowance
  v_uid uuid := auth.uid();
  v_purchased int;
  v_daily_spent int;
  v_claimed_today boolean;
  v_daily_available int;
  v_use_daily int;
  v_need_purchased int;
begin
  if v_uid is null then
    return query select false, 'AUTH', 0, 0; return;
  end if;
  if p_session_id is null or length(p_session_id) = 0
     or p_total is null or p_total <= 0
     or p_premium is null or p_premium < 0 or p_premium > p_total then
    return query select false, 'BAD_INPUT', 0, 0; return;
  end if;

  -- Serialize this user's coin operations (double-submit + balance races).
  perform pg_advisory_xact_lock(hashtext('coins:' || v_uid::text));

  select pb, ds, ct into v_purchased, v_daily_spent, v_claimed_today
    from public.coin_status() as s(pb, ds, ct);

  if exists (select 1 from public.coin_ledger
      where user_id = v_uid and match_id = p_session_id and reason = 'match') then
    return query select true, 'ALREADY', v_purchased, v_daily_spent; return;
  end if;

  v_daily_available := case when v_claimed_today
    then greatest(0, c_daily_allowance - v_daily_spent)
    else 0 end;
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

-- ── coin_claim_daily(): record today's claim ─────────────────────────────────
-- Does NOT touch coin_ledger — see the header note. Returns the post-claim
-- status numbers so the client can update its chip without a second round
-- trip. Reuses the exact rl_hit brute-force-guard pattern coin_redeem_promo
-- already uses: rl_hit was revoked from authenticated in migration 0013, but
-- this function is SECURITY DEFINER, so the nested call runs as the function
-- owner (same reasoning that already makes coin_redeem_promo's rl_hit call
-- work post-0013) — not as the invoking client role.
create or replace function public.coin_claim_daily()
returns table (
  ok boolean,
  result text,
  coins int,
  purchased_balance int,
  daily_spent int
)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  c_daily_allowance constant int := 15;  -- KEEP in sync with FREE_DAILY_COINS
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_inserted int;
  v_purchased int;
  v_daily_spent int;
begin
  if v_uid is null then
    return query select false, 'AUTH', 0, 0, 0; return;
  end if;

  -- Brute-force guard: cheap table, but an unbounded client-callable insert
  -- shouldn't be able to churn it. Same limiter/window as coin_redeem_promo.
  if not public.rl_hit('dailyclaim:' || v_uid::text, 60, 3600) then
    return query select false, 'RATE_LIMITED', 0, 0, 0; return;
  end if;

  insert into public.coin_daily_claims (user_id, claim_date)
    values (v_uid, v_today)
  on conflict (user_id, claim_date) do nothing;
  get diagnostics v_inserted = row_count;

  select pb, ds into v_purchased, v_daily_spent
    from public.coin_status() as s(pb, ds, ct);

  if v_inserted > 0 then
    return query select true, 'CLAIMED', c_daily_allowance, v_purchased, v_daily_spent;
  else
    return query select true, 'ALREADY', c_daily_allowance, v_purchased, v_daily_spent;
  end if;
end;
$$;

grant execute on function public.coin_status() to authenticated;
grant execute on function public.coin_spend_match(text, int, int, int) to authenticated;
grant execute on function public.coin_claim_daily() to authenticated;
