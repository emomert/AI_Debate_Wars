# 19 · Login & Profiles Plan (Supabase)

> Status: ✅ IMPLEMENTED (v1 scope shipped 2026-06; this doc is now the design
> record). Phases 1–3 are live: auth shell (email+password, magic link,
> Google + GitHub OAuth), match persistence with RLS, and the profile page
> with history + stats, plus match delete. 2026-06-11 additions: password
> sign-in/sign-up with reset flow (`/reset-password`), GitHub OAuth, and a
> skippable first-sign-in onboarding step (`/welcome`) that creates the
> fighter card (handle + avatar; Skip writes a bare profiles row so the user
> isn't re-prompted). Still open from §3 "Later": anti-forgery validation
> against stored sessions, quota gating, and data export (see
> [docs/18](18_RELEASE_REQUIREMENTS.md)).

---

## 1. Goal

Let users sign in and have a profile that shows their **past matches** and
**stats**, and persist matches server-side. Today the app is fully client-side
(sessionStorage); a refresh on another device loses everything, and the server
keeps no record of a match.

Building this also unlocks two things from docs/18:
- **Anti-forgery / cost armor** (Tier 1 §4): once matches live server-side, the
  turn/verdict routes can validate against stored records instead of trusting a
  client-supplied transcript.
- **Auto-unfurling share links** (feedback #5 phase 2): a per-match URL the
  social card can point to.

## 2. Why Supabase (chosen)

One free-tier vendor covering everything we need, so we don't stitch 3 services:
- **Auth** — email+password, email magic-link, Google + GitHub OAuth; sessions
  stored in cookies. New users without a profile are routed through `/welcome`
  (fighter-card onboarding) by `/auth/callback` (or client-side after a
  password sign-in).
- **Postgres** — match history + stats, with **Row Level Security** so a user
  can only ever read/write their own rows (enforced in the DB, not just app code).
- **Storage** (later) — if we ever host generated verdict images for unfurl.

Current correct integration (verified June 2026): **`@supabase/ssr`** +
`@supabase/supabase-js`. The older `@supabase/auth-helpers-nextjs` is deprecated —
do **not** mix them. `createBrowserClient` on the client, `createServerClient`
(cookie-based) in server components / route handlers / middleware.

## 3. Scope

### v1 (this phase)
- Sign in / sign up (magic link + Google), sign out, session in cookies.
- Header shows avatar/email + a "Profile" link when signed in; "Sign in" when not.
- **Save a match on completion** (and on a post-match re-judge) to the user's row.
- **Profile page**: list of past matches (topic, fighters, winner, cost, date) →
  click to reopen the result; plus headline stats.
- The app stays fully usable **signed-out** (matches just aren't saved) — login is
  a perk, not a gate, until monetization decides otherwise.

### Later (not now)
- Stats deep-dive / charts; quota gating for monetization; anti-forgery
  validation against stored sessions; public share links + OG unfurl; account
  deletion / data export (GDPR/KVKK — see docs/18 §5).

## 4. Data model (Postgres)

```sql
-- One row per user, mirrors auth.users (created on first sign-in via trigger).
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at  timestamptz not null default now()
);

-- One row per finished match. The full session is stored as JSONB so we don't
-- reshape the schema every time DebateSession evolves; promoted columns are for
-- cheap listing/stats without parsing the blob.
create table public.matches (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  topic         text not null,
  mode          text not null,             -- 'debate' | 'discussion'
  round_count   int  not null,
  model_a       text not null,             -- display names for listing
  model_b       text not null,
  winner        text,                      -- 'modelA'|'modelB'|'tie'|null
  total_cost    numeric(12,6) not null default 0,
  deep_debate   boolean not null default false,
  session       jsonb not null,            -- full DebateSession snapshot
  created_at    timestamptz not null default now()
);
create index matches_user_created_idx on public.matches (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.matches  enable row level security;

-- RLS: a user sees and writes ONLY their own rows.
create policy "own profile"  on public.profiles for all
  using (auth.uid() = id)       with check (auth.uid() = id);
create policy "own matches"   on public.matches  for all
  using (auth.uid() = user_id)  with check (auth.uid() = user_id);
```

Notes:
- `session jsonb` reuses the existing `DebateSession` type — minimal new mapping,
  and reopening a saved match just rehydrates it into `ArenaContext`.
- Promoted columns (`winner`, `total_cost`, `model_a/b`, …) keep the history list
  and stats fast without deserializing every blob.
- A size cap on `session` (server-side, before insert) mirrors the existing
  validator bounds so a crafted payload can't bloat the DB.

## 5. Stats (derived, v1)

Cheap aggregates over the user's `matches`, all from the promoted columns:
- Total matches, total spend, total tokens (sum), average cost/match.
- Win counts per fighter / "most-picked fighter".
- Most-debated topics / mode split (debate vs discussion).
- Deep Debate usage count.

(All computed with SQL aggregates or a small `/api` route; no heavy client work.)

## 6. Where it plugs into the existing app

- **Auth client**: `lib/supabase/client.ts` (browser) + `lib/supabase/server.ts`
  (server, cookie-based) + `middleware.ts` to refresh the session cookie. Mirrors
  the provider-abstraction rule: all DB access behind a thin module, never inline.
- **Save on complete**: `useDebateRunner`'s `onPersist`/completion already fires
  when a match finishes — add a "save to my profile" call there (signed-in only),
  via a server route handler that inserts under the user's session (RLS enforces
  ownership). The re-judge flow (`RejudgePanel`) updates the saved row.
- **Profile page**: `app/profile/page.tsx` (server component) reads the user's
  matches; a "Profile" entry joins the header nav (next to Tech Report).
- **Header**: a small auth widget (sign in / avatar menu) in `GameShell`.

## 7. Security

- `SUPABASE_SERVICE_ROLE_KEY` is **server-only** (never `NEXT_PUBLIC_`), used only
  for admin tasks if ever needed; normal reads/writes use the user's session so
  **RLS** is the real guard.
- Same standing rules as the model providers: secrets never reach the client,
  never committed. `.env.example` documents the three Supabase vars.
- Add Privacy Policy / data handling + account-deletion path before public launch
  (docs/18 §5) — storing user data raises the GDPR/KVKK bar.

## 8. Env vars

```
NEXT_PUBLIC_SUPABASE_URL=        # safe to expose
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # safe to expose (RLS protects data)
SUPABASE_SERVICE_ROLE_KEY=       # SERVER ONLY — never expose
```

## 9. Phasing & rough effort

1. **Auth shell** — packages, client/server/middleware, sign-in page, header
   widget, sign-out. (Foundation.)
2. **Persistence** — schema + RLS in Supabase, save-on-complete, reopen a match.
3. **Profile + history + stats** — list page + aggregates.
4. **(Later)** anti-forgery validation, share links, quotas, data export.

## 10. What's needed from the owner

- [ ] A free **Supabase project**, then its **URL + anon key + service-role key**
      (I'll wire them via Vercel env; I can't create the account for you).
- [ ] Which **sign-in methods**: magic-link only, or also Google / GitHub / etc.
- [ ] Confirm **login stays optional** (not a gate) for v1.
- [ ] Confirm the **data we store** (full session blob + the promoted columns) is OK.
- [ ] Note: persisting user data means we should ship the **Privacy Policy +
      delete-my-data** path around the same time (docs/18 §5).

## 11. Open questions

- Reopen a saved match read-only, or allow "rematch from history"?
- Keep client `sessionStorage` for the in-progress match and only persist on
  completion (recommended), or move live state server-side too?
- Free-tier limits (Supabase row/storage/egress) — fine for launch; revisit with
  the docs/18 scaling plan if traffic grows.

---

Sources for the integration approach: Supabase server-side auth for Next.js
(`@supabase/ssr`) — https://supabase.com/docs/guides/auth/server-side/nextjs
