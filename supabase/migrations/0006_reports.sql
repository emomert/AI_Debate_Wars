-- Debator — content reports + moderation (P0-8, DSA Art. 16 notice-and-action).
-- Any signed-in user can flag a published match OR a comment for review; the
-- reports table is locked (RLS on, no policies = deny-all direct access) and the
-- only writer is the add_report() SECURITY DEFINER RPC. Operators review and
-- remove flagged content with the admin takedown script
-- (scripts/admin-takedown.mjs) over the direct DB connection.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run (idempotent).

create table if not exists public.shared_match_reports (
  id           uuid primary key default gen_random_uuid(),
  post_id      text not null references public.shared_matches (id) on delete cascade,
  -- NULL for a match-level report; set to flag a specific comment.
  comment_id   uuid references public.shared_match_comments (id) on delete cascade,
  -- keep the report if the reporter later deletes their account.
  reporter_id  uuid references auth.users (id) on delete set null,
  reason       text not null,
  status       text not null default 'open',
  created_at   timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shared_match_reports_reason_len') then
    alter table public.shared_match_reports
      add constraint shared_match_reports_reason_len check (char_length(reason) between 1 and 500);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shared_match_reports_status_chk') then
    alter table public.shared_match_reports
      add constraint shared_match_reports_status_chk
      check (status in ('open', 'reviewed', 'actioned', 'dismissed'));
  end if;
end $$;

-- One report per user per target. A NULL comment_id collapses to a sentinel so
-- duplicate MATCH-level reports are also de-duped — stops one user inflating the
-- review queue.
create unique index if not exists shared_match_reports_unique_idx
  on public.shared_match_reports (
    post_id,
    coalesce(comment_id, '00000000-0000-0000-0000-000000000000'::uuid),
    reporter_id
  ) where reporter_id is not null;

create index if not exists shared_match_reports_open_idx
  on public.shared_match_reports (created_at desc) where status = 'open';

alter table public.shared_match_reports enable row level security;
-- No policies on purpose → direct client access denied. Only add_report() writes;
-- only the operator (direct DB connection / takedown script) reads + moderates.

-- File a report (auth required; target must exist). Idempotent per user+target.
create or replace function public.add_report(
  p_post_id text,
  p_comment_id uuid,
  p_reason text
) returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if char_length(v_reason) < 1 or char_length(v_reason) > 500 then
    raise exception 'INVALID_BODY';
  end if;
  if not exists (select 1 from public.shared_matches m where m.id = p_post_id) then
    raise exception 'NOT_FOUND';
  end if;
  -- A comment report must reference a comment that belongs to this post.
  if p_comment_id is not null
     and not exists (
       select 1 from public.shared_match_comments c
       where c.id = p_comment_id and c.post_id = p_post_id
     ) then
    raise exception 'NOT_FOUND';
  end if;

  insert into public.shared_match_reports (post_id, comment_id, reporter_id, reason)
    values (p_post_id, p_comment_id, v_uid, v_reason)
  on conflict do nothing;
end;
$$;

grant execute on function public.add_report(text, uuid, text) to authenticated;
