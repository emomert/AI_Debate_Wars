# 20 — Community Hub (social features)

The community layer lets players publish finished matches, vote on who won, and
comment — while the core debate engine stays untouched. Everything here is
**optional-Supabase**: with no Supabase configured, the publish panel, feed and
match pages degrade to friendly notices and the rest of the app works as before.

## Concepts

### Shared match (`/m/<id>`)

A **sanitized, immutable-ish snapshot** of a finished `DebateSession`, stored in
`public.shared_matches` under a short random slug. This single object powers
BOTH user stories:

- **"Share the full text"** → `visibility = 'unlisted'`: anyone with the link
  can read the whole transcript, but the post never appears in the feed and the
  table cannot be enumerated for it (see RLS below).
- **"Post to the community hub"** → `visibility = 'public'`: the same page,
  also listed on `/community`.

Publishing **copies** data out of the private session; the private `matches`
table is untouched. Deleting saved history does not affect shared posts and
vice versa (unpublish = delete the `shared_matches` row; votes/comments cascade).

Republishing the same session (same `app_session_id`) **updates** the existing
post — the `/m/` link survives.

### Sharer choices (decided at publish time, permanent)

The publish panel on `/result` offers three toggles:

| Toggle | Off means |
| --- | --- |
| Show model names | Fighters become "Fighter A / Fighter B"; avatars + colors are masked too (they identify providers); the verdict text is re-masked (the verdict route de-anonymizes names into it); a fighter that judged its own match becomes a "Mystery judge". |
| Include the AI verdict | The snapshot simply contains no verdict; the crowd judges unaided. |
| List in the community feed | `unlisted` instead of `public`. |

**Hidden stays hidden** (product decision): there is no post-vote reveal. The
sanitizer (`src/lib/community/snapshot.ts`) runs **server-side** in the publish
route, so hidden data never reaches the public table at all. Costs, token
usage, latency and provider/model ids are ALWAYS stripped.

### Votes

A vote is a **side vote** — Fighter A / Tie / Fighter B — not an upvote.
One vote per signed-in user per post (PK `(post_id, user_id)`); changing your
vote is allowed. Tallies are denormalized counters on `shared_matches`,
maintained atomically by the `cast_vote()` SECURITY DEFINER RPC (row-locked).
When the post includes an AI verdict, the match page shows crowd-vs-judge.

### Comments

Flat, 1–500 chars, newest last (capped at 200 per post). Posting requires
sign-in (`add_comment()` RPC); deleting is allowed to the comment author OR the
post owner (RLS policy). `comment_count` is kept exact by an insert/delete
trigger.

### Profiles

`public.profiles`: optional unique handle (`^[a-z0-9_]{3,20}$`, case-insensitive
unique) + a preset emoji avatar (`src/lib/community/profile.ts`, 16 presets, no
uploads). Edited on `/profile` ("Your fighter card"). Without a handle the user
appears as "Anonymous Fighter". A profile row is auto-provisioned on first
publish/comment.

## Access model (RLS + RPCs)

Migration: `supabase/migrations/0004_social.sql` (idempotent, paste-and-run).

| Action | Path | Who |
| --- | --- | --- |
| List feed | select on `shared_matches` (RLS: `visibility='public' or owner`) | anyone |
| Open a post | `get_shared_match(id)` SECURITY DEFINER (works for unlisted) | anyone with the link |
| List comments | `get_shared_comments(post_id)` SECURITY DEFINER | anyone with the link |
| Publish / update / unpublish | insert/update/delete own rows (RLS) via `/api/community/publish` + browser delete | signed-in owner |
| Vote | `cast_vote()` RPC via `/api/community/vote` | signed-in |
| Comment | `add_comment()` RPC via `/api/community/comment` | signed-in |
| Read own vote | select own row on `shared_match_votes` (RLS) | signed-in |

Why RPCs for unlisted reads: a plain `using (true)` select policy would let a
crafted client **enumerate** unlisted posts (or discover their ids through the
comments table). With the RPCs, knowing the random id IS the capability.

## API routes

All three follow the standard route conventions (readJsonBody → validate →
work → typed response; errors as `ApiErrorBody`). New error codes:
`AUTH_REQUIRED` (401), `NOT_FOUND` (404).

- `POST /api/community/publish` — `PublishMatchRequest` → `{ id, updated }`.
  Auth required; session must be `status === "complete"` with a consistent
  transcript; snapshot built and size-capped server-side (350KB soft,
  400KB DB constraint).
- `POST /api/community/vote` — `{ postId, choice: "a" | "b" | "tie" }` → fresh tally.
- `POST /api/community/comment` — `{ postId, body }` → `{ id, createdAt }`.

Rate limits (same `rl_hit` RPC machinery, docs/11): kinds `publish` / `vote` /
`comment`, env overrides `RL_PUBLISH_PER_MIN` (4), `RL_VOTE_PER_MIN` (20),
`RL_COMMENT_PER_MIN` (6). Community kinds **skip the daily spend-cap check**
(no paid provider work) — see `PAID_KINDS` in `src/lib/security/rateLimit.ts`.

## UI map

- `src/components/result/PublishPanel.tsx` — publish dialog on `/result`
  (code-split like MatchSaver; auth nudge when signed out).
- `src/app/community/page.tsx` — feed; Recent / Most voted tabs, pagination.
- `src/app/m/[id]/page.tsx` — match page; OG metadata reuses `/api/og` with a
  SharePayload built from the (already sanitized) snapshot; unlisted posts get
  `robots: noindex`.
- `src/components/community/` — `SharedTranscript`, `SharedVerdictCard`
  (cost-free siblings of the arena/result cards), `VoteWidget`,
  `CommentsSection`.
- `src/components/profile/ProfileEditor.tsx` + `UnpublishButton.tsx` — profile
  page additions ("fighter card" + "Your shared matches").
- Header: a 🏟️ Community link in `GameShell`.
- i18n: everything lives in the `community` dictionary area (en + tr).

## Invariants

- The sanitizer is the ONLY producer of snapshots, and it runs server-side.
- Tally/comment counters are written ONLY by the RPCs/trigger — never by app code.
- Community features must never break the signed-out / Supabase-less app.
