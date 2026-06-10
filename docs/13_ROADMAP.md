# 13 — Roadmap

> Updated 2026-06-10. The original MVP and most of V1 have shipped. Detailed
> launch requirements live in `docs/18_RELEASE_REQUIREMENTS.md`.

## Shipped

- Full arcade UI (home, setup, arena, result) — mobile responsive, sound + music
- Debate Mode with deterministic 3/5/7-round plans (Discussion Mode shipped, later removed from UI)
- Three providers behind one interface: OpenAI, DeepSeek, OpenRouter (56+ models, free tier included)
- Judge Mode: auto neutral judge or third model, blind decisive verdicts, re-judge from result
- Deep Debate: web-search-grounded turns with citations (unified Brave search; hybrid OpenRouter `:online` mode)
- AI topic check/improve
- Cache-aware cost tracking with verified pricing; per-message and session totals
- Stateless share links with generated OG images
- Supabase auth (magic link + Google), match history + stats, match delete
- Per-IP rate limits + global/per-IP daily spend caps
- Legal pages (about, privacy, terms); living tech report (`/report`)
- Turkish localization (built, hidden behind `MULTILOCALE_ENABLED`)

## Next — Public Launch (see docs/18)

- Vercel Pro (Hobby prohibits commercial use; also raises `maxDuration`)
- Provider dashboard spending caps (owner task)
- Server-side session persistence / anti-forgery validation
- Topic moderation pass before matches
- Audio license confirmation; custom domain; error monitoring; CI

## Then — Monetization (see docs/18 Tier 2)

- Pick the model: freemium subscriptions (recommended), ads, and/or bring-your-own-key
- Stripe billing + quota gating mapped onto the existing FREE/$/$$/$$$ cost tiers

## Later Ideas

- Turkish launch (flip `MULTILOCALE_ENABLED`)
- Public debate gallery, leaderboards, community voting
- Debate templates, custom roles, rematch/swap-sides shortcuts
- Tournaments, classroom mode, export to markdown/PDF
- More providers (Anthropic, Google) — the provider layer already supports adding them without rewrites
