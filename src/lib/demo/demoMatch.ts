/**
 * The baked "See a Demo" match (docs/09). This is a REAL match, captured once
 * on 2026-07-12 through the live pipeline — DeepSeek V4 Flash (Pro) vs
 * GPT-5.4 Mini (Against) on a serious/short/3-round debate, judged blind by
 * the auto judge (GPT-4.1 Mini). Only display-relevant fields are kept; turn
 * texts are trimmed to the opening lines the demo montage actually streams.
 * Regenerate by running the same match and copying the session JSON.
 */

export interface DemoTurn {
  speaker: "A" | "B";
  round: 1 | 2 | 3;
  roundLabel: string;
  /** Opening lines of the real reply (the montage streams then fades these). */
  text: string;
}

export const DEMO_MATCH = {
  topic: "Jamie Lannister is a good person.",
  fighterA: { name: "DeepSeek V4 Flash", brand: "DeepSeek", stance: "PRO" },
  fighterB: { name: "GPT-5.4 Mini", brand: "OpenAI", stance: "AGAINST" },
  judgeName: "GPT-4.1 Mini",
  rounds: ["Opening Arguments", "Rebuttals", "Final Defense"],
  turns: [
    {
      speaker: "A",
      round: 1,
      roundLabel: "Opening Arguments",
      text: "From a purely consequentialist standpoint, Jaime Lannister’s actions save more lives than they destroy. He single-handedly ended the Mad King’s reign by killing Aerys before he could incinerate King’s Landing…",
    },
    {
      speaker: "B",
      round: 1,
      roundLabel: "Opening Arguments",
      text: "Jaime Lannister is not a good person; he is a person capable of isolated good acts. The distinction matters. Killing Aerys was not a clean moral transformation but a necessary intervention…",
    },
    {
      speaker: "A",
      round: 2,
      roundLabel: "Rebuttals",
      text: "Your critique conflates moral perfection with goodness, which is a standard few characters—or people—would meet. He leaves Cersei definitively, risks his life to save a child…",
    },
    {
      speaker: "B",
      round: 2,
      roundLabel: "Rebuttals",
      text: "Calling Jaime “good” because he performs a few costly acts mistakes redemption for character. He repeatedly chooses self-justification, loyalty to power, and personal desire…",
    },
    {
      speaker: "A",
      round: 3,
      roundLabel: "Final Defense",
      text: "Goodness is not a static trait—it is a trajectory of choices. After leaving Cersei, Jaime consistently prioritizes duty: he risks his life to save Brienne, fights the dead on the front lines…",
    },
    {
      speaker: "B",
      round: 3,
      roundLabel: "Final Defense",
      text: "A trajectory toward virtue is not the same as arriving there. His reform is real, yet it remains tethered to identity, family, and circumstance more than to settled moral principle…",
    },
  ] satisfies DemoTurn[],
  verdict: {
    winner: "A" as const,
    scoreA: 65,
    scoreB: 35,
    line: "DeepSeek V4 Flash presents a stronger case by framing goodness as a dynamic process rather than a fixed state — repeated, costly choices to prioritize others constitute genuine moral growth.",
  },
};
