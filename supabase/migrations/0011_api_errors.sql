-- Debator — API error log for the owner dashboard (spot recurring failures,
-- e.g. a model that keeps timing out). Written SERVER-SIDE (service-role) from
-- the API routes' error paths; dimensions + normalized error info only — no
-- topics, no transcripts, no prompts. RLS on with NO policies = deny-all direct
-- access (same lock as match_analytics). Additive + idempotent → safe to re-run.

create table if not exists public.api_errors (
  id          uuid primary key default gen_random_uuid(),
  route       text not null,           -- turn | verdict | topic | tts
  code        text not null,           -- normalized AppErrorCode
  message     text not null default '',-- truncated, server-generated text
  model_id    text,                    -- model being called, when known
  provider    text,                    -- backend that billed the call, when known
  status      int,                     -- HTTP status returned to the client
  created_at  timestamptz not null default now()
);

create index if not exists api_errors_created_idx
  on public.api_errors (created_at desc);

alter table public.api_errors enable row level security;
-- No policies on purpose → only the service-role key may read/write.
