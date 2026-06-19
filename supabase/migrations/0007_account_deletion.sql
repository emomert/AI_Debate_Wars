-- Debator — self-serve account deletion (GDPR Art. 17 / CCPA right to erasure).
--
-- delete_my_account() removes the CALLER's auth.users row; the on-delete-cascade
-- FKs then wipe their profile, matches, shared matches, votes and comments
-- (reports keep a NULL reporter via on delete set null). SECURITY DEFINER so it
-- runs with the privilege to delete from auth.users, but it ONLY ever deletes
-- auth.uid() — the caller — so one user can never remove another's account.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run (idempotent).

create or replace function public.delete_my_account()
returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  -- Cascades to public.profiles, public.matches, public.shared_matches (and its
  -- votes/comments) via their on-delete-cascade FKs to auth.users / profiles.
  delete from auth.users where id = v_uid;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;
