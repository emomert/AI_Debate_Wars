# Analytics & Admin Dashboard

## What's recorded (and what isn't)

At verdict time (the match-finalize point — the judge is mandatory), the server
writes ONE flat "card" per match to `public.match_analytics`. It stores
**dimensions only** — never content:

- **Stored:** mode, round count, battle count, deep-debate flag, tone *preset*
  name, response length, pace, language, both fighter model **ids**, judge mode,
  resolved judge model id, winner, scores, match cost, verdict cost, an optional
  `user_id` (set-null on account deletion), and the timestamp.
- **Never stored:** the topic text, any message/transcript text, or the custom-
  tone wording. This is enforced by `matchCard.test.ts`.

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

## Known limitation

Because the debate engine is stateless, the card is built from the client-
submitted session, so a fabricated match could produce a fabricated card
(bounded by the rate/spend caps). Costs are server-computed per turn so cost
figures are accurate; categorical dimensions reflect what the client claimed.
