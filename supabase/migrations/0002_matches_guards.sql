-- Debator — hardening guards for public.matches (docs/19).
-- Defense-in-depth on top of RLS: bound payload size + validate columns so a
-- crafted client can't store junk or huge blobs. Paste into Supabase → SQL
-- Editor → Run. Safe to re-run (each constraint is added only if missing).

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'matches_session_size') then
    alter table public.matches
      add constraint matches_session_size check (pg_column_size(session) < 1000000);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'matches_mode_chk') then
    alter table public.matches
      add constraint matches_mode_chk check (mode in ('debate', 'discussion'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'matches_rounds_chk') then
    alter table public.matches
      add constraint matches_rounds_chk check (round_count in (3, 5, 7));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'matches_winner_chk') then
    alter table public.matches
      add constraint matches_winner_chk
      check (winner is null or winner in ('modelA', 'modelB', 'tie', 'not_applicable'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'matches_topic_len') then
    alter table public.matches
      add constraint matches_topic_len check (char_length(topic) <= 1000);
  end if;
end $$;
