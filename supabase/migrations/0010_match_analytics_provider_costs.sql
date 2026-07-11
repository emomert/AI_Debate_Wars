-- Debator — per-provider (per-API-key) cost split on the analytics card.
--
-- match_cost is one total, which can't answer "how much did each API key
-- bill?". These columns attribute the match's cost to the backend that billed
-- it, computed SERVER-SIDE at verdict time from the per-message costs:
--   cost_openai / cost_deepseek / cost_openrouter — model inference per key
--   cost_search                                   — Brave web-search fees
-- Old rows keep 0 (unknown); the dashboard labels provider costs accordingly.
-- Additive + idempotent → safe to re-run.

alter table public.match_analytics
  add column if not exists cost_openai     numeric(12, 6) not null default 0,
  add column if not exists cost_deepseek   numeric(12, 6) not null default 0,
  add column if not exists cost_openrouter numeric(12, 6) not null default 0,
  add column if not exists cost_search     numeric(12, 6) not null default 0;
