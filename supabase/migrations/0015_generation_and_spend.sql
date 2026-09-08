-- Server-owned generation, fenced retries, and atomic per-attempt spend booking.
-- Additive: existing saved matches, coins and historical spend are retained.
create table if not exists public.generation_matches (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null check (length(session_id) between 1 and 100),
  state jsonb not null,
  results jsonb not null default '{}',
  revision integer not null default 0,
  attempts jsonb not null default '{}',
  active_key text,
  lease_token uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, session_id)
);
alter table public.generation_matches enable row level security;
revoke all on public.generation_matches from public, anon, authenticated;
grant select, insert, update, delete on public.generation_matches to service_role;

create or replace function public.generation_claim(p_user uuid, p_session text, p_revision int, p_key text, p_token uuid)
returns text language plpgsql security definer set search_path = public as $$
declare r public.generation_matches; n int;
begin
  if p_user is null or p_session is null or p_revision is null or p_key is null or p_token is null
    or length(p_session) = 0 or length(p_key) = 0 or length(p_key) > 200 then
    raise exception 'invalid claim';
  end if;
  select * into r from public.generation_matches where user_id=p_user and session_id=p_session for update;
  if not found then return 'missing'; end if;
  if r.results ? p_key or r.revision <> p_revision then return 'stale'; end if;
  if r.active_key is not null and r.lease_until > clock_timestamp() then return 'busy'; end if;
  n := coalesce((r.attempts ->> p_key)::int, 0);
  if n >= 3 then return 'exhausted'; end if;
  update public.generation_matches set active_key=p_key, lease_token=p_token,
    lease_until=clock_timestamp()+interval '120 seconds',
    attempts=jsonb_set(attempts, array[p_key], to_jsonb(n+1)), updated_at=now()
    where user_id=p_user and session_id=p_session;
  return 'claimed';
end;
$$;

create or replace function public.generation_finish(
  p_user uuid,
  p_session text,
  p_token uuid,
  p_response jsonb,
  p_state jsonb,
  p_unused boolean default false
)
returns boolean language plpgsql security definer set search_path = public as $$
declare r public.generation_matches;
begin
  if p_user is null or p_session is null or p_token is null then
    return false;
  end if;
  select * into r from public.generation_matches where user_id=p_user and session_id=p_session for update;
  if not found or r.lease_token is distinct from p_token or r.active_key is null
    or r.lease_until is null or r.lease_until <= clock_timestamp() then return false; end if;
  if p_response is not null and p_state is null then raise exception 'missing state'; end if;
  update public.generation_matches set
    results=case when p_response is null then results else jsonb_set(results,array[r.active_key],p_response) end,
    state=coalesce(p_state,state), revision=revision+case when p_response is null then 0 else 1 end,
    attempts=case when p_response is null and p_unused then
      jsonb_set(
        attempts,
        array[r.active_key],
        to_jsonb(greatest(0, coalesce((attempts ->> r.active_key)::int, 0) - 1))
      )
    else attempts end,
    active_key=null, lease_token=null, lease_until=null, updated_at=now()
    where user_id=p_user and session_id=p_session;
  return true;
end;
$$;

create or replace function public.generation_export()
returns table (
  session_id text,
  state jsonb,
  results jsonb,
  revision integer,
  attempts jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;
  return query
    select
      gm.session_id,
      gm.state,
      gm.results,
      gm.revision,
      gm.attempts,
      gm.created_at,
      gm.updated_at
    from public.generation_matches as gm
    where gm.user_id = v_uid
    order by gm.created_at desc;
end;
$$;

create table if not exists public.spend_reservations (
  id uuid primary key,
  ip text not null,
  day date not null,
  amount numeric(12,6) not null check (amount >= 0 and amount < 100000),
  settled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.spend_reservations enable row level security;
revoke all on public.spend_reservations from public, anon, authenticated;
grant select on public.spend_reservations to service_role;

create or replace function public.spend_reserve(p_id uuid, p_ip text, p_amount numeric, p_global_cap numeric, p_ip_cap numeric)
returns boolean language plpgsql security definer set search_path = public as $$
declare d date := (clock_timestamp() at time zone 'UTC')::date; g numeric; i numeric; a numeric;
begin
  if p_amount is null or not (p_amount > 0 and p_amount < 100000) or
    p_global_cap is null or not (p_global_cap > 0 and p_global_cap < 100000) or
    p_ip_cap is null or not (p_ip_cap > 0 and p_ip_cap < 100000) or
    p_ip is null or length(p_ip)>200 or p_id is null then raise exception 'invalid budget'; end if;
  -- All reservations and reconciliations use the same UTC-day lock, across IPs.
  perform pg_advisory_xact_lock(hashtextextended('spend:'||d::text,0));
  if exists(select 1 from public.spend_reservations where id=p_id) then
    raise exception 'duplicate reservation';
  end if;
  a := ceil(p_amount*1000000)/1000000;
  select spent_usd into g from public.spend_ledger where scope='global' and day=d;
  select spent_usd into i from public.spend_ledger where scope='ip:'||p_ip and day=d;
  if coalesce(g,0)+a > p_global_cap or coalesce(i,0)+a > p_ip_cap then return false; end if;
  insert into public.spend_reservations(id,ip,day,amount) values(p_id,p_ip,d,a);
  insert into public.spend_ledger(scope,day,spent_usd) values ('global',d,a),('ip:'||p_ip,d,a)
    on conflict(scope,day) do update set spent_usd=public.spend_ledger.spent_usd+excluded.spent_usd,updated_at=now();
  return true;
end;
$$;

create or replace function public.spend_settle(p_id uuid, p_actual numeric)
returns boolean language plpgsql security definer set search_path = public as $$
declare r public.spend_reservations; delta numeric;
begin
  if p_actual is null or not (p_actual >= 0 and p_actual < 100000) then raise exception 'invalid cost'; end if;
  select * into r from public.spend_reservations where id=p_id;
  if not found then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('spend:'||r.day::text,0));
  select * into r from public.spend_reservations where id=p_id for update;
  if r.settled then return true; end if;
  delta := ceil(p_actual*1000000)/1000000-r.amount;
  update public.spend_ledger set spent_usd=greatest(0,spent_usd+delta),updated_at=now()
    where day=r.day and scope in ('global','ip:'||r.ip);
  update public.spend_reservations set amount=ceil(p_actual*1000000)/1000000,settled=true where id=p_id;
  return true;
end;
$$;

revoke all on function public.generation_claim(uuid,text,int,text,uuid) from public,anon,authenticated;
revoke all on function public.generation_finish(uuid,text,uuid,jsonb,jsonb,boolean) from public,anon,authenticated;
revoke all on function public.generation_export() from public,anon;
revoke all on function public.spend_reserve(uuid,text,numeric,numeric,numeric) from public,anon,authenticated;
revoke all on function public.spend_settle(uuid,numeric) from public,anon,authenticated;
grant execute on function public.generation_claim(uuid,text,int,text,uuid) to service_role;
grant execute on function public.generation_finish(uuid,text,uuid,jsonb,jsonb,boolean) to service_role;
grant execute on function public.generation_export() to authenticated;
grant execute on function public.spend_reserve(uuid,text,numeric,numeric,numeric) to service_role;
grant execute on function public.spend_settle(uuid,numeric) to service_role;
