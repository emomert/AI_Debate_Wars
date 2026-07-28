"use client";

/**
 * Re-judging — change (or add) the judge AFTER the match ends.
 *
 * The debate transcript is locked; only the verdict is regenerated. The chosen
 * model is sent as a thirdModel judge override to /api/debate/verdict, the old
 * verdict moves into `session.pastVerdicts` (it was paid for — the cost summary
 * keeps counting it), and the new verdict replaces it on the page.
 *
 * Two exports:
 * - `RejudgeSection` — the judge picker + run button, chrome-free. Rendered
 *   inline inside the VerdictCard's footer ("Change the judge").
 * - `RejudgePanel` — a standalone card wrapping the section, used only when a
 *   COMPLETE match has NO verdict yet (e.g. the judge call failed).
 */

import { useEffect, useRef, useState } from "react";

import type {
  DebateSession,
  DebateVerdict,
  ModelRef,
} from "@/lib/debate/debateTypes";
import { getModelById, type ModelCatalogEntry } from "@/lib/models/modelRegistry";
import { generateVerdict } from "@/lib/api/debateClient";
import { recomputeCostSummary } from "@/lib/cost/calculateCost";
import { toAppError, type AppErrorShape } from "@/lib/utils/errors";
import { playSound, playVerdictRoll, stopDrumRoll } from "@/lib/audio/soundManager";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { ModelSelector } from "@/components/setup/ModelSelector";
import type { ProviderAvailability } from "@/lib/state/ArenaContext";
import { useT } from "@/lib/i18n/LocaleProvider";

interface RejudgeSectionProps {
  session: DebateSession;
  availability?: ProviderAvailability | null;
  /** Receives the updated session (new verdict + honest cost) to persist. */
  onSession: (session: DebateSession) => void;
  /** Called after a successful re-judge (parents collapse the section). */
  onDone?: () => void;
}

export function RejudgeSection({
  session,
  availability,
  onSession,
  onDone,
}: RejudgeSectionProps) {
  const d = useT();
  // Start with NO selection so "Run the new verdict" can't immediately re-bill
  // the same judge — the copy promises a *different* judge, so force a pick.
  const [judgeId, setJudgeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppErrorShape | null>(null);

  // Abort an in-flight re-judge if the user navigates away mid-deliberation.
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      controllerRef.current?.abort();
      stopDrumRoll();
    },
    [],
  );

  const fighterIds = [session.modelA.modelId, session.modelB.modelId];
  const judgeIsFighter = judgeId !== "" && fighterIds.includes(judgeId);

  const rejudge = async (entry: ModelCatalogEntry | null) => {
    if (!entry || busy) return;
    setBusy(true);
    setError(null);
    playSound("judgeEnter");

    const controller = new AbortController();
    controllerRef.current = controller;
    const model: ModelRef = { providerId: entry.providerId, modelId: entry.id };
    // Only the judge config changes — the transcript is sent as-is, so the
    // server re-validates the same finished debate and judges it fresh.
    const judged: DebateSession = {
      ...session,
      judge: { enabled: true, mode: "thirdModel", model },
    };

    try {
      const verdict: DebateVerdict = await generateVerdict(judged, controller.signal);
      // Same drum-roll reveal as the live arena (resolves instantly if muted).
      await playVerdictRoll(controller.signal);
      // playVerdictRoll RESOLVES (doesn't reject) on abort, so guard here —
      // otherwise a re-judge finishing after the user hit Rematch would call
      // onSession and clobber the freshly-started match (mirrors the runner).
      if (controller.signal.aborted) return;
      const updated: DebateSession = {
        ...judged,
        // Re-judging only runs on a complete transcript, so a session that was
        // stopped during the verdict phase becomes genuinely complete now.
        status: "complete",
        verdict,
        pastVerdicts: session.verdict
          ? [...(session.pastVerdicts ?? []), session.verdict]
          : session.pastVerdicts,
        updatedAt: new Date().toISOString(),
      };
      updated.costSummary = recomputeCostSummary(updated);
      onSession(updated);
      onDone?.();
    } catch (err) {
      stopDrumRoll();
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        playSound("error");
        setError(toAppError(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <ModelSelector
        label={d.result.rejudge.newJudge}
        accent="purple"
        selectedId={judgeId}
        onSelect={(entry) => setJudgeId(entry.id)}
        availability={availability}
      />

      {judgeIsFighter ? (
        <p className="rounded-card border-3 border-arcade-orange bg-arcade-orange/15 p-3 text-sm font-semibold text-ink">
          {d.result.rejudge.fighterWarning}
        </p>
      ) : null}

      {error ? (
        <div className="rounded-card border-3 border-arcade-red bg-arcade-red/10 p-3">
          <p className="font-heading text-sm font-extrabold">
            {d.debate.errors[error.code].title}
          </p>
          <p className="mt-0.5 text-sm text-ink/70">
            {d.debate.errors[error.code].body}
          </p>
        </div>
      ) : null}

      <ArcadeButton
        variant="primary-yellow"
        disabled={judgeId === "" || busy}
        onClick={() => void rejudge(getModelById(judgeId) ?? null)}
      >
        {busy ? d.result.rejudge.deliberating : d.result.rejudge.runVerdict}
      </ArcadeButton>
    </div>
  );
}

interface RejudgePanelProps {
  session: DebateSession;
  availability?: ProviderAvailability | null;
  onSession: (session: DebateSession) => void;
}

/** Standalone "add a judge" card — for complete matches with no verdict. */
export function RejudgePanel({ session, availability, onSession }: RejudgePanelProps) {
  const d = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-card border-4 border-ink bg-card p-4 shadow-hard-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-heading text-base font-extrabold">
            {d.result.rejudge.addJudgeTitle}
          </p>
          <p className="mt-0.5 text-sm text-ink/60">
            {d.result.rejudge.addJudgeBody}
          </p>
        </div>
        <ArcadeButton
          variant="neutral-white"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? d.result.rejudge.close : d.result.rejudge.pickJudge}
        </ArcadeButton>
      </div>

      {open ? (
        <div className="mt-4">
          <RejudgeSection
            session={session}
            availability={availability}
            onSession={onSession}
            onDone={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
