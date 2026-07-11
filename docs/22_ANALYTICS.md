# Analytics & Admin Dashboard

## What's recorded (and what isn't)

At verdict time (the match-finalize point — the judge is mandatory), the server
writes ONE flat "card" per match to `public.match_analytics`. It stores
**dimensions only** — never content:

- **Stored:** mode, round count, battle count, deep-debate flag, tone *preset*
  name, response length, pace, language, both fighter model **ids**, judge mode,
  resolved judge model id, winner, scores, match cost, verdict cost, an optional
  `user_id` (set-null on account deletion), the timestamp, and — since migration
  0010 — the match's cost **attributed per billed API key**
  (`cost_openai` / `cost_deepseek` / `cost_openrouter` / `cost_search` for Brave
  fees), computed server-side from the per-message costs. Rows recorded before
  0010 carry 0 in the per-key columns.
- **Never stored:** the topic text, any message/transcript text, or the custom-
  tone wording. This is enforced by `matchCard.test.ts`.

Each battle in a multi-battle match writes its own card, so match counts are
per-battle, not per match-set.

The user's own full-session history (`matches`, client-saved, RLS-locked to the
owner) is a separate feature and is unchanged.

## How it's protected

`match_analytics` has RLS on with **no policies** → anon/authenticated get zero
direct access. Only the **service-role key** (`SUPABASE_SERVICE_ROLE_KEY`,
server-only) reads/writes it — used by the server writer (`recordMatchAnalytics`)
and the admin route. The writer is best-effort and never fails a verdict;
analytics is simply OFF if the service-role key isn't set.

## Admin access

The dashboard lives at `/admin`. There is no password and no admin role in the
DB — access is granted to the Supabase user ids listed in `ADMIN_USER_IDS`
(comma-separated). Sign in as that account; everyone else gets a 404 on both
`/admin` and `/api/admin/analytics`. Find your user id in the Supabase dashboard
(Authentication → Users) or from `auth.getUser()` while signed in.

## The dashboard

`/admin` is an interactive, owner-only "mission control" (deliberately not the
arcade design system). The API returns the RAW cards (newest first, capped at
20k; a banner appears if capped) and everything else happens client-side, so
every interaction is instant:

- **Time range** picker (24h / 7d / 30d / 90d / All).
- **Click-to-filter**: clicking a row in any breakdown (fighter, judge, judge
  selection, winner side, tone, length, language) filters the entire dashboard;
  active filters show as removable chips.
- **Spend by API key**: totals + share per key (OpenAI, DeepSeek, OpenRouter,
  Brave search) and a stacked per-day spend chart (hover for exact figures).
- **Matches per day** chart, most-used fighters, most-winning models, and a
  recent-matches table (time, pairing, judge, winner, cost).

## Known limitation

Because the debate engine is stateless, the card is built from the client-
submitted session, so a fabricated match could produce a fabricated card
(bounded by the rate/spend caps). Costs are server-computed per turn so cost
figures are accurate; categorical dimensions reflect what the client claimed.
