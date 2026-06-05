/**
 * Deterministic round plans (docs/04_DEBATE_ENGINE.md).
 *
 * These tables ARE the debate structure. The app — never a model — decides what
 * each round is about and who speaks. Speaker order within a round is always
 * Model A then Model B. The same plans are used by the Phase 1 mock debate and,
 * later, by the real Phase 2 orchestrator.
 */

import type {
  DebateMode,
  RoundCount,
  RoundPlanEntry,
} from "@/lib/debate/debateTypes";

const DEBATE_3: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Opening Arguments",
    modelATask: "Present the strongest case for the topic.",
    modelBTask: "Present the strongest case against the topic.",
  },
  {
    round: 2,
    label: "Rebuttals",
    modelATask: "Directly respond to Model B's opening.",
    modelBTask: "Directly respond to Model A's opening.",
  },
  {
    round: 3,
    label: "Final Defense",
    modelATask: "Give final defense and address the strongest objection.",
    modelBTask: "Give final defense and address the strongest objection.",
  },
];

const DEBATE_5: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Opening Arguments",
    modelATask: "Present the strongest case for the topic.",
    modelBTask: "Present the strongest case against the topic.",
  },
  {
    round: 2,
    label: "Rebuttals",
    modelATask: "Challenge Model B's core claim.",
    modelBTask: "Challenge Model A's core claim.",
  },
  {
    round: 3,
    label: "Counter-Rebuttals",
    modelATask: "Defend your position against the rebuttal.",
    modelBTask: "Defend your position against the rebuttal.",
  },
  {
    round: 4,
    label: "Practical Examples",
    modelATask: "Use concrete examples or consequences to support your side.",
    modelBTask: "Use concrete examples or consequences to support your side.",
  },
  {
    round: 5,
    label: "Final Statements",
    modelATask: "Give final concise argument for why your side is stronger.",
    modelBTask: "Give final concise argument for why your side is stronger.",
  },
];

const DEBATE_7: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Opening Arguments",
    modelATask: "Present the strongest case for the topic.",
    modelBTask: "Present the strongest case against the topic.",
  },
  {
    round: 2,
    label: "Rebuttals",
    modelATask: "Challenge Model B's core claim.",
    modelBTask: "Challenge Model A's core claim.",
  },
  {
    round: 3,
    label: "Counter-Rebuttals",
    modelATask: "Defend your position against the rebuttal.",
    modelBTask: "Defend your position against the rebuttal.",
  },
  {
    round: 4,
    label: "Evidence & Examples",
    modelATask: "Provide examples, logic, or evidence.",
    modelBTask: "Provide examples, logic, or evidence.",
  },
  {
    round: 5,
    label: "Attack Strongest Point",
    modelATask: "Attack the strongest point made by the opponent.",
    modelBTask: "Attack the strongest point made by the opponent.",
  },
  {
    round: 6,
    label: "Defend Weakest Point",
    modelATask: "Acknowledge and defend your side's weakest point.",
    modelBTask: "Acknowledge and defend your side's weakest point.",
  },
  {
    round: 7,
    label: "Final Statements",
    modelATask: "Close with the strongest version of your argument.",
    modelBTask: "Close with the strongest version of your argument.",
  },
];

const DISCUSSION_3: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Build & Critique",
    modelATask: "Improve the idea and make it more practical.",
    modelBTask: "Identify major weaknesses, risks, and blind spots.",
  },
  {
    round: 2,
    label: "Solutions & Stress Test",
    modelATask: "Respond with solutions to the weaknesses.",
    modelBTask: "Stress-test those solutions.",
  },
  {
    round: 3,
    label: "Final Version & Risks",
    modelATask: "Present the improved final version.",
    modelBTask: "Present final risks and recommendations.",
  },
];

const DISCUSSION_5: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Initial Build",
    modelATask: "Improve and clarify the idea.",
    modelBTask: "Identify weaknesses and hidden assumptions.",
  },
  {
    round: 2,
    label: "Market / Context Fit",
    modelATask: "Explain why this could work in the target context.",
    modelBTask: "Challenge market fit and feasibility.",
  },
  {
    round: 3,
    label: "Execution Plan",
    modelATask: "Propose practical execution steps.",
    modelBTask: "Identify operational risks.",
  },
  {
    round: 4,
    label: "Refinement",
    modelATask: "Refine based on criticism.",
    modelBTask: "Stress-test the refined version.",
  },
  {
    round: 5,
    label: "Final Recommendation",
    modelATask: "Give the best version of the idea.",
    modelBTask: "Give final risks and must-fix issues.",
  },
];

const DISCUSSION_7: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Initial Build",
    modelATask: "Improve and clarify the idea.",
    modelBTask: "Identify weaknesses and hidden assumptions.",
  },
  {
    round: 2,
    label: "User / Audience",
    modelATask: "Define target users and value proposition.",
    modelBTask: "Challenge user need and willingness to pay.",
  },
  {
    round: 3,
    label: "Market / Context",
    modelATask: "Explain market opportunity.",
    modelBTask: "Challenge market size and competition.",
  },
  {
    round: 4,
    label: "Product / Execution",
    modelATask: "Propose MVP and execution plan.",
    modelBTask: "Identify technical and operational risks.",
  },
  {
    round: 5,
    label: "Business Model",
    modelATask: "Propose monetization and growth.",
    modelBTask: "Challenge economics and scalability.",
  },
  {
    round: 6,
    label: "Risk Response",
    modelATask: "Respond to major risks.",
    modelBTask: "Stress-test the responses.",
  },
  {
    round: 7,
    label: "Final Recommendation",
    modelATask: "Give the best version and next steps.",
    modelBTask: "Give final risks and decision recommendation.",
  },
];

const PLANS: Record<DebateMode, Record<RoundCount, RoundPlanEntry[]>> = {
  debate: { 3: DEBATE_3, 5: DEBATE_5, 7: DEBATE_7 },
  discussion: { 3: DISCUSSION_3, 5: DISCUSSION_5, 7: DISCUSSION_7 },
};

export function getRoundPlan(
  mode: DebateMode,
  roundCount: RoundCount,
): RoundPlanEntry[] {
  return PLANS[mode][roundCount];
}
