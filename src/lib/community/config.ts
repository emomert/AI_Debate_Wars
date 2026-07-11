/**
 * Community feature flags.
 *
 * VOTING_ENABLED — crowd side-voting on shared matches ("Who won this one?").
 * Hidden per owner decision (July 2026): the vote widget on /m/[id], the
 * feed/profile vote counts and the "Top" sort all stop rendering. The vote API
 * route, DB columns and VoteWidget component stay intact — flip back to true
 * to restore (same hide-behind-a-flag pattern as BLITZ / VOICE / COST_UI).
 */
export const VOTING_ENABLED = false;
