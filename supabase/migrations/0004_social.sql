-- Debator — community hub: profiles, shared matches, side-votes, comments.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run (idempotent).
--
-- Design notes:
--  * shared_matches stores a SANITIZED snapshot built server-side at publish
--    time — hidden model names / excluded verdicts are stripped before the row
--    is written, so RLS never has to hide individual columns and nothing can
--    leak to a crafted client.
--  * visibility 'unlisted' rows are NOT selectable through the normal RLS path
--    (only 'public' rows and your own). Anyone holding the link reads them via
--    the get_shared_match() SECURITY DEFINER function — knowing the random id
--    IS the capability, but the table can never be enumerated for them.
--  * Votes/comments write through SECURITY DEFINER functions so the public
--    tally counters on shared_matches update atomically and unlisted posts can
--    be voted/commented on without a permissive select policy.

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  -- null until the user picks a handle; UI shows "Anonymous Fighter".
  username    text,
  -- preset emoji avatar key; the app validates against its allowlist.
  avatar      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_format') then
    alter table public.profiles
      add constraint profiles_username_format
      check (username is null or username ~ '^[a-z0-9_]{3,20}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_len') then
    alter table public.profiles
      add constraint profiles_avatar_len check (avatar is null or char_length(avatar) <= 8);
  end if;
end $$;

-- Case-insensitive uniqueness for handles.
create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username)) where username is not null;

alter table public.profiles enable row level security;

-- Usernames/avatars are public identity (shown on posts + comments).
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Shared matches (community posts) ────────────────────────────────────────
create table if not exists public.shared_matches (
  -- short random slug generated server-side (the /m/<id> URL).
  id              text primary key,
  owner_id        uuid not null references public.profiles (user_id) on delete cascade,
  -- the client DebateSession.id — republishing the same match UPDATES the
  -- existing post instead of duplicating it.
  app_session_id  text not null,
  topic           text not null,
  visibility      text not null default 'public',
  show_models     boolean not null default true,
  include_verdict boolean not null default true,
  -- display names; NULL when show_models is false (never stored at all).
  model_a         text,
  model_b         text,
  -- verdict winner; NULL when include_verdict is false (never stored at all).
  winner          text,
  round_count     int not null,
  deep_debate     boolean not null default false,
  -- sanitized SharedSnapshot (see src/lib/community/types.ts).
  snapshot        jsonb not null,
  -- denormalized tallies, maintained ONLY by the functions/triggers below.
  vote_a          int not null default 0,
  vote_b          int not null default 0,
  vote_tie        int not null default 0,
  vote_count      int not null default 0,
  comment_count   int not null default 0,
  created_at      timestamptz not null default now(),
  unique (owner_id, app_session_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shared_matches_id_format') then
    alter table public.shared_matches
      add constraint shared_matches_id_format check (id ~ '^[A-Za-z0-9_-]{8,24}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shared_matches_visibility_chk') then
    alter table public.shared_matches
      add constraint shared_matches_visibility_chk check (visibility in ('public', 'unlisted'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shared_matches_winner_chk') then
    alter table public.shared_matches
      add constraint shared_matches_winner_chk
      check (winner is null or winner in ('modelA', 'modelB', 'tie', 'not_applicable'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shared_matches_rounds_chk') then
    alter table public.shared_matches
      add constraint shared_matches_rounds_chk check (round_count in (3, 5, 7));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shared_matches_topic_len') then
    alter table public.shared_matches
      add constraint shared_matches_topic_len check (char_length(topic) <= 1000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shared_matches_snapshot_size') then
    alter table public.shared_matches
      add constraint shared_matches_snapshot_size check (pg_column_size(snapshot) < 400000);
  end if;
end $$;

create index if not exists shared_matches_public_recent_idx
  on public.shared_matches (created_at desc) where visibility = 'public';
create index if not exists shared_matches_public_top_idx
  on public.shared_matches (vote_count desc, created_at desc) where visibility = 'public';
create index if not exists shared_matches_owner_idx
  on public.shared_matches (owner_id, created_at desc);

alter table public.shared_matches enable row level security;

-- Public posts are readable by everyone; unlisted posts only by their owner
-- through this path (everyone else uses get_shared_match with the link's id).
drop policy if exists "shared_matches_select" on public.shared_matches;
create policy "shared_matches_select" on public.shared_matches
  for select using (visibility = 'public' or auth.uid() = owner_id);

drop policy if exists "shared_matches_insert_own" on public.shared_matches;
create policy "shared_matches_insert_own" on public.shared_matches
  for insert with check (auth.uid() = owner_id);

drop policy if exists "shared_matches_update_own" on public.shared_matches;
create policy "shared_matches_update_own" on public.shared_matches
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "shared_matches_delete_own" on public.shared_matches;
create policy "shared_matches_delete_own" on public.shared_matches
  for delete using (auth.uid() = owner_id);

-- Fetch one post by exact id regardless of visibility (the share-link path).
create or replace function public.get_shared_match(p_id text)
returns setof public.shared_matches
  language sql
  security definer
  set search_path = public
  stable
as $$
  select * from public.shared_matches where id = p_id;
$$;

-- ── Side votes (who won?) ────────────────────────────────────────────────────
create table if not exists public.shared_match_votes (
  post_id     text not null references public.shared_matches (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  choice      text not null,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shared_match_votes_choice_chk') then
    alter table public.shared_match_votes
      add constraint shared_match_votes_choice_chk check (choice in ('a', 'b', 'tie'));
  end if;
end $$;

alter table public.shared_match_votes enable row level security;

-- A user may read their own vote (to highlight their pick). All writes go
-- through cast_vote() so the tally counters stay consistent.
drop policy if exists "votes_select_own" on public.shared_match_votes;
create policy "votes_select_own" on public.shared_match_votes
  for select using (auth.uid() = user_id);

-- Cast or change a side-vote; returns the post's fresh tallies.
create or replace function public.cast_vote(p_post_id text, p_choice text)
returns table (vote_a int, vote_b int, vote_tie int, vote_count int)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_old text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_choice not in ('a', 'b', 'tie') then
    raise exception 'INVALID_CHOICE';
  end if;

  -- Serialize concurrent votes on the same post so the counters stay exact.
  perform 1 from public.shared_matches where id = p_post_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  select v.choice into v_old
    from public.shared_match_votes v
    where v.post_id = p_post_id and v.user_id = v_uid;

  if v_old is null then
    insert into public.shared_match_votes (post_id, user_id, choice)
      values (p_post_id, v_uid, p_choice);
  elsif v_old <> p_choice then
    update public.shared_match_votes
      set choice = p_choice, created_at = now()
      where post_id = p_post_id and user_id = v_uid;
  end if;

  update public.shared_matches m set
    vote_a   = m.vote_a   + (p_choice = 'a')::int   - coalesce((v_old = 'a')::int, 0),
    vote_b   = m.vote_b   + (p_choice = 'b')::int   - coalesce((v_old = 'b')::int, 0),
    vote_tie = m.vote_tie + (p_choice = 'tie')::int - coalesce((v_old = 'tie')::int, 0),
    vote_count = m.vote_count + (v_old is null)::int
    where m.id = p_post_id;

  return query
    select m.vote_a, m.vote_b, m.vote_tie, m.vote_count
      from public.shared_matches m where m.id = p_post_id;
end;
$$;

-- ── Comments ─────────────────────────────────────────────────────────────────
create table if not exists public.shared_match_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     text not null references public.shared_matches (id) on delete cascade,
  user_id     uuid not null references public.profiles (user_id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shared_match_comments_body_len') then
    alter table public.shared_match_comments
      add constraint shared_match_comments_body_len
      check (char_length(body) between 1 and 500);
  end if;
end $$;

create index if not exists shared_match_comments_post_idx
  on public.shared_match_comments (post_id, created_at);

alter table public.shared_match_comments enable row level security;

-- Reads go through get_shared_comments() (works for unlisted posts too);
-- inserts go through add_comment(); deletes use RLS (author or post owner).
drop policy if exists "comments_delete_own_or_post_owner" on public.shared_match_comments;
create policy "comments_delete_own_or_post_owner" on public.shared_match_comments
  for delete using (
    auth.uid() = user_id
    or auth.uid() = (select m.owner_id from public.shared_matches m where m.id = post_id)
  );

-- Keep comment_count exact on insert AND delete (incl. RLS deletes above).
create or replace function public.bump_comment_count()
returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.shared_matches set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  end if;
  update public.shared_matches
    set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists shared_match_comments_count on public.shared_match_comments;
create trigger shared_match_comments_count
  after insert or delete on public.shared_match_comments
  for each row execute function public.bump_comment_count();

-- Add a comment (auth required; post must exist — incl. unlisted ones).
create or replace function public.add_comment(p_post_id text, p_body text)
returns table (id uuid, created_at timestamptz)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_body text := trim(coalesce(p_body, ''));
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 500 then
    raise exception 'INVALID_BODY';
  end if;
  if not exists (select 1 from public.shared_matches m where m.id = p_post_id) then
    raise exception 'NOT_FOUND';
  end if;
  -- Commenting needs a profile row (the identity shown next to the comment).
  insert into public.profiles (user_id) values (v_uid) on conflict do nothing;

  return query
    insert into public.shared_match_comments (post_id, user_id, body)
      values (p_post_id, v_uid, v_body)
      returning shared_match_comments.id, shared_match_comments.created_at;
end;
$$;

-- List a post's comments with author identity (works for unlisted posts).
create or replace function public.get_shared_comments(p_post_id text)
returns table (
  id uuid,
  user_id uuid,
  body text,
  created_at timestamptz,
  username text,
  avatar text
)
  language sql
  security definer
  set search_path = public
  stable
as $$
  select c.id, c.user_id, c.body, c.created_at, p.username, p.avatar
    from public.shared_match_comments c
    left join public.profiles p on p.user_id = c.user_id
    where c.post_id = p_post_id
    order by c.created_at asc
    limit 200;
$$;

-- ── Grants ───────────────────────────────────────────────────────────────────
grant execute on function public.get_shared_match(text) to anon, authenticated;
grant execute on function public.get_shared_comments(text) to anon, authenticated;
grant execute on function public.cast_vote(text, text) to authenticated;
grant execute on function public.add_comment(text, text) to authenticated;
