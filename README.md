# AI Debate Arena

Debator (AI Debate Arena) is an arcade-style Next.js app where users pick a topic, choose two real AI fighters, and watch a fixed-length debate with a mandatory judge. Costs are tracked internally; the cost UI is currently hidden.

The current launch shape is:

- English-only UI
- Debate Mode only
- fixed 3-round matches
- short responses only
- mandatory judge in every match
- real providers: OpenAI, DeepSeek, OpenRouter
- recorded demo video on the home page

Coin prices retain the original 1/2/4/8/12/20 scale. Auto judging is free, Deep Debate adds 2 coins, and the daily allowance and pack offers are unchanged. Provider cost estimates do not automatically change customer prices; see [Coin Economy](docs/23_COINS.md).

## Quick Start

```bash
npm ci
npm run dev
```

Use Node 24.x to match production on Vercel.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run typecheck`
- `npm run test`

`npm run lint` runs ESLint noninteractively. GitHub Actions runs locked installation, lint, typecheck, tests and build on Node 24.

## Environment

Start from [.env.example](./.env.example) and keep your local secrets in `.env.local`.

Required or commonly used variables:

- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `OPENROUTER_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COIN_CHARGE_SECRET`
- `NEXT_PUBLIC_PAYMENTS_ENABLED`
- `POLAR_ACCESS_TOKEN`
- `POLAR_WEBHOOK_SECRET`
- `POLAR_PRODUCT_100`
- `POLAR_PRODUCT_250`
- `POLAR_PRODUCT_700`

Production matches require Supabase and a signed-in user even with coins disabled. With coins enabled (the default), charges also require signing. Apply migration 0015 before releasing this version. `SUPABASE_SERVICE_ROLE_KEY` signs charges and enables distributed rate limits/admin analytics; `COIN_CHARGE_SECRET` is an optional signing override. Payments require the Polar variables including `POLAR_SERVER`, plus `NEXT_PUBLIC_PAYMENTS_ENABLED=true`. These flags do not verify checkout or webhook delivery by themselves.

## Current Behavior

- Fighters come from the live model catalog in [`src/lib/models/modelRegistry.ts`](./src/lib/models/modelRegistry.ts).
- Pricing comes from [`src/lib/cost/pricing.ts`](./src/lib/cost/pricing.ts).
- The server owns round order, transcripts and fixed price quotes; repeated requests return saved answers. Budgets are reserved before each paid attempt. Old saved sessions remain readable, but sessions without a server record cannot generate further turns or verdicts.
- To run local debates without Supabase, explicitly set `NEXT_PUBLIC_COINS_ENABLED=false`, supply at least one provider API key, and restart/rebuild. There are no mock fighters.
- Migrations are not applied automatically; run them manually when needed.

## Deployment Notes

- The git remote stays connected after a folder move as long as the `.git` directory is present.
- A missing local `.vercel` directory only affects Vercel CLI linking and deploy commands.
- Run scripts from the repository root. The demo helpers use relative paths and additionally require installed Chrome and `ffmpeg` on PATH.

The migration runner now tracks versions and checksums and applies pending files only. Production was baselined through 0014 and migration 0015 was applied on September 8, 2026. Start with `node scripts/apply-migrations.mjs --status`; the one-time baseline command is only for an existing installation without a migration ledger. Follow [the release procedure](docs/27_AUDIT_FIXES_2026-09-08.md); a folder move does not require replaying SQL.

## Demo

The home page uses a recorded match video at [`public/demo/demo-match.mp4`](./public/demo/demo-match.mp4).
Regeneration helpers live in [`scripts/record-demo.mjs`](./scripts/record-demo.mjs) and [`scripts/edit-demo.mjs`](./scripts/edit-demo.mjs).

## Docs

- [September audit fixes and release procedure](./docs/27_AUDIT_FIXES_2026-09-08.md)

- [AGENTS.md — repository instructions](./AGENTS.md)
- [docs/07_PROVIDER_INTEGRATION.md](./docs/07_PROVIDER_INTEGRATION.md)
- [docs/08_COST_TRACKING.md](./docs/08_COST_TRACKING.md)
- [docs/18_RELEASE_REQUIREMENTS.md](./docs/18_RELEASE_REQUIREMENTS.md)
- [docs/23_COINS.md](./docs/23_COINS.md)
- [docs/26_PROJECT_AUDIT_2026-09-08.md](./docs/26_PROJECT_AUDIT_2026-09-08.md)
