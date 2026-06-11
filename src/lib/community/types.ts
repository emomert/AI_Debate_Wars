/**
 * Community hub data shapes (docs/20_COMMUNITY.md). Pure types — no Supabase
 * import — shared by the publish API route, the feed/match pages and the
 * client components, so the wire format and the stored snapshot stay in
 * lockstep.
 *
 * A SharedSnapshot is a SANITIZED copy of a DebateSession built at publish
 * time (src/lib/community/snapshot.ts). What the sharer chose to hide (model
 * names, the AI verdict) is stripped BEFORE storage — the public row simply
 * never contains it. Costs, token usage and provider/model ids are always
 * stripped: they are private to the match owner and would fingerprint hidden
 * fighters.
 */

import type {
  Citation,
  ModelColor,
  RoundCount,
  Stance,
  VerdictWinner,
} from "@/lib/debate/debateTypes";

export type SharedVisibility = "public" | "unlisted";

export type VoteChoice = "a" | "b" | "tie";

/** The sharer's choices in the publish dialog. */
export interface PublishOptions {
  visibility: SharedVisibility;
  /** Show real model names, or mask the fighters as "Fighter A/B". */
  showModels: boolean;
  /** Include the AI judge's verdict, or let the crowd decide unaided. */
  includeVerdict: boolean;
}

export interface SharedFighter {
  /** Display name; null when the sharer hid model names. */
  name: string | null;
  nickname: string | null;
  avatar: string;
  color: ModelColor;
}

export interface SharedMessage {
  speaker: "modelA" | "modelB";
  roundLabel?: string;
  stance?: Stance;
  content: string;
  citations?: Citation[];
}

export interface SharedVerdict {
  winner?: VerdictWinner;
  summary: string;
  winnerArgument?: string;
  strongestModelA?: string;
  strongestModelB?: string;
  weakestModelA?: string;
  weakestModelB?: string;
  scoreModelA?: number;
  scoreModelB?: number;
  /** Judge display name; null when naming the judge would unmask a fighter. */
  judgeName: string | null;
}

export interface SharedSnapshot {
  v: 1;
  topic: string;
  roundCount: RoundCount;
  deepDebate: boolean;
  fighters: { a: SharedFighter; b: SharedFighter };
  messages: SharedMessage[];
  /** Present only when the sharer included the AI verdict. */
  verdict?: SharedVerdict;
}

/** Tally counters shown on cards and the vote widget. */
export interface VoteTally {
  a: number;
  b: number;
  tie: number;
  total: number;
}

/** Columns selected for the feed and profile listings (NOT the snapshot). */
export const SHARED_MATCH_SUMMARY_COLUMNS =
  "id, topic, visibility, show_models, include_verdict, model_a, model_b, winner, round_count, deep_debate, vote_a, vote_b, vote_tie, vote_count, comment_count, created_at";

export interface SharedMatchSummary {
  id: string;
  topic: string;
  visibility: SharedVisibility;
  show_models: boolean;
  include_verdict: boolean;
  model_a: string | null;
  model_b: string | null;
  winner: VerdictWinner | null;
  round_count: number;
  deep_debate: boolean;
  vote_a: number;
  vote_b: number;
  vote_tie: number;
  vote_count: number;
  comment_count: number;
  created_at: string;
}

/** Feed row: summary + the author's public identity (embedded via FK). */
export interface SharedMatchFeedRow extends SharedMatchSummary {
  author: { username: string | null; avatar: string | null } | null;
}

/** Full row as returned by get_shared_match() for the /m/[id] page. */
export interface SharedMatchRecord extends SharedMatchSummary {
  owner_id: string;
  snapshot: SharedSnapshot;
}

/** One comment as returned by get_shared_comments(). */
export interface SharedComment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  username: string | null;
  avatar: string | null;
}

export interface CommunityProfile {
  user_id: string;
  username: string | null;
  avatar: string | null;
}

export function tallyOf(row: SharedMatchSummary): VoteTally {
  return { a: row.vote_a, b: row.vote_b, tie: row.vote_tie, total: row.vote_count };
}
