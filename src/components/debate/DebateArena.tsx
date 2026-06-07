"use client";

/**
 * DebateArena — the live debate experience. It owns the Phase 1 playback runner,
 * lays out the two fighter cards + central timeline (responsive: side columns on
 * desktop, a stacked row on mobile), shows the verdict reveal, and wires the
 * stop / rematch / results controls.
 *
 * The app drives everything here; no provider is ever called.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { useArena } from "@/lib/state/ArenaContext";
import { useDebateRunner } from "@/lib/debate/useDebateRunner";
import type { DebateSession } from "@/lib/debate/debateTypes";
import { MODE_OPTIONS } from "@/lib/constants";
import { isDebateComplete } from "@/lib/debate/orchestrator";
import { friendlyMessage } from "@/lib/utils/errors";

import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { Badge } from "@/components/game/Badge";
import { AIModelCard, type ModelCardStatus } from "@/components/debate/AIModelCard";
import { DebateHUD } from "@/components/debate/DebateHUD";
import { DebateTimeline } from "@/components/debate/DebateTimeline";
import { DebateControls } from "@/components/debate/DebateControls";
import { VerdictCard } from "@/components/debate/VerdictCard";
import { RejudgePanel } from "@/components/result/RejudgePanel";
import { SharePanel } from "@/components/result/SharePanel";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Lazy + config-gated so the Supabase SDK stays off the /debate bundle when
// auth is off, and otherwise loads only after hydration.
const MatchSaver = dynamic(
  () => import("@/components/result/MatchSaver").then((m) => m.MatchSaver),
  { ssr: false },
);
const arenaAuthEnabled = isSupabaseConfigured();

export function DebateArena() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { session, setSession, startMatch, hydrated } = useArena();

  // The runner persists progress after each turn so navigating away and back
  // resumes instead of re-charging completed turns.
  const activeSession = session;

  return activeSession ? (
    <ArenaInner
      key={activeSession.id}
      session={activeSession}
      reduce={Boolean(reduce)}
      onPersist={setSession}
      onRestart={() => startMatch()}
      onNewSetup={() => router.push("/setup")}
      onResults={() => router.push("/result")}
    />
  ) : (
    <EmptyArena hydrated={hydrated} onNewSetup={() => router.push("/setup")} />
  );
}

function EmptyArena({
  hydrated,
  onNewSetup,
}: {
  hydrated: boolean;
  onNewSetup: () => void;
}) {
  return (
    <GamePanel className="text-center">
      <p className="font-heading text-2xl font-extrabold">
        {hydrated ? "No match in the arena yet" : "Loading the arena…"}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
        {hydrated
          ? "Set up a topic and two fighters to start a debate."
          : "Hang tight while we set the stage."}
      </p>
      {hydrated ? (
        <div className="mt-5 flex justify-center">
          <ArcadeButton variant="primary-green" onClick={onNewSetup}>
            ⚙️ Set up a match
          </ArcadeButton>
        </div>
      ) : null}
    </GamePanel>
  );
}

interface ArenaInnerProps {
  session: DebateSession;
  reduce: boolean;
  onPersist: (s: DebateSession) => void;
  onRestart: () => void;
  onNewSetup: () => void;
  onResults: () => void;
}

function ArenaInner({
  session,
  reduce,
  onPersist,
  onRestart,
  onNewSetup,
  onResults,
}: ArenaInnerProps) {
  // Note: the runner's typewriter intentionally ignores reduced-motion so every
  // visitor gets the same playback; `reduce` only tones down decorative motion.
  const runner = useDebateRunner(session, { onPersist });
  // For the end-of-match Rejudge/Share panels: availability + a way to swap in a
  // re-judged session. `session` already carries the persisted verdict once the
  // match completes, and a re-judge updates it via setSession.
  const { availability, setSession } = useArena();
  const doneVerdict = session.verdict ?? runner.verdict;
  // When the match is done, the persisted session cost is authoritative (an
  // in-arena re-judge updates it but not the runner's frozen internal verdict).
  const doneCostSummary =
    runner.phase === "done" ? session.costSummary : runner.costSummary;

  const roles = useMemo(() => {
    const opt = MODE_OPTIONS.find((m) => m.id === session.mode)!;
    return { a: opt.modelARole, b: opt.modelBRole };
  }, [session.mode]);

  const statusFor = (speaker: "modelA" | "modelB"): ModelCardStatus => {
    if (runner.phase === "stopped") return "idle";
    if (runner.activeTurn?.speaker === speaker) {
      return runner.phase === "streaming" ? "speaking" : "thinking";
    }
    if (runner.phase === "done") return "finished";
    return "idle";
  };

  // The runner persists the stopped session itself (from its working copy), so
  // here we just signal the stop. Stable so memoized controls don't churn.
  const handleStop = useCallback(() => runner.stop(), [runner.stop]);

  const activeModelName = runner.activeTurn
    ? runner.activeTurn.speaker === "modelB"
      ? session.modelB.displayName
      : session.modelA.displayName
    : undefined;
  const announcement =
    runner.phase === "thinking"
      ? `${activeModelName ?? "A fighter"} is ${session.deepDebate ? "researching the web" : "thinking"}. Round ${runner.currentRound} of ${runner.totalRounds}.`
      : runner.phase === "streaming"
        ? `${activeModelName ?? "A fighter"} is responding. Round ${runner.currentRound} of ${runner.totalRounds}.`
        : runner.phase === "judging"
          ? "The judge is deliberating."
          : runner.phase === "awaiting"
            ? runner.awaitingKind === "verdict"
              ? "Rounds complete. Reveal the verdict when ready."
              : "Ready for the next turn. Press the button to continue."
            : runner.phase === "stopped"
              ? "Match stopped."
              : runner.phase === "error"
                ? "A problem interrupted the match."
                : runner.verdict
                  ? "Final verdict ready."
                  : "Debate complete.";

  // Stable so the memoized DebateHUD doesn't re-render every streaming frame.
  const togglePace = useCallback(
    () => runner.setPace(runner.pace === "auto" ? "manual" : "auto"),
    [runner.pace, runner.setPace],
  );

  // Brief "ROUND N" flash whenever the active round advances during play.
  const [flashRound, setFlashRound] = useState<number | null>(null);
  const prevRoundRef = useRef(runner.currentRound);
  useEffect(() => {
    const live = runner.phase === "thinking" || runner.phase === "streaming";
    if (live && runner.currentRound !== prevRoundRef.current) {
      setFlashRound(runner.currentRound);
    } else if (runner.phase === "stopped" || runner.phase === "error") {
      // Don't let a mid-flash banner linger over the stopped/error card.
      setFlashRound(null);
    }
    prevRoundRef.current = runner.currentRound;
  }, [runner.currentRound, runner.phase]);
  // Hide timer lives in its OWN effect keyed only on flashRound: in Fast mode
  // the phase flips within the flash window, and when the timer lived in the
  // effect above those re-runs cleared it — the banner never went away.
  useEffect(() => {
    if (flashRound == null) return;
    const t = setTimeout(() => setFlashRound(null), 1300);
    return () => clearTimeout(t);
  }, [flashRound]);

  const cardA = (
    <AIModelCard
      model={session.modelA}
      side="A"
      role={roles.a}
      stance={session.mode === "debate" ? "pro" : undefined}
      status={statusFor("modelA")}
    />
  );
  const cardB = (
    <AIModelCard
      model={session.modelB}
      side="B"
      role={roles.b}
      stance={session.mode === "debate" ? "against" : undefined}
      status={statusFor("modelB")}
    />
  );

  return (
    <div>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {/* Round-transition flash */}
      <AnimatePresence>
        {flashRound != null ? (
          <motion.div
            key={flashRound}
            aria-hidden
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pointer-events-none fixed inset-x-0 top-1/3 z-40 flex justify-center px-4"
          >
            <span className="rounded-modal border-4 border-ink bg-arcade-yellow px-6 py-3 font-display text-3xl shadow-hard-lg sm:text-5xl">
              ROUND {flashRound}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <DebateHUD
        mode={session.mode}
        currentRound={runner.currentRound}
        totalRounds={runner.totalRounds}
        roundLabel={runner.activeTurn?.roundLabel ?? runner.messages.at(-1)?.roundLabel}
        costSummary={doneCostSummary}
        phase={runner.phase}
        messageCount={runner.messages.length}
        activeModelName={activeModelName}
        pace={runner.pace}
        onTogglePace={togglePace}
      />

      {/* Topic bar */}
      <div className="mt-4 rounded-card border-4 border-ink bg-card p-3 shadow-hard-sm sm:p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink/45">
          Now debating
        </p>
        <h1 className="font-heading text-lg font-extrabold sm:text-2xl">
          {session.topic}
        </h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge color="blue" size="sm">A · {session.modelA.displayName}</Badge>
          <Badge color="red" size="sm">B · {session.modelB.displayName}</Badge>
          <Badge color="white" size="sm" className="max-w-[12rem] truncate">
            Tone: {session.tone === "custom" ? (session.customTone || "custom") : session.tone}
          </Badge>
          {session.deepDebate ? (
            <Badge color="purple" size="sm">🌐 Deep Debate</Badge>
          ) : (
            <Badge color="white" size="sm">{session.responseLength}</Badge>
          )}
        </div>
      </div>

      {/* Mobile fighter row */}
      <div className="mt-4 grid grid-cols-2 gap-2 lg:hidden">
        {cardA}
        {cardB}
      </div>

      {/* Desktop 3-column arena */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_240px]">
        <aside className="hidden lg:block">
          <div className="sticky top-[112px]">{cardA}</div>
        </aside>

        <div className="space-y-4">
          <DebateTimeline
            session={session}
            messages={runner.messages}
            activeTurn={runner.activeTurn}
            activeMessage={runner.activeMessage}
            streamingText={runner.streamingText}
            phase={runner.phase}
          />

          {runner.phase === "done" && doneVerdict ? (
            <VerdictCard
              verdict={doneVerdict}
              modelA={session.modelA}
              modelB={session.modelB}
            />
          ) : null}

          {runner.phase === "done" && isDebateComplete(session) && !session.judge.enabled ? (
            <div className="rounded-card border-3 border-dashed border-ink/40 bg-paper p-4 text-center text-sm text-ink/65">
              No judge this round — the debate ended after the final round.
            </div>
          ) : null}

          {/* Change the judge + share, right here at the arena end (feedback
              #3/#9) — not only on the results page. Gated on a genuinely complete
              match so a resumed STOPPED session doesn't show them. */}
          {runner.phase === "done" && isDebateComplete(session) ? (
            <RejudgePanel
              session={session}
              availability={availability}
              onSession={setSession}
            />
          ) : null}

          {runner.phase === "done" && (isDebateComplete(session) || session.verdict) ? (
            <SharePanel session={session} />
          ) : null}

          {runner.phase === "done" && isDebateComplete(session) && arenaAuthEnabled ? (
            <MatchSaver session={session} />
          ) : null}

          {runner.phase === "stopped" ||
          (runner.phase === "done" && session.status === "stopped") ? (
            <div className="rounded-card border-3 border-arcade-red bg-arcade-red/10 p-4 text-center">
              <p className="font-heading font-extrabold">Match stopped</p>
              <p className="mt-1 text-sm text-ink/65">
                You pulled the fighters out of the arena. You can rematch or view
                what happened so far.
              </p>
            </div>
          ) : null}

          {runner.phase === "awaiting" ? (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-card border-4 border-arcade-blue bg-arcade-blue/10 p-4 text-center"
            >
              <p className="font-heading text-lg font-extrabold">
                {runner.awaitingKind === "verdict" ? "🏆 The rounds are done" : "🎮 Your move"}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink/70">
                {runner.awaitingKind === "verdict"
                  ? "Reveal the judge's verdict when you're ready."
                  : "Reveal the next turn when you're ready — or flip to ⚡ Fast in the bar above to auto-play."}
              </p>
              <div className="mt-4 flex justify-center">
                <ArcadeButton variant="primary-green" size="lg" onClick={runner.next}>
                  {runner.awaitingKind === "verdict" ? "🏆 Reveal the Verdict" : "▶ Next Turn"}
                </ArcadeButton>
              </div>
            </motion.div>
          ) : null}

          {runner.phase === "error" && runner.error ? (
            <div className="rounded-card border-4 border-arcade-red bg-arcade-red/10 p-4 text-center">
              <p className="text-2xl" aria-hidden>
                ⚡
              </p>
              <p className="mt-1 font-heading text-lg font-extrabold">
                {friendlyMessage(runner.error.code).title}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink/70">
                {friendlyMessage(runner.error.code).body}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <ArcadeButton variant="primary-green" onClick={runner.retry}>
                  ↻ Retry turn
                </ArcadeButton>
                <ArcadeButton variant="neutral-white" onClick={onNewSetup}>
                  ⚙️ New Setup
                </ArcadeButton>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-[112px]">{cardB}</div>
        </aside>
      </div>

      <DebateControls
        phase={runner.phase}
        awaitingKind={runner.awaitingKind}
        hasMessages={runner.messages.length > 0}
        onStop={handleStop}
        onRestart={onRestart}
        onNewSetup={onNewSetup}
        onResults={onResults}
        onRetry={runner.retry}
        onNext={runner.next}
      />
    </div>
  );
}
