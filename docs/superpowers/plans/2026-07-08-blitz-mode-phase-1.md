# Blitz Mode — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a fully playable Blitz mode — a fast 8-turn debate on an animated "stage" with per-turn move splashes and an in-scene verdict — rendered on the reusable fighter *panel* (no bespoke art yet).

**Architecture:** Blitz reuses the entire existing debate pipeline (per-turn `/api/debate/turn`, judge verdict, cost, rate limits, moderation). It adds: a new `blitz` mode + `punchy` length, a fixed 4-round plan, a server-side move-tag parser, a separate `useBlitzRunner` playback hook that buffers 4 turns then streams the rest, and a new `BlitzStage` view tree (panels + dialogue box + move splash + VS intro + in-scene verdict + hidden accessible transcript). Animation is framer-motion, fully gated behind reduce-motion.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.7, Tailwind 3.4, framer-motion 11 (already a dependency), Web Audio synth (`soundManager`). Testing: **vitest** (added in Task 1) for pure logic; `tsc --noEmit` + `next build` + browser for UI.

## Global Constraints

- **App controls flow.** Models emit only bounded turn text + one move tag. The move tag is validated against a fixed enum server-side and NEVER affects who speaks / when the match ends. (spec §1)
- **Reduce-motion is mandatory.** Every animation gates behind `useReduceMotion()` (OS flag OR in-app toggle). No infinite/looping/shake animation when set; text reveals instantly. (spec §8, CLAUDE.md)
- **Blitz is 1v1 only.** No multi-battle. (spec §2)
- **Move enum is the contract; names are display-tunable.** Enum values EXACTLY: `OBJECTION`, `COUNTER`, `RECEIPTS`, `TOUCHE`, `FINISHER`. Trademark rule: never use "Ace Attorney" / "Phoenix Wright"; "HOLD IT"/"TAKE THAT" wording is banned. Characters are Debator's own originals, never providers' logos-as-faces. (spec §5, §9)
- **Match shape:** 4 rounds / 8 turns, labels `Opening Shot · Cross-Fire · Counter-Fire · Final Blow`. Auto pace only. `punchy` length = ~90 max output tokens, ≤~40 words. (spec §3, §4)
- **`punchy` is blitz-internal** — never shown in Debate mode's short/medium/long selector. (spec §11)
- **Buffer constant:** `BLITZ_BUFFER = 4`, a single named constant. (spec §6)
- **Verification workflow:** `npm run test` (new), `npx tsc --noEmit`, and `next build` before declaring any task done. UI tasks additionally verified in the browser. (CLAUDE.md)
- **English-only for launch**, but add Turkish round-plan parity behind the existing hidden `MULTILOCALE_ENABLED` pattern (spec §11). All new user-facing copy also goes through the `en` dictionary where the surrounding code does.

---

### Task 1: Add vitest test runner

**Files:**
- Modify: `package.json` (add devDependency + `test` script)
- Create: `vitest.config.ts`
- Create: `src/lib/debate/__tests__/smoke.test.ts` (throwaway, deleted at end of task)

**Interfaces:**
- Produces: an `npm run test` command that runs `*.test.ts` files under `src/` with `@/` path resolution.

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest@^2`
Expected: `vitest` added under devDependencies, no peer errors.

- [ ] **Step 2: Add the test script to `package.json`**

In the `"scripts"` block add:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create a smoke test to prove the harness + alias work**

`src/lib/debate/__tests__/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { getRoundPlan } from "@/lib/debate/roundPlans";

describe("vitest harness", () => {
  it("resolves @/ imports and runs", () => {
    expect(getRoundPlan("debate", 3, "en")).toHaveLength(3);
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm run test`
Expected: 1 passed. (Confirms vitest + `@/` alias + existing source import all work.)

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm src/lib/debate/__tests__/smoke.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add vitest runner for pure-logic unit tests"
```

---

### Task 2: Domain types for Blitz

**Files:**
- Modify: `src/lib/debate/debateTypes.ts`

**Interfaces:**
- Produces:
  - `DebateMode` now includes `"blitz"`.
  - `ResponseLength` now includes `"punchy"`.
  - `type BlitzMove = "OBJECTION" | "COUNTER" | "RECEIPTS" | "TOUCHE" | "FINISHER"`.
  - `const BLITZ_MOVES: readonly BlitzMove[]`.
  - `DebateMessage.move?: BlitzMove`.

- [ ] **Step 1: Extend the mode + length unions**

In `debateTypes.ts`, change:
```ts
export type DebateMode = "debate" | "discussion";
```
to:
```ts
export type DebateMode = "debate" | "discussion" | "blitz";
```
and change:
```ts
export type ResponseLength = "short" | "medium" | "long";
```
to:
```ts
export type ResponseLength = "short" | "medium" | "long" | "punchy";
```

- [ ] **Step 2: Add the move type + constant**

Add near the top-level type declarations (after `ModelColor`):
```ts
/**
 * A fighter's rhetorical "move" in Blitz mode. The model prepends one of these
 * as a leading tag; the server validates + strips it (see parseMove) and the
 * stage maps it to a splash + sting. The enum is the contract; display names are
 * tunable. Trademark-safe (no Ace Attorney "HOLD IT"/"TAKE THAT").
 */
export type BlitzMove = "OBJECTION" | "COUNTER" | "RECEIPTS" | "TOUCHE" | "FINISHER";

export const BLITZ_MOVES: readonly BlitzMove[] = [
  "OBJECTION",
  "COUNTER",
  "RECEIPTS",
  "TOUCHE",
  "FINISHER",
];
```

- [ ] **Step 3: Add `move` to `DebateMessage`**

In `interface DebateMessage`, after `citations?: Citation[];` add:
```ts
  /** Blitz-mode rhetorical move parsed from the turn's leading tag (see parseMove). */
  move?: BlitzMove;
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: FAILS — several exhaustive `Record<ResponseLength, …>` / mode `switch` sites now miss `"punchy"`/`"blitz"`. This is expected; those sites are fixed in later tasks (Tasks 4, 5, 8). Note each error location; do not fix here.

- [ ] **Step 5: Commit**

```bash
git add src/lib/debate/debateTypes.ts
git commit -m "feat(blitz): add blitz mode, punchy length, and BlitzMove types"
```

---

### Task 3: `parseMove` — server-side move-tag parser (TDD)

**Files:**
- Create: `src/lib/debate/parseMove.ts`
- Create: `src/lib/debate/__tests__/parseMove.test.ts`

**Interfaces:**
- Consumes: `BlitzMove`, `BLITZ_MOVES` from `debateTypes`.
- Produces: `export function parseMove(raw: string): { move: BlitzMove | null; content: string }`.
  - Extracts a leading tag on the first line (case-insensitive, tolerant of a trailing `:`, `!`, `-`, or whitespace).
  - Valid tag → `{ move, content }` with the tag line's tag removed and content trimmed.
  - Unknown/missing tag → `{ move: null, content: raw.trim() }`.

- [ ] **Step 1: Write the failing tests**

`src/lib/debate/__tests__/parseMove.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseMove } from "@/lib/debate/parseMove";

describe("parseMove", () => {
  it("parses a colon-tagged move and strips the tag", () => {
    expect(parseMove("OBJECTION: That's a sunk-cost fallacy.")).toEqual({
      move: "OBJECTION",
      content: "That's a sunk-cost fallacy.",
    });
  });

  it("parses a bang-tagged move", () => {
    expect(parseMove("COUNTER! Your own source disagrees.")).toEqual({
      move: "COUNTER",
      content: "Your own source disagrees.",
    });
  });

  it("is case-insensitive on the tag", () => {
    expect(parseMove("receipts - see the 2019 study.").move).toBe("RECEIPTS");
  });

  it("handles the tag on its own line", () => {
    expect(parseMove("FINISHER\nAnd that's the match.")).toEqual({
      move: "FINISHER",
      content: "And that's the match.",
    });
  });

  it("returns null move for an unknown tag and keeps the text", () => {
    expect(parseMove("REBUTTAL: not a real tag")).toEqual({
      move: null,
      content: "REBUTTAL: not a real tag",
    });
  });

  it("returns null move when there is no tag", () => {
    expect(parseMove("Just a plain sentence.")).toEqual({
      move: null,
      content: "Just a plain sentence.",
    });
  });

  it("does not treat a mid-sentence keyword as a move", () => {
    expect(parseMove("I object to the framing here.").move).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(parseMove("  TOUCHE:  fair point.  ")).toEqual({
      move: "TOUCHE",
      content: "fair point.",
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- parseMove`
Expected: FAIL — "Failed to resolve import ... parseMove" / module not found.

- [ ] **Step 3: Implement `parseMove`**

`src/lib/debate/parseMove.ts`:
```ts
import { BLITZ_MOVES, type BlitzMove } from "@/lib/debate/debateTypes";

// Matches a leading tag at the very start: optional whitespace, the WORD, then a
// separator (`:`, `!`, `-`, or a line break / whitespace) — so "I object to…"
// (no separator directly after a standalone tag word at position 0) is NOT a tag
// unless the first token itself IS a known move followed by a separator.
const TAG_RE = /^\s*([A-Za-z]+)\s*[:!\-]?\s*(?:\n|\s|$)/;

const MOVE_LOOKUP = new Map<string, BlitzMove>(
  BLITZ_MOVES.map((m) => [m.toUpperCase(), m]),
);

export function parseMove(raw: string): { move: BlitzMove | null; content: string } {
  const text = raw ?? "";
  const m = TAG_RE.exec(text);
  if (m) {
    const candidate = m[1].toUpperCase();
    const move = MOVE_LOOKUP.get(candidate);
    if (move) {
      const content = text.slice(m[0].length).trim();
      return { move, content };
    }
  }
  return { move: null, content: text.trim() };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- parseMove`
Expected: PASS — 8 passed. If "I object to the framing" fails (matched OBJECT-ish), confirm the word is `object` not `objection`; only exact enum words match, so it correctly returns null.

- [ ] **Step 5: Commit**

```bash
git add src/lib/debate/parseMove.ts src/lib/debate/__tests__/parseMove.test.ts
git commit -m "feat(blitz): add parseMove tag parser with tests"
```

---

### Task 4: Blitz round plan + mode option (TDD)

**Files:**
- Modify: `src/lib/debate/roundPlans.ts`
- Modify: `src/lib/constants.ts` (add a `blitz` entry to `MODE_OPTIONS`)
- Create: `src/lib/debate/__tests__/blitzPlan.test.ts`

**Interfaces:**
- Consumes: `getRoundPlan(mode, roundCount, language)` (existing).
- Produces: `getRoundPlan("blitz", <any RoundCount>, lang)` returns a fixed 4-entry plan (labels: Opening Shot, Cross-Fire, Counter-Fire, Final Blow). `MODE_OPTIONS` contains a `{ id: "blitz", modelARole: "Pro side", modelBRole: "Against side", … }` entry so `rolesForMode("blitz")` resolves.

- [ ] **Step 1: Write the failing test**

`src/lib/debate/__tests__/blitzPlan.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { getRoundPlan } from "@/lib/debate/roundPlans";
import { MODE_OPTIONS } from "@/lib/constants";

describe("blitz round plan", () => {
  it("has exactly 4 rounds regardless of roundCount", () => {
    expect(getRoundPlan("blitz", 3, "en")).toHaveLength(4);
    expect(getRoundPlan("blitz", 7, "en")).toHaveLength(4);
  });

  it("uses the Blitz round labels in order", () => {
    const labels = getRoundPlan("blitz", 3, "en").map((r) => r.label);
    expect(labels).toEqual(["Opening Shot", "Cross-Fire", "Counter-Fire", "Final Blow"]);
  });

  it("has both fighter tasks on every round", () => {
    for (const r of getRoundPlan("blitz", 3, "en")) {
      expect(r.modelATask.length).toBeGreaterThan(0);
      expect(r.modelBTask.length).toBeGreaterThan(0);
    }
  });

  it("registers a blitz mode option so roles resolve", () => {
    expect(MODE_OPTIONS.find((m) => m.id === "blitz")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- blitzPlan`
Expected: FAIL — `getRoundPlan` returns the debate plan / `blitz` key missing.

- [ ] **Step 3: Add the Blitz plans (EN + TR) in `roundPlans.ts`**

After `DEBATE_7` add:
```ts
const BLITZ_4: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Opening Shot",
    modelATask: "In one or two punchy sentences, hit your strongest point FOR the topic.",
    modelBTask: "In one or two punchy sentences, hit your strongest point AGAINST the topic.",
  },
  {
    round: 2,
    label: "Cross-Fire",
    modelATask: "Attack the single weakest part of the opponent's last line. Stay sharp and short.",
    modelBTask: "Attack the single weakest part of the opponent's last line. Stay sharp and short.",
  },
  {
    round: 3,
    label: "Counter-Fire",
    modelATask: "Defend against their hit and fire back in one or two sentences.",
    modelBTask: "Defend against their hit and fire back in one or two sentences.",
  },
  {
    round: 4,
    label: "Final Blow",
    modelATask: "Land your closing one-liner. Make it stick.",
    modelBTask: "Land your closing one-liner. Make it stick.",
  },
];

const BLITZ_4_TR: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Açılış Vuruşu",
    modelATask: "Bir iki vurucu cümleyle konu LEHİNE en güçlü noktanı söyle.",
    modelBTask: "Bir iki vurucu cümleyle konu ALEYHİNE en güçlü noktanı söyle.",
  },
  {
    round: 2,
    label: "Çapraz Ateş",
    modelATask: "Rakibin son sözündeki en zayıf yeri vur. Keskin ve kısa ol.",
    modelBTask: "Rakibin son sözündeki en zayıf yeri vur. Keskin ve kısa ol.",
  },
  {
    round: 3,
    label: "Karşı Ateş",
    modelATask: "Vuruşuna karşı savun ve bir iki cümleyle karşılık ver.",
    modelBTask: "Vuruşuna karşı savun ve bir iki cümleyle karşılık ver.",
  },
  {
    round: 4,
    label: "Son Darbe",
    modelATask: "Kapanış tek cümleni söyle. Akılda kalsın.",
    modelBTask: "Kapanış tek cümleni söyle. Akılda kalsın.",
  },
];
```

- [ ] **Step 4: Branch `getRoundPlan` for blitz**

Replace the `getRoundPlan` function body with a blitz short-circuit (blitz ignores roundCount):
```ts
export function getRoundPlan(
  mode: DebateMode,
  roundCount: RoundCount,
  language: Locale = "en",
): RoundPlanEntry[] {
  if (mode === "blitz") {
    return (language === "tr" ? BLITZ_4_TR : BLITZ_4);
  }
  return (PLANS[language] ?? PLANS.en)[mode][roundCount];
}
```
(Leave the `PLANS` table as-is — it stays keyed by `debate`/`discussion` only.)

- [ ] **Step 5: Add the blitz `MODE_OPTIONS` entry in `constants.ts`**

Inside the `MODE_OPTIONS` array, after the `discussion` entry, add:
```ts
  {
    id: "blitz",
    title: "Blitz Mode",
    tagline: "Fast hits. One winner.",
    description: "Two models trade rapid one-liners on the arena stage.",
    modelARole: "Pro side",
    modelBRole: "Against side",
    emoji: "⚡",
  },
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npm run test -- blitzPlan`
Expected: PASS — 4 passed.
Run: `npx tsc --noEmit`
Expected: the mode-related errors from Task 2 in `roundPlans.ts`/`constants.ts` are gone (length errors may remain until Task 5).

- [ ] **Step 7: Commit**

```bash
git add src/lib/debate/roundPlans.ts src/lib/constants.ts src/lib/debate/__tests__/blitzPlan.test.ts
git commit -m "feat(blitz): add 4-round blitz plan (en/tr) and blitz mode option"
```

---

### Task 5: `punchy` length preset + Blitz prompt addendum (TDD)

**Files:**
- Modify: `src/lib/debate/promptBuilder.ts`
- Create: `src/lib/debate/__tests__/blitzPrompt.test.ts`

**Interfaces:**
- Consumes: `lengthPreset(length)`, `buildSystemPrompt(mode, deep, sourcesAvailable, language)` (existing signatures).
- Produces: `LENGTH_PRESETS.punchy` exists (`{ maxTokens: 90, description: … }`); `buildSystemPrompt("blitz", …)` output contains the move-tag instruction and the enum names.

- [ ] **Step 1: Write the failing test**

`src/lib/debate/__tests__/blitzPrompt.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { lengthPreset, buildSystemPrompt } from "@/lib/debate/promptBuilder";

describe("blitz prompt pieces", () => {
  it("punchy length preset is short-capped", () => {
    const p = lengthPreset("punchy");
    expect(p.maxTokens).toBeLessThanOrEqual(120);
    expect(p.description.toLowerCase()).toContain("word");
  });

  it("blitz system prompt instructs a leading move tag and lists the enum", () => {
    const sys = buildSystemPrompt("blitz", false, true, "en");
    expect(sys).toContain("OBJECTION");
    expect(sys).toContain("FINISHER");
    expect(sys.toLowerCase()).toContain("begin");
  });

  it("non-blitz system prompt does NOT add the move-tag instruction", () => {
    const sys = buildSystemPrompt("debate", false, true, "en");
    expect(sys).not.toContain("FINISHER");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- blitzPrompt`
Expected: FAIL — `lengthPreset("punchy")` is `undefined` / system prompt lacks the tag text.

- [ ] **Step 3: Add the `punchy` preset**

In `promptBuilder.ts`, add to `LENGTH_PRESETS`:
```ts
  punchy: { maxTokens: 90, description: "1–2 sentences, at most ~40 words, no lists" },
```

- [ ] **Step 4: Add the Blitz addendum to `buildSystemPrompt`**

Locate `buildSystemPrompt`. At the end of the assembled system prompt (just before it returns), append a blitz-only block:
```ts
  if (mode === "blitz") {
    parts.push(
      [
        "BLITZ RULES:",
        "- Begin your reply with EXACTLY ONE move tag on the first line, then your line.",
        "- Allowed tags: OBJECTION, COUNTER, RECEIPTS, TOUCHE, FINISHER.",
        "  OBJECTION = attack a claim · COUNTER = flip their point back ·",
        "  RECEIPTS = cite a fact/example · TOUCHE = concede a small point (rare) ·",
        "  FINISHER = your closing line (use in the final round).",
        "- Format: `OBJECTION: <your one or two sentences>`.",
        "- Keep it to 1–2 punchy sentences. No lists, no headers, no preamble.",
      ].join("\n"),
    );
  }
```
(Adapt `parts.push(...)` to however `buildSystemPrompt` accumulates its string — if it builds a single template literal, append the block with a leading `\n\n` inside a `mode === "blitz" ? … : ""` interpolation instead. Read the function first and match its existing accumulation style.)

- [ ] **Step 5: Run tests + typecheck**

Run: `npm run test -- blitzPrompt`
Expected: PASS — 3 passed.
Run: `npx tsc --noEmit`
Expected: `LENGTH_PRESETS` exhaustiveness error from Task 2 is now resolved. Remaining errors (validators, session builder) are handled in Tasks 7–8.

- [ ] **Step 6: Commit**

```bash
git add src/lib/debate/promptBuilder.ts src/lib/debate/__tests__/blitzPrompt.test.ts
git commit -m "feat(blitz): add punchy length preset and blitz move-tag prompt"
```

---

### Task 6: Parse + strip the move in the turn route

**Files:**
- Modify: `src/app/api/debate/turn/route.ts`

**Interfaces:**
- Consumes: `parseMove` (Task 3), `DebateMessage.move` (Task 2), `session.mode`.
- Produces: for a blitz session, the returned `message.content` has the tag stripped and `message.move` is set; non-blitz messages are unchanged.

- [ ] **Step 1: Import `parseMove`**

Add near the other `@/lib/debate` imports:
```ts
import { parseMove } from "@/lib/debate/parseMove";
```

- [ ] **Step 2: Apply it to the final content for blitz**

In the route, the display text is assembled into `content` (around the `let content = deep ? … : result.content;` block, before the `const message: DebateMessage = {` literal). Add, immediately before the message literal:
```ts
    // Blitz: pull the leading move tag off the model's reply, strip it from the
    // shown text, and attach it to the message so the stage can fire a splash.
    // Non-blitz sessions are untouched. Unknown/missing tag → move stays undefined.
    let move: DebateMessage["move"];
    if (session.mode === "blitz") {
      const parsed = parseMove(content);
      content = parsed.content;
      move = parsed.move ?? undefined;
    }
```

- [ ] **Step 3: Set `move` on the message literal**

In the `const message: DebateMessage = { … }` literal, after `content,` add:
```ts
      move,
```
(For non-blitz, `move` is `undefined` and is omitted from JSON — no behavior change.)

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit` → Expected: PASS for this file.
Run: `npx next build` → Expected: compiles (route builds).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/debate/turn/route.ts
git commit -m "feat(blitz): parse and strip the move tag in the turn route"
```

---

### Task 7: Validators accept blitz + enforce its shape (TDD)

**Files:**
- Modify: `src/lib/debate/validators.ts`
- Create: `src/lib/debate/__tests__/blitzValidators.test.ts`

**Interfaces:**
- Consumes: `assertValidSession(session)` (existing; throws `ProviderError` on bad input).
- Produces: `assertValidSession` accepts a well-formed blitz session (mode `blitz`, `punchy`, `auto`, 8 turns) and rejects a blitz session whose turn count ≠ 8 or whose pace ≠ `auto`.

- [ ] **Step 1: Write the failing test**

`src/lib/debate/__tests__/blitzValidators.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { assertValidSession } from "@/lib/debate/validators";
import { createDebateSession } from "@/lib/debate/orchestrator";
import type { DebateConfig } from "@/lib/debate/debateTypes";

function blitzConfig(overrides: Partial<DebateConfig> = {}): DebateConfig {
  const model = (id: string) => ({
    providerId: "openai",
    modelId: id,
    displayName: id,
    nickname: id,
    color: "blue" as const,
  });
  return {
    topic: "Is pineapple acceptable on pizza?",
    mode: "blitz",
    modelA: model("gpt-x"),
    modelB: { ...model("deepseek-v4-flash"), color: "red" },
    roundCount: 3,
    responseLength: "punchy",
    tone: "serious",
    pace: "auto",
    deepDebate: false,
    judge: { enabled: true, mode: "auto" },
    ...overrides,
  } as DebateConfig;
}

describe("blitz validation", () => {
  it("accepts a well-formed blitz session (8 turns)", () => {
    const s = createDebateSession(blitzConfig());
    expect(s.turns).toHaveLength(8);
    expect(() => assertValidSession(s)).not.toThrow();
  });

  it("rejects a blitz session with the wrong turn count", () => {
    const s = createDebateSession(blitzConfig());
    s.turns = s.turns.slice(0, 6);
    expect(() => assertValidSession(s)).toThrow();
  });

  it("rejects blitz with a non-auto pace", () => {
    const s = createDebateSession(blitzConfig());
    s.pace = "manual";
    expect(() => assertValidSession(s)).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- blitzValidators`
Expected: FAIL — either `createDebateSession` doesn't yet build 8 blitz turns (Task 8) OR the blitz guards don't exist. (Task 8 completes the green; ordering note: implement Step 3 here, then Task 8, then re-run — the acceptance test goes green after Task 8. The two REJECT tests can pass now.)

- [ ] **Step 3: Add blitz guards in `assertValidSession`**

The existing `VALID_MODES` is `["debate", "discussion"]`. Change to:
```ts
const VALID_MODES = ["debate", "discussion", "blitz"];
```
The existing `VALID_LENGTHS` is `["short", "medium", "long"]`. Change to:
```ts
const VALID_LENGTHS = ["short", "medium", "long", "punchy"];
```
Then, after the existing `session.turns.length > 14` guard, add a blitz-specific block:
```ts
  if (session.mode === "blitz") {
    if (session.turns.length !== 8) {
      throw new ProviderError("INVALID_REQUEST", "Blitz matches are exactly 8 turns");
    }
    if (session.pace !== "auto") {
      throw new ProviderError("INVALID_REQUEST", "Blitz runs on auto pace");
    }
    if (session.responseLength !== "punchy") {
      throw new ProviderError("INVALID_REQUEST", "Blitz uses punchy length");
    }
  }
```

- [ ] **Step 4: Run the reject tests**

Run: `npm run test -- blitzValidators`
Expected: the two "rejects" tests PASS; the "accepts" test may still fail until Task 8 builds 8 blitz turns. Proceed to Task 8, then return and confirm all 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/debate/validators.ts src/lib/debate/__tests__/blitzValidators.test.ts
git commit -m "feat(blitz): validate blitz mode shape (8 turns, auto, punchy)"
```

---

### Task 8: Session builder handles blitz (TDD close-out)

**Files:**
- Modify: `src/lib/debate/orchestrator.ts`

**Interfaces:**
- Consumes: `getRoundPlan` (now blitz-aware), `rolesForMode`.
- Produces: `createDebateSession(blitzConfig)` returns a session with 8 pending turns (4 rounds × A/B), stances pro/against, `roundLabel` from the blitz plan.

- [ ] **Step 1: Confirm the failing acceptance test**

Run: `npm run test -- blitzValidators`
Expected: the "accepts a well-formed blitz session (8 turns)" test currently FAILS if `createDebateSession` doesn't yet produce 8 blitz turns. (If `getRoundPlan` blitz branch from Task 4 already yields 4 rounds and `rolesForMode` resolves via the Task 4 mode option, it may already build 8 — run to see. If green already, this task only adds the stance guarantee below.)

- [ ] **Step 2: Ensure blitz gets pro/against stances**

In `createDebateSession`, the stance line is:
```ts
      stance: config.mode === "debate" ? "pro" : undefined,
```
and:
```ts
      stance: config.mode === "debate" ? "against" : undefined,
```
Change both so blitz is stance-bearing like debate:
```ts
      stance: config.mode === "debate" || config.mode === "blitz" ? "pro" : undefined,
```
and:
```ts
      stance: config.mode === "debate" || config.mode === "blitz" ? "against" : undefined,
```

- [ ] **Step 3: Run the full blitz test suite**

Run: `npm run test`
Expected: all blitz tests PASS (parseMove, blitzPlan, blitzPrompt, blitzValidators).
Run: `npx tsc --noEmit`
Expected: PASS (no remaining mode/length exhaustiveness errors).

- [ ] **Step 4: Commit**

```bash
git add src/lib/debate/orchestrator.ts
git commit -m "feat(blitz): build 8-turn blitz sessions with pro/against stances"
```

---

### Task 9: Blitz roster registry (TDD)

**Files:**
- Create: `src/lib/debate/blitzRoster.ts`
- Create: `src/lib/debate/__tests__/blitzRoster.test.ts`

**Interfaces:**
- Consumes: `getModelById` from `modelRegistry` (to validate ids exist).
- Produces:
  - `interface BlitzFighter { modelId: string; characterKey: string; available: boolean }`.
  - `const BLITZ_ROSTER: BlitzFighter[]`.
  - `function isBlitzModel(modelId: string): boolean` — true if the id is a roster entry with `available: true`.
  - `function blitzRosterModelIds(): string[]` — available roster ids only.

- [ ] **Step 1: Write the failing test**

`src/lib/debate/__tests__/blitzRoster.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { BLITZ_ROSTER, isBlitzModel, blitzRosterModelIds } from "@/lib/debate/blitzRoster";
import { getModelById } from "@/lib/models/modelRegistry";

describe("blitz roster", () => {
  it("every roster entry references a real catalog model", () => {
    for (const f of BLITZ_ROSTER) {
      expect(getModelById(f.modelId), `${f.modelId} must exist in the catalog`).toBeTruthy();
    }
  });

  it("isBlitzModel is true only for available roster ids", () => {
    const first = blitzRosterModelIds()[0];
    expect(isBlitzModel(first)).toBe(true);
    expect(isBlitzModel("definitely-not-a-model")).toBe(false);
  });

  it("exposes at least two available fighters (a match needs two)", () => {
    expect(blitzRosterModelIds().length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- blitzRoster`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the registry**

`src/lib/debate/blitzRoster.ts`. Use model ids confirmed to exist in `modelRegistry.ts` (`deepseek-v4-pro`, `deepseek-v4-flash`, `qwen/qwen3-next-80b-a3b-instruct:free`, `qwen/qwen3-coder:free`, `meta-llama/llama-3.3-70b-instruct:free`). Before writing, open `src/lib/models/modelRegistry.ts` and copy 8–12 exact ids the owner wants as the launch roster; the list below is a valid, catalog-backed starting set (owner finalizes):
```ts
/**
 * The curated Blitz roster. Only models listed here (with available:true) are
 * selectable in Blitz mode; everything else stays in normal Debate mode.
 * `characterKey` names the sprite folder used in Phase 2 — in Phase 1 the stage
 * renders the reusable panel regardless, so the key is forward-declaration only.
 * Owner finalizes the exact set; every id MUST exist in modelRegistry.ts.
 */
import { getModelById } from "@/lib/models/modelRegistry";

export interface BlitzFighter {
  modelId: string;
  characterKey: string;
  available: boolean;
}

export const BLITZ_ROSTER: BlitzFighter[] = [
  { modelId: "deepseek-v4-pro", characterKey: "deepseek-pro", available: true },
  { modelId: "deepseek-v4-flash", characterKey: "deepseek-flash", available: true },
  { modelId: "qwen/qwen3-next-80b-a3b-instruct:free", characterKey: "qwen-next", available: true },
  { modelId: "qwen/qwen3-coder:free", characterKey: "qwen-coder", available: true },
  { modelId: "meta-llama/llama-3.3-70b-instruct:free", characterKey: "llama", available: true },
];

const AVAILABLE = new Set(
  BLITZ_ROSTER.filter((f) => f.available && getModelById(f.modelId)).map((f) => f.modelId),
);

export function isBlitzModel(modelId: string): boolean {
  return AVAILABLE.has(modelId);
}

export function blitzRosterModelIds(): string[] {
  return [...AVAILABLE];
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- blitzRoster`
Expected: PASS — 3 passed. (If a listed id fails the "real catalog model" test, replace it with a confirmed id from `modelRegistry.ts`.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/debate/blitzRoster.ts src/lib/debate/__tests__/blitzRoster.test.ts
git commit -m "feat(blitz): add curated roster registry with catalog validation"
```

---

### Task 10: Blitz synth SFX keys

**Files:**
- Modify: `src/lib/audio/soundManager.ts`

**Interfaces:**
- Produces: new `SoundKey`s `"blitzHit"`, `"blitzWhoosh"`, `"blitzObjection"`, `"blitzKO"`, `"blitzRoundTitle"`, each with a synth `PATTERNS` entry. (Hero MP3 overrides for `blitzObjection`/`blitzKO` are Phase 2 via `SFX_ASSETS`.)

- [ ] **Step 1: Extend the `SoundKey` union**

Add to the union:
```ts
  | "blitzHit"
  | "blitzWhoosh"
  | "blitzObjection"
  | "blitzKO"
  | "blitzRoundTitle"
```

- [ ] **Step 2: Add synth patterns**

Add these entries to the `PATTERNS` record:
```ts
  blitzWhoosh: [{ freq: 300, start: 0, dur: 0.09, type: "sine", gain: 0.08 }],
  blitzHit: [
    { freq: 180, start: 0, dur: 0.05, type: "square", gain: 0.18 },
    { freq: 90, start: 0.05, dur: 0.08, type: "sawtooth", gain: 0.16 },
  ],
  blitzObjection: [
    { freq: 440, start: 0, dur: 0.06, type: "square", gain: 0.2 },
    { freq: 660, start: 0.06, dur: 0.06, type: "square", gain: 0.2 },
    { freq: 880, start: 0.12, dur: 0.14, type: "square", gain: 0.2 },
  ],
  blitzKO: [
    { freq: 784, start: 0, dur: 0.1, type: "square", gain: 0.2 },
    { freq: 523, start: 0.1, dur: 0.1, type: "square", gain: 0.2 },
    { freq: 262, start: 0.2, dur: 0.28, type: "sawtooth", gain: 0.2 },
  ],
  blitzRoundTitle: [
    { freq: 523, start: 0, dur: 0.08, type: "triangle", gain: 0.14 },
    { freq: 784, start: 0.08, dur: 0.12, type: "triangle", gain: 0.14 },
  ],
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (the `PATTERNS` record is exhaustive over the extended union).

- [ ] **Step 4: Commit**

```bash
git add src/lib/audio/soundManager.ts
git commit -m "feat(blitz): add blitz synth SFX keys (hit, whoosh, objection, KO, round)"
```

---

### Task 11: `useBlitzRunner` — buffer-then-stream playback engine

**Files:**
- Create: `src/lib/debate/useBlitzRunner.ts`
- Create: `src/lib/debate/blitzBuffer.ts` (pure buffer-accounting helper)
- Create: `src/lib/debate/__tests__/blitzBuffer.test.ts`

**Interfaces:**
- Consumes: `generateTurn`, `generateVerdict` from `@/lib/api/debateClient`; `DebateSession`, `DebateMessage`, `DebateVerdict`, `BlitzMove`; `useReduceMotion`; `playSound`.
- Produces:
  - `blitzBuffer.ts`: `export const BLITZ_BUFFER = 4;` and `export function canStartPlayback(generatedCount: number): boolean` (`generatedCount >= BLITZ_BUFFER` OR generatedCount === total when total < BLITZ_BUFFER).
  - `useBlitzRunner(session): BlitzRunnerState` where
    ```ts
    type BlitzPhase = "intro" | "roundTitle" | "speaking" | "moveSplash" | "verdict" | "done" | "error";
    interface BlitzRunnerState {
      phase: BlitzPhase;
      roundLabel: string | null;
      speaker: "modelA" | "modelB" | null;
      line: string;              // typed-out text of the current turn
      move: BlitzMove | null;    // current turn's move (drives the splash)
      messages: DebateMessage[]; // completed turns (for the transcript)
      verdict: DebateVerdict | null;
      error: AppErrorShape | null;
      bufferedCount: number;     // turns generated so far (for a loading meter)
      totalTurns: number;
      replay: () => void;
    }
    ```

**Design notes for the implementer (read before coding):**
- This mirrors the generation-resilience patterns in `src/lib/debate/useDebateRunner.ts` (silent retry with backoff, abort on unmount, persist snapshots) — reuse its `delay()` / `isAbort()` / retry structure. Do NOT extend that hook; this is a separate, blitz-tuned engine.
- Generation is sequential (turn n needs 1..n-1). Kick off generation immediately; hold playback until `canStartPlayback(bufferedCount)`. Keep generating the rest while playback runs.
- The typewriter for blitz is FAST: reveal the whole line over ~max(500ms, chars*12ms). On reduce-motion, set `line` to the full text instantly (no per-char loop) — reuse the `reduceMotionRef` gate pattern from `useDebateRunner`.
- Sequence per turn: set `phase:"speaking"` + play `blitzWhoosh`; if the turn has a `move`, first set `phase:"moveSplash"` for ~450ms (play `blitzObjection` for OBJECTION/COUNTER/FINISHER, `blitzHit` otherwise) then `phase:"speaking"`. Between turns wait ~300ms.
- Round change → `phase:"roundTitle"` for ~700ms + play `blitzRoundTitle`.
- After 8 turns → judge: reuse `generateVerdict`; `phase:"verdict"`; play `blitzKO`; then `phase:"done"`.
- All sound via a guarded `sfx()` that checks the audio toggle (mirror `useDebateRunner`'s `sfx`).

- [ ] **Step 1: Write the failing buffer test**

`src/lib/debate/__tests__/blitzBuffer.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { BLITZ_BUFFER, canStartPlayback } from "@/lib/debate/blitzBuffer";

describe("blitz buffer", () => {
  it("buffers the configured number of turns before playback", () => {
    expect(BLITZ_BUFFER).toBe(4);
    expect(canStartPlayback(3, 8)).toBe(false);
    expect(canStartPlayback(4, 8)).toBe(true);
    expect(canStartPlayback(8, 8)).toBe(true);
  });

  it("starts immediately when the whole match is shorter than the buffer", () => {
    expect(canStartPlayback(2, 2)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- blitzBuffer`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `blitzBuffer.ts`**

```ts
/** Blitz pre-generation buffer: how many turns to generate before playback starts. */
export const BLITZ_BUFFER = 4;

/** True once enough turns are buffered (or the whole — shorter — match is ready). */
export function canStartPlayback(generatedCount: number, totalTurns: number): boolean {
  return generatedCount >= Math.min(BLITZ_BUFFER, totalTurns);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- blitzBuffer`
Expected: PASS — 2 passed.

- [ ] **Step 5: Implement `useBlitzRunner.ts`**

Create the hook following the interface + design notes above, modeled on `useDebateRunner.ts`. It reuses `generateTurn`/`generateVerdict`, the silent-retry loop, abort-on-unmount, and the audio gate. Full reference implementation:
```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BlitzMove,
  DebateMessage,
  DebateSession,
  DebateVerdict,
} from "@/lib/debate/debateTypes";
import { generateTurn, generateVerdict } from "@/lib/api/debateClient";
import { type AppErrorShape, toAppError } from "@/lib/utils/errors";
import { useReduceMotion } from "@/lib/motion/useReduceMotion";
import { isSoundEnabled, playSound } from "@/lib/audio/soundManager";
import { BLITZ_BUFFER, canStartPlayback } from "@/lib/debate/blitzBuffer";

export type BlitzPhase =
  | "intro" | "roundTitle" | "speaking" | "moveSplash" | "verdict" | "done" | "error";

export interface BlitzRunnerState {
  phase: BlitzPhase;
  roundLabel: string | null;
  speaker: "modelA" | "modelB" | null;
  line: string;
  move: BlitzMove | null;
  messages: DebateMessage[];
  verdict: DebateVerdict | null;
  error: AppErrorShape | null;
  bufferedCount: number;
  totalTurns: number;
  replay: () => void;
}

const ROUND_TITLE_MS = 700;
const MOVE_SPLASH_MS = 450;
const BETWEEN_TURNS_MS = 300;
const TYPE_MIN_MS = 500;
const TYPE_PER_CHAR_MS = 12;
const RETRY_BASE_MS = 500;
const MAX_ATTEMPTS = 4;

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("aborted", "AbortError"));
    const onAbort = () => { clearTimeout(id); reject(new DOMException("aborted", "AbortError")); };
    const id = setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

export function useBlitzRunner(initialSession: DebateSession): BlitzRunnerState {
  const [state, setState] = useState<BlitzRunnerState>(() => ({
    phase: "intro", roundLabel: null, speaker: null, line: "", move: null,
    messages: [], verdict: null, error: null,
    bufferedCount: 0, totalTurns: initialSession.turns.length, replay: () => {},
  }));
  const [runToken, setRunToken] = useState(0);
  const reduceMotion = useReduceMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;

  const replay = useCallback(() => setRunToken((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const sfx = (k: Parameters<typeof playSound>[0]) => { if (isSoundEnabled()) playSound(k); };

    const working: DebateSession = {
      ...initialSession,
      turns: initialSession.turns.map((t) => ({ ...t })),
      messages: [],
    };
    const generated: DebateMessage[] = [];

    async function generateOne(turnId: string): Promise<DebateMessage> {
      let attempt = 0;
      for (;;) {
        try {
          return await generateTurn(working, turnId, signal);
        } catch (err) {
          if (isAbort(err) || signal.aborted) throw err;
          attempt += 1;
          if (attempt >= MAX_ATTEMPTS) throw err;
          await delay(RETRY_BASE_MS * attempt, signal);
        }
      }
    }

    async function typeLine(text: string) {
      if (reduceMotionRef.current || text.length === 0) {
        setState((p) => ({ ...p, line: text }));
        return;
      }
      const total = Math.max(TYPE_MIN_MS, text.length * TYPE_PER_CHAR_MS);
      const frames = Math.ceil(total / 33);
      for (let i = 1; i <= frames; i++) {
        if (signal.aborted) return;
        const shown = Math.ceil((text.length * i) / frames);
        setState((p) => ({ ...p, line: text.slice(0, shown) }));
        await delay(33, signal);
      }
      setState((p) => ({ ...p, line: text }));
    }

    async function run() {
      try {
        setState((p) => ({ ...p, phase: "intro" }));
        // Buffer: generate turns until we can start (or all are ready).
        const total = working.turns.length;
        const genAll = (async () => {
          for (const turn of working.turns) {
            if (signal.aborted) return;
            const msg = await generateOne(turn.id);
            turn.status = "complete";
            working.messages = [...working.messages, msg];
            generated.push(msg);
            setState((p) => ({ ...p, bufferedCount: generated.length }));
          }
        })();
        genAll.catch(() => {}); // surfaced per-turn below

        // VS intro floor + wait for buffer.
        await delay(Math.max(1200, 0), signal);
        while (!canStartPlayback(generated.length, total)) {
          if (signal.aborted) return;
          await delay(120, signal);
        }

        // Playback.
        let lastRound = 0;
        for (let i = 0; i < total; i++) {
          if (signal.aborted) return;
          // Wait until this turn is generated (playback may outrun a slow gen).
          while (generated.length <= i) {
            if (signal.aborted) return;
            await delay(120, signal);
          }
          const turn = working.turns[i];
          const msg = generated[i];

          if (turn.roundNumber !== lastRound) {
            lastRound = turn.roundNumber;
            setState((p) => ({ ...p, phase: "roundTitle", roundLabel: turn.roundLabel, line: "", move: null, speaker: null }));
            sfx("blitzRoundTitle");
            await delay(ROUND_TITLE_MS, signal);
          }

          if (msg.move) {
            setState((p) => ({ ...p, phase: "moveSplash", move: msg.move!, speaker: turn.speaker, line: "" }));
            sfx(msg.move === "TOUCHE" || msg.move === "RECEIPTS" ? "blitzHit" : "blitzObjection");
            await delay(MOVE_SPLASH_MS, signal);
          }

          setState((p) => ({ ...p, phase: "speaking", speaker: turn.speaker, move: msg.move ?? null, line: "" }));
          sfx("blitzWhoosh");
          await typeLine(msg.content);
          setState((p) => ({ ...p, messages: [...generated.slice(0, i + 1)] }));
          await delay(BETWEEN_TURNS_MS, signal);
        }

        // Judge.
        if (working.judge.enabled) {
          let verdict: DebateVerdict | undefined;
          let attempt = 0;
          for (;;) {
            try { verdict = await generateVerdict(working, signal); break; }
            catch (err) {
              if (isAbort(err) || signal.aborted) return;
              attempt += 1;
              if (attempt >= MAX_ATTEMPTS) throw err;
              await delay(RETRY_BASE_MS * attempt, signal);
            }
          }
          if (!verdict || signal.aborted) return;
          setState((p) => ({ ...p, phase: "verdict", verdict: verdict!, line: "", move: null }));
          sfx("blitzKO");
          await delay(900, signal);
        }
        setState((p) => ({ ...p, phase: "done" }));
      } catch (err) {
        if (isAbort(err)) return;
        setState((p) => ({ ...p, phase: "error", error: toAppError(err) }));
      }
    }

    void run();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSession.id, runToken]);

  return { ...state, replay };
}
```
Note: this references `isSoundEnabled()` from `soundManager` — if that export does not exist, read `soundManager.ts` and use the existing enabled-check (e.g. gate via the same mechanism `useDebateRunner` uses; add a tiny `isSoundEnabled()` export if needed and commit it in this task).

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc --noEmit` → Expected: PASS.
Run: `npx next build` → Expected: compiles.

- [ ] **Step 7: Commit**

```bash
git add src/lib/debate/blitzBuffer.ts src/lib/debate/useBlitzRunner.ts src/lib/debate/__tests__/blitzBuffer.test.ts src/lib/audio/soundManager.ts
git commit -m "feat(blitz): add useBlitzRunner buffer-then-stream playback engine"
```

---

### Task 12: `BlitzStage` view (panels + dialogue + round title), wired into the arena

**Files:**
- Create: `src/components/blitz/BlitzStage.tsx`
- Create: `src/components/blitz/FighterPanel.tsx`
- Create: `src/components/blitz/DialogueBox.tsx`
- Modify: `src/components/debate/DebateArena.tsx` (branch to BlitzStage when `mode === "blitz"`)

**Interfaces:**
- Consumes: `useBlitzRunner`, `DebateSession`, `SelectedModel`.
- Produces: `<BlitzStage session={session} />` renders the full-frame stage from runner state. `FighterPanel` props: `{ model: SelectedModel; side: "A" | "B"; active: boolean; pose: "idle" | "attack" | "hit" | "win" | "lose" }`. `DialogueBox` props: `{ speakerName: string; line: string; move: BlitzMove | null }`.

**Design notes:**
- `FighterPanel` (Phase-1 reusable panel): a bordered arcade card (reuse the design language — thick black border, hard shadow, brand color frame) showing the model's blown-up emoji `avatar`, `displayName`, and brand logo via the existing `BrandLogo` component. `active` scales it up slightly; `pose` maps to a CSS transform class (idle/attack/hit) — real sprites arrive in Phase 2 behind the same props.
- `BlitzStage` reads `useBlitzRunner(session)` and renders: two `FighterPanel`s, a centered round-title card during `phase === "roundTitle"`, the `DialogueBox` during `speaking`, an intro overlay during `intro` (with a buffer meter from `bufferedCount/BLITZ_BUFFER`), and mounts `MoveSplash`/`VerdictReveal` (Task 13) by phase.

- [ ] **Step 1: Create `FighterPanel.tsx`**

```tsx
"use client";
import type { SelectedModel } from "@/lib/debate/debateTypes";
import { BrandLogo } from "@/components/report/BrandLogo";

const POSE_CLASS: Record<string, string> = {
  idle: "translate-y-0",
  attack: "-translate-y-1 scale-105",
  hit: "translate-x-1 opacity-90",
  win: "-translate-y-2 scale-110",
  lose: "translate-y-1 opacity-70",
};

export function FighterPanel({
  model, side, active, pose,
}: {
  model: SelectedModel;
  side: "A" | "B";
  active: boolean;
  pose: "idle" | "attack" | "hit" | "win" | "lose";
}) {
  const frame = side === "A" ? "border-l-8 border-l-arcade-blue" : "border-r-8 border-r-arcade-red";
  return (
    <div
      className={[
        "flex flex-col items-center gap-2 rounded-2xl border-4 border-ink bg-white p-4 shadow-hard transition-transform duration-200",
        frame,
        active ? "scale-105" : "scale-100 opacity-80",
        POSE_CLASS[pose],
      ].join(" ")}
    >
      <div className="text-6xl" aria-hidden>{model.avatar ?? "🤖"}</div>
      <div className="font-display text-lg text-ink">{model.displayName}</div>
      <BrandLogo modelId={model.modelId} className="h-5 w-5" />
    </div>
  );
}
```
(If `SelectedModel` has no `avatar`, source the emoji from `getModelById(model.modelId)?.avatar`. Confirm `arcade-blue` / `arcade-red` / `shadow-hard` / `font-display` token names against `tailwind.config.ts` and adjust to the real names.)

- [ ] **Step 2: Create `DialogueBox.tsx`**

```tsx
"use client";
import type { BlitzMove } from "@/lib/debate/debateTypes";

export function DialogueBox({
  speakerName, line, move,
}: { speakerName: string; line: string; move: BlitzMove | null }) {
  return (
    <div className="w-full rounded-2xl border-4 border-ink bg-paper p-5 shadow-hard">
      <div className="mb-1 flex items-center gap-2">
        <span className="font-display text-ink">{speakerName}</span>
        {move ? (
          <span className="rounded-md border-2 border-ink bg-arcade-yellow px-2 py-0.5 text-xs font-bold">
            {move}
          </span>
        ) : null}
      </div>
      <p className="min-h-[3.5rem] text-lg leading-snug text-ink">{line}</p>
    </div>
  );
}
```

- [ ] **Step 3: Create `BlitzStage.tsx`**

```tsx
"use client";
import type { DebateSession } from "@/lib/debate/debateTypes";
import { useBlitzRunner } from "@/lib/debate/useBlitzRunner";
import { BLITZ_BUFFER } from "@/lib/debate/blitzBuffer";
import { FighterPanel } from "@/components/blitz/FighterPanel";
import { DialogueBox } from "@/components/blitz/DialogueBox";

export function BlitzStage({ session }: { session: DebateSession }) {
  const r = useBlitzRunner(session);
  const speakerName =
    r.speaker === "modelA" ? session.modelA.displayName
    : r.speaker === "modelB" ? session.modelB.displayName
    : "";
  const poseA = r.speaker === "modelA" ? "attack" : "idle";
  const poseB = r.speaker === "modelB" ? "attack" : "idle";

  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-between gap-6 p-4">
      <div className="flex items-start justify-between gap-4">
        <FighterPanel model={session.modelA} side="A" active={r.speaker === "modelA"} pose={poseA as any} />
        <div className="self-center font-display text-2xl text-ink">VS</div>
        <FighterPanel model={session.modelB} side="B" active={r.speaker === "modelB"} pose={poseB as any} />
      </div>

      {r.phase === "intro" ? (
        <div className="text-center font-display text-xl text-ink">
          Fighters entering the arena… ({r.bufferedCount}/{BLITZ_BUFFER})
        </div>
      ) : null}

      {r.phase === "roundTitle" && r.roundLabel ? (
        <div className="text-center font-display text-3xl text-ink">{r.roundLabel}</div>
      ) : null}

      {(r.phase === "speaking" || r.phase === "moveSplash") ? (
        <DialogueBox speakerName={speakerName} line={r.line} move={r.move} />
      ) : null}

      {r.phase === "error" ? (
        <div className="text-center text-arcade-red">Something went sideways. <button onClick={r.replay} className="underline">Try again</button></div>
      ) : null}
    </div>
  );
}
```
(MoveSplash + VerdictReveal overlays are added in Task 13. Adjust token class names to the real Tailwind config.)

- [ ] **Step 4: Branch the arena to BlitzStage**

Open `src/components/debate/DebateArena.tsx`. Find where it reads the active session and renders the card view. Add, near the top of the render (after the active session is resolved), a blitz branch:
```tsx
  // Blitz mode renders the dedicated stage instead of the transcript cards.
  if (session.mode === "blitz") {
    return <BlitzStage session={session} />;
  }
```
and import it:
```tsx
import { BlitzStage } from "@/components/blitz/BlitzStage";
```
(If `DebateArena` handles multi-battle tabs, place the branch on the single active session — blitz is 1v1, so it always has one session.)

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit` → PASS.
Run: `npx next build` → compiles.

- [ ] **Step 6: Browser verification**

Run: `npm run dev`. Temporarily start a blitz session (Task 15 wires the setup entry; until then, verify by constructing a blitz config in a scratch page OR skip to Task 15 and return). Confirm: two panels render, intro shows the buffer meter, lines type out, round titles appear, and the match reaches the verdict phase. Note issues; fix before commit.

- [ ] **Step 7: Commit**

```bash
git add src/components/blitz/ src/components/debate/DebateArena.tsx
git commit -m "feat(blitz): render BlitzStage (panels + dialogue) for blitz sessions"
```

---

### Task 13: MoveSplash, VS intro, and in-scene VerdictReveal (framer-motion)

**Files:**
- Create: `src/components/blitz/MoveSplash.tsx`
- Create: `src/components/blitz/VerdictReveal.tsx`
- Modify: `src/components/blitz/BlitzStage.tsx` (mount overlays by phase)

**Interfaces:**
- `MoveSplash` props: `{ move: BlitzMove; side: "A" | "B" }`.
- `VerdictReveal` props: `{ session: DebateSession; verdict: DebateVerdict; onReplay: () => void }`.

**Design notes:**
- All animation via framer-motion, gated by `useReduceMotion()`: when reduced, render the splash/verdict as static text (no scale/shake/opacity transitions).
- Move colors: OBJECTION → red, COUNTER → blue, RECEIPTS → yellow, TOUCHE → gray, FINISHER → red/gold big.
- Verdict reuses the winner + summary from `verdict`; CTAs: Rematch (`onReplay`), Share (link to existing `/s` flow via the current results share button pattern), See transcript (Task 14 toggle).

- [ ] **Step 1: Create `MoveSplash.tsx`**

```tsx
"use client";
import { motion } from "framer-motion";
import type { BlitzMove } from "@/lib/debate/debateTypes";
import { useReduceMotion } from "@/lib/motion/useReduceMotion";

const COLOR: Record<BlitzMove, string> = {
  OBJECTION: "bg-arcade-red text-white",
  COUNTER: "bg-arcade-blue text-white",
  RECEIPTS: "bg-arcade-yellow text-ink",
  TOUCHE: "bg-gray-300 text-ink",
  FINISHER: "bg-arcade-red text-white",
};

export function MoveSplash({ move, side }: { move: BlitzMove; side: "A" | "B" }) {
  const reduce = useReduceMotion();
  const box = `rounded-xl border-4 border-ink px-8 py-3 font-display text-4xl shadow-hard ${COLOR[move]}`;
  if (reduce) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className={box}>{move}!</div>
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.2, rotate: side === "A" ? -8 : 8, opacity: 0 }}
        animate={{ scale: [0.2, 1.15, 1], rotate: side === "A" ? -6 : 6, opacity: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={box}
      >
        {move}!
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Create `VerdictReveal.tsx`**

```tsx
"use client";
import { motion } from "framer-motion";
import type { DebateSession, DebateVerdict } from "@/lib/debate/debateTypes";
import { useReduceMotion } from "@/lib/motion/useReduceMotion";

export function VerdictReveal({
  session, verdict, onReplay,
}: { session: DebateSession; verdict: DebateVerdict; onReplay: () => void }) {
  const reduce = useReduceMotion();
  const winnerName =
    verdict.winner === "modelA" ? session.modelA.displayName
    : verdict.winner === "modelB" ? session.modelB.displayName
    : verdict.winner === "tie" ? "It's a draw" : "";
  const Wrapper = reduce ? "div" : motion.div;
  const anim = reduce ? {} : {
    initial: { scale: 0.6, opacity: 0 }, animate: { scale: 1, opacity: 1 },
    transition: { type: "spring", stiffness: 260, damping: 18 },
  };
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-paper/95 p-6">
      <Wrapper {...(anim as any)} className="rounded-2xl border-4 border-ink bg-arcade-yellow px-8 py-4 font-display text-3xl text-ink shadow-hard">
        {winnerName === "It's a draw" ? winnerName : `${winnerName} takes it!`}
      </Wrapper>
      <p className="max-w-md text-center text-ink">{verdict.summary}</p>
      <div className="flex gap-3">
        <button onClick={onReplay} className="rounded-xl border-4 border-ink bg-arcade-green px-4 py-2 font-display text-ink shadow-hard">Rematch</button>
        <a href="/result" className="rounded-xl border-4 border-ink bg-white px-4 py-2 font-display text-ink shadow-hard">Full result</a>
      </div>
    </div>
  );
}
```
(Confirm the `/result` route still shows the finished session from context; if results rely on persisted session state, ensure the blitz runner persists like `useDebateRunner` — add an `onPersist` prop mirroring the debate runner if the results page needs it. If so, thread persistence through Task 11's runner and re-commit that task.)

- [ ] **Step 3: Mount overlays in `BlitzStage`**

Add imports and, inside the stage's root `relative` container, render:
```tsx
      <AnimatePresence>
        {r.phase === "moveSplash" && r.move && r.speaker ? (
          <MoveSplash key="splash" move={r.move} side={r.speaker === "modelA" ? "A" : "B"} />
        ) : null}
      </AnimatePresence>
      {r.phase === "verdict" && r.verdict ? (
        <VerdictReveal session={session} verdict={r.verdict} onReplay={r.replay} />
      ) : null}
```
with:
```tsx
import { AnimatePresence } from "framer-motion";
import { MoveSplash } from "@/components/blitz/MoveSplash";
import { VerdictReveal } from "@/components/blitz/VerdictReveal";
```

- [ ] **Step 4: Typecheck + build + browser**

Run: `npx tsc --noEmit` → PASS. `npx next build` → compiles.
Browser: run a blitz match; confirm splashes slam in on tagged turns, the verdict reveals in-scene, and toggling reduce-motion (in-app toggle) removes the transitions and shows static splash/verdict text.

- [ ] **Step 5: Commit**

```bash
git add src/components/blitz/
git commit -m "feat(blitz): add move splash + in-scene verdict (framer-motion, reduce-motion safe)"
```

---

### Task 14: Accessible transcript + reduce-motion completeness

**Files:**
- Create: `src/components/blitz/BlitzTranscript.tsx`
- Modify: `src/components/blitz/BlitzStage.tsx`

**Interfaces:**
- `BlitzTranscript` props: `{ session: DebateSession; messages: DebateMessage[]; verdict: DebateVerdict | null }`.

**Design notes:**
- Always-rendered visually-hidden live region listing each completed line ("Speaker (MOVE): text") so screen readers follow the match — mirror the `aria-live` pattern already used in the debate arena (grep the repo for `aria-live` to match the existing approach).
- A visible "Transcript" toggle button reveals the same content as normal cards for replay/readers.

- [ ] **Step 1: Create `BlitzTranscript.tsx`**

```tsx
"use client";
import { useState } from "react";
import type { DebateMessage, DebateSession, DebateVerdict } from "@/lib/debate/debateTypes";

function speakerName(session: DebateSession, s: DebateMessage["speaker"]) {
  return s === "modelA" ? session.modelA.displayName : s === "modelB" ? session.modelB.displayName : "Judge";
}

export function BlitzTranscript({
  session, messages, verdict,
}: { session: DebateSession; messages: DebateMessage[]; verdict: DebateVerdict | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* SR live region — always present, visually hidden */}
      <div aria-live="polite" className="sr-only">
        {messages.map((m) => (
          <p key={m.id}>{speakerName(session, m.speaker)}{m.move ? ` (${m.move})` : ""}: {m.content}</p>
        ))}
        {verdict ? <p>Verdict: {verdict.summary}</p> : null}
      </div>

      <button onClick={() => setOpen((o) => !o)} className="mt-2 text-sm underline" aria-expanded={open}>
        {open ? "Hide transcript" : "Show transcript"}
      </button>
      {open ? (
        <div className="mt-2 space-y-2">
          {messages.map((m) => (
            <div key={m.id} className="rounded-lg border-2 border-ink bg-white p-3">
              <span className="font-bold">{speakerName(session, m.speaker)}</span>
              {m.move ? <span className="ml-2 text-xs">[{m.move}]</span> : null}
              <p className="text-ink">{m.content}</p>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
```

- [ ] **Step 2: Mount it in `BlitzStage`**

Below the dialogue area, add:
```tsx
      <BlitzTranscript session={session} messages={r.messages} verdict={r.verdict} />
```
with `import { BlitzTranscript } from "@/components/blitz/BlitzTranscript";`.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → PASS. `npx next build` → compiles.
Browser: with a screen reader (or by inspecting the DOM), confirm each completed line appears in the `aria-live` region; the visible toggle shows/hides the transcript.

- [ ] **Step 4: Commit**

```bash
git add src/components/blitz/BlitzTranscript.tsx src/components/blitz/BlitzStage.tsx
git commit -m "feat(blitz): accessible SR transcript + toggle for the stage"
```

---

### Task 15: Setup entry — Blitz mode card + roster-filtered picker

**Files:**
- Modify: `src/app/setup/page.tsx`
- Modify: `src/components/setup/ModelSelector.tsx` (accept an allow-list filter) OR filter at the setup level
- Reference: `src/lib/state/ArenaContext.tsx` (mode + config state)

**Interfaces:**
- Consumes: `blitzRosterModelIds`, `isBlitzModel` (Task 9); `MODE_OPTIONS` blitz entry (Task 4).
- Produces: selecting Blitz mode filters the fighter picker to the roster, forces `pace: "auto"` + `responseLength: "punchy"`, and hides the round-count / length / multi-battle controls for blitz.

**Design notes:**
- Read `setup/page.tsx` first to learn how mode is currently chosen and how config is written to `ArenaContext`. Debate is the only visible mode today (Discussion is hidden); add Blitz as a second visible mode card using the `MODE_OPTIONS` blitz entry.
- When `mode === "blitz"`: force `pace="auto"`, `responseLength="punchy"`, `roundCount` is irrelevant (blitz ignores it), and multi-battle "add battle" is disabled. Filter the fighter list to `blitzRosterModelIds()`.

- [ ] **Step 1: Add the Blitz mode card**

In `setup/page.tsx`, render a mode toggle including the `blitz` `MODE_OPTIONS` entry. On selecting Blitz, write to config: `mode:"blitz"`, `pace:"auto"`, `responseLength:"punchy"`. (Match the existing config-write pattern in `ArenaContext`.)

- [ ] **Step 2: Filter the fighter picker to the roster**

Pass an allow-list into the fighter selectors when `mode === "blitz"`. In `ModelSelector.tsx`, add an optional prop:
```tsx
  allowedModelIds?: string[]; // when set, only these models are selectable
```
and filter the rendered list:
```tsx
  const list = allowedModelIds
    ? MODEL_CATALOG.filter((m) => allowedModelIds.includes(m.id))
    : MODEL_CATALOG;
```
From `setup/page.tsx`, pass `allowedModelIds={mode === "blitz" ? blitzRosterModelIds() : undefined}`.

- [ ] **Step 3: Hide irrelevant blitz controls**

When `mode === "blitz"`, do not render the round-count selector, the length selector, the pace toggle, or the "add battle" button (blitz forces those). Keep topic, fighters, and judge.

- [ ] **Step 4: Guard the start action**

Ensure the "Start" handler for blitz builds the session via the existing `createDebateSession`/`createDebateSessions` path (blitz is 1v1, so a single session) and navigates to the debate page. No new route needed.

- [ ] **Step 5: Verify end-to-end**

Run: `npx tsc --noEmit` → PASS. `npx next build` → compiles.
Browser: pick Blitz → the picker shows only roster models, length/round/pace controls are hidden, Start launches the stage, the match plays through to an in-scene verdict, Rematch replays. Toggle reduce-motion mid-match and confirm instant text + no shake.

- [ ] **Step 6: Commit**

```bash
git add src/app/setup/page.tsx src/components/setup/ModelSelector.tsx
git commit -m "feat(blitz): setup entry with roster-filtered picker and forced blitz config"
```

---

### Task 16: Rate-limit alignment + docs + final verification

**Files:**
- Modify: `.env.example` (align `RL_TURN_PER_MIN` for the 8-turn burst)
- Modify: `docs/09_UX_FLOWS.md` (add the Blitz flow)
- Modify: `CLAUDE.md` (add Blitz to the feature set + mode note)
- Modify: `Debator-Launch-Checklist.md` (note Blitz Phase 1 shipped)

- [ ] **Step 1: Align the turn rate limit**

In `.env.example`, change:
```
RL_TURN_PER_MIN=8          # max /api/debate/turn requests per IP per window
```
to:
```
RL_TURN_PER_MIN=30         # max /api/debate/turn per IP per window (a Blitz match fires 8 in a burst)
```
(The code default is already 60; this only aligns the example so a copied env can't self-throttle one Blitz match.)

- [ ] **Step 2: Document the Blitz flow**

In `docs/09_UX_FLOWS.md`, add a short "Blitz Mode" section: 4 rounds / 8 turns, punchy length, auto pace, per-turn move splashes, buffer-4-then-stream generation, in-scene verdict, curated roster, reduce-motion collapses to captioned text. Reference the spec at `docs/superpowers/specs/2026-07-08-blitz-mode-design.md`.

- [ ] **Step 3: Update CLAUDE.md**

In the "Current Feature Set", add a bullet:
```
- Blitz Mode: a fast 4-round / 8-turn variant on an animated arena stage — per-turn move-tag splashes (OBJECTION/COUNTER/…), buffer-then-stream generation, in-scene verdict, curated ~12-model roster. Reuses the debate pipeline; punchy length is blitz-internal.
```
In "Current Status", note Blitz Phase 1 (panels, no bespoke art yet) has shipped and Phases 2–3 (art, hero SFX, OG) remain.

- [ ] **Step 4: Full verification pass**

Run: `npm run test` → Expected: ALL blitz suites pass (parseMove, blitzPlan, blitzPrompt, blitzValidators, blitzRoster, blitzBuffer).
Run: `npx tsc --noEmit` → PASS.
Run: `npx next build` → compiles, `/api/debate/turn` + the stage build clean.
Browser: full Blitz match start→verdict→rematch, once with motion on and once with reduce-motion on.

- [ ] **Step 5: Commit**

```bash
git add .env.example docs/09_UX_FLOWS.md CLAUDE.md Debator-Launch-Checklist.md
git commit -m "docs(blitz): document Blitz flow, align RL_TURN_PER_MIN, mark Phase 1 shipped"
```

---

## Self-Review

**Spec coverage:**
- §3 interjection = every turn is a move → Tasks 2, 3, 5, 6, 10, 13. ✓
- §3 judge decides, revealed in-scene → Task 13 (VerdictReveal). ✓
- §3/§7 persistent stage → Tasks 12, 13, 14. ✓
- §3/§9 bespoke-per-model as curated roster, panel fallback Phase 1 → Tasks 9, 12 (panels), roster filter Task 15. ✓
- §3 hybrid audio (synth now, hero MP3 Phase 2) → Task 10. ✓
- §4 4 rounds/8 turns, labels, punchy, auto → Tasks 4, 5, 7, 8. ✓
- §6 buffer-4-then-stream → Task 11. ✓
- §11 backend changes (types, prompt, plan, parseMove, validators, rate limit, setup) → Tasks 2, 4, 5, 6, 7, 15, 16. ✓
- §11 punchy not in Debate length UI → Task 15 Step 3 (length selector hidden for blitz; Debate selector unchanged, still lists short/medium/long only). ✓
- §8 reduce-motion everywhere → Tasks 11 (typewriter), 13 (splash/verdict), 14 (transcript). ✓
- §12 Phase 1 = playable on panels → all tasks; bespoke art (Phase 2) explicitly excluded. ✓
- §14 testing considerations → parseMove (T3), buffer (T11), validators (T7), roster fallback (T9/T12), reduce-motion (T13/T15), rate limit (T16). ✓

**Placeholder scan:** No "TBD/TODO". Two tasks say "read the file first and match the existing pattern" (buildSystemPrompt accumulation style in T5; DebateArena branch point in T12; ArenaContext write pattern in T15) — these are integration points where the exact surrounding code must be matched; the required change and its code are fully specified, only the insertion site is confirmed against real code. This is acceptable (not a logic placeholder).

**Type consistency:** `BlitzMove`, `BLITZ_MOVES`, `parseMove(): { move, content }`, `BLITZ_BUFFER`, `canStartPlayback(generated, total)`, `useBlitzRunner(session): BlitzRunnerState`, `FighterPanel`/`DialogueBox`/`MoveSplash`/`VerdictReveal`/`BlitzTranscript` prop shapes, and `isBlitzModel`/`blitzRosterModelIds` are used consistently across tasks. `canStartPlayback` is defined with `(generatedCount, totalTurns)` in Task 11 and called that way in the test and runner. ✓

**Known integration risks flagged for the implementer:** (a) `isSoundEnabled()` may need adding to `soundManager` (T11 Step 5 note); (b) results-page persistence — if `/result` needs the finished blitz session, thread an `onPersist` through `useBlitzRunner` mirroring `useDebateRunner` (T13 Step 2 note); (c) Tailwind token names (`arcade-blue`, `shadow-hard`, `font-display`, `paper`, `ink`, `arcade-green`) must be confirmed against `tailwind.config.ts` and corrected in the UI tasks.
