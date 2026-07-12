-- Debator — security hardening (2026-07-13). Two DB-side belts behind the
-- app-code fixes of the same date. Safe to re-run (idempotent).
--
-- Context: coin_spend_match and the rate-limit/spend RPCs are SECURITY DEFINER
-- and were reachable over PostgREST (granted to anon/authenticated). Live risks:
--   1. spend_record(p_ip, p_amount) — anon-callable with a client-supplied
--      amount → an attacker could poison the GLOBAL spend ledger and trip the
--      daily cap for EVERYONE (app-wide denial of service).
--   2. coin_spend_match trusted a client-supplied p_allowance, letting a direct
--      caller inflate the free daily bucket.
--
-- App-side (this same change): coin charge keys are now HMAC-signed with a
-- server secret (src/lib/coins/chargeKey.ts), so a forged/pre-seeded key can't
-- collide with a real match; and the rate-limit RPCs are now called with the
-- SERVICE-ROLE client (src/lib/security/rateLimit.ts). This migration adds the
-- matching DB-side guards. It is compatible with BOTH the old and new app code,
-- so it can be applied before or after the code deploys.

-- ── 1. Coin charge: ignore the client-supplied daily allowance ────────────────
-- Same signature + grant as migration 0012 (the app still calls it via the
-- user's own client, keyed on auth.uid()), but the daily free allowance is now a
-- SERVER constant instead of the p_allowance argument. p_allowance is retained
-- only for signature/back-compat and is ignored.
-- KEEP c_daily_allowance in sync with FREE_DAILY_COINS in src/lib/coins/config.ts.
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

  select pb, ds into v_purchased, v_daily_spent
    from public.coin_status() as s(pb, ds);

  if exists (select 1 from public.coin_ledger
      where user_id = v_uid and match_id = p_session_id and reason = 'match') then
    return query select true, 'ALREADY', v_purchased, v_daily_spent; return;
  end if;

  v_daily_available := greatest(0, c_daily_allowance - v_daily_spent);
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

-- ── 2. Rate-limit / spend-cap functions → service-role only ───────────────────
-- These mutate app-wide ledgers (a single spend_record can trip the global cap),
-- so they must never be client-callable. The server now invokes them with the
-- service-role client. Revoke the broad grants (including the default PUBLIC one)
-- and grant execute to service_role explicitly.
revoke execute on function public.rl_hit(text, int, int) from public, anon, authenticated;
revoke execute on function public.spend_allowed(text, numeric, numeric) from public, anon, authenticated;
revoke execute on function public.spend_record(text, numeric) from public, anon, authenticated;
grant execute on function public.rl_hit(text, int, int) to service_role;
grant execute on function public.spend_allowed(text, numeric, numeric) to service_role;
grant execute on function public.spend_record(text, numeric) to service_role;
