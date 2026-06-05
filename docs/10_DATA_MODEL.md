# 10 — Data Model

## MVP State

MVP can use local client state.

No database is required for first prototype.

However, data structures should be designed so persistence can be added later.

## Core Entities

### DebateSession

```ts
export interface DebateSession {
  id: string;
  topic: string;
  mode: "debate" | "discussion";
  tone: DebateTone;
  responseLength: "short" | "medium" | "long";
  roundCount: 3 | 5 | 7;
  judge: JudgeConfig;
  modelA: SelectedModel;
  modelB: SelectedModel;
  turns: DebateTurn[];
  messages: DebateMessage[];
  verdict?: DebateVerdict;
  costSummary: SessionCostSummary;
  status: "setup" | "running" | "judging" | "complete" | "stopped" | "error";
  createdAt: string;
  updatedAt: string;
}
```

### SelectedModel

```ts
export interface SelectedModel {
  providerId: string;
  modelId: string;
  displayName: string;
  nickname: string;
  color: "blue" | "red" | "yellow" | "purple";
}
```

### DebateTurn

```ts
export interface DebateTurn {
  id: string;
  roundNumber: number;
  roundLabel: string;
  speaker: "modelA" | "modelB" | "judge";
  task: string;
  role: string;
  stance?: "pro" | "against";
  modelId: string;
  status: "pending" | "streaming" | "complete" | "error";
}
```

### DebateMessage

```ts
export interface DebateMessage {
  id: string;
  sessionId: string;
  turnId: string;
  speaker: "modelA" | "modelB" | "judge";
  providerId: string;
  modelId: string;
  role: string;
  stance?: "pro" | "against";
  roundNumber?: number;
  roundLabel?: string;
  content: string;
  usage?: TokenUsage;
  cost?: CostBreakdown;
  latencyMs?: number;
  status: "streaming" | "complete" | "error";
  createdAt: string;
}
```

## Future Database Tables

### users

- id
- email
- created_at
- plan
- monthly_quota_usd
- monthly_used_usd

### debate_sessions

- id
- user_id
- topic
- mode
- tone
- response_length
- round_count
- judge_config_json
- model_a_json
- model_b_json
- status
- total_cost
- total_tokens
- created_at
- updated_at

### debate_messages

- id
- session_id
- turn_id
- speaker
- provider_id
- model_id
- role
- stance
- round_number
- round_label
- content
- input_tokens
- output_tokens
- total_tokens
- total_cost
- latency_ms
- status
- created_at

### debate_verdicts

- id
- session_id
- judge_provider_id
- judge_model_id
- content
- winner
- summary
- strongest_model_a
- strongest_model_b
- weakest_model_a
- weakest_model_b
- practical_conclusion
- total_cost
- created_at

### model_usage_events

- id
- user_id
- session_id
- provider_id
- model_id
- input_tokens
- output_tokens
- total_tokens
- total_cost
- created_at

## Data Model Acceptance Criteria

The data model is acceptable if:

- MVP can run locally
- future persistence is straightforward
- each message can store usage and cost
- verdict is separate from normal messages
- session status is explicit
