"use client";

/**
 * BattleController — one live battle (a single fighter pairing) inside a match.
 *
 * It owns ONE useDebateRunner instance and renders the full arena view (HUD,
 * timeline, verdict, controls) — but ONLY when it's the battle the user is
 * currently watching. Inactive battles stay mounted and keep running in the
 * background; they render nothing visible, make no sound, and never fetch voice.
 *
 * The parent (DebateArena) mounts one of these per battle (1–3), so several
 * debates run concurrently. Each reports a compact snapshot up (for the tab bar)
 * and registers its stop/skip controls so the parent can drive the active battle
 * and run a clean switch.
 *
 * A single-battle match mounts exactly one of these with isActive=true and
 * globalPace = the chosen pace, so behavior is identical to the old single-arena.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";

import { useArena } from "@/lib/state/ArenaContext";
import { useDebateRunner, type RunnerPhase } from "@/lib/debate/useDebateRunner";
import type {
  DebateMessage,
  DebatePace,
  DebateSession,
  Speaker,
  VerdictWinner,
} from "@/lib/debate/debateTypes";
import { isDebateComplete } from "@/lib/debate/orchestrator";
import { voicePlayer } from "@/lib/tts/voicePlayer";
import { useT } from "@/lib/i18n/LocaleProvider";

import { ArcadeButton } from "@/components/game/ArcadeButton";
import { AIModelCard, type ModelCardStatus } from "@/components/debate/AIModelCard";
import { DebateHUD } from "@/components/debate/DebateHUD";
import { DebateTimeline } from "@/components/debate/DebateTimeline";
import { DebateControls } from "@/components/debate/DebateControls";
import { VerdictCard } from "@/components/debate/VerdictCard";
import { RejudgePanel } from "@/components/result/RejudgePanel";
import { SharePanel } from "@/components/result/SharePanel";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const MatchSaver = dynamic(
  () => import("@/components/result/MatchSaver").then((m) => m.MatchSaver),
  { ssr: false },
);
const arenaAuthEnabled = isSupabaseConfigured();

/** Compact live status of one battle, lifted to the parent for the tab bar. */
export interface BattleSnapshot {
  phase: RunnerPhase;
  currentRound: number;
  totalRounds: number;
  activeSpeaker: Speaker | null;
  messageCount: number;
  costUsd: number;
  winner: VerdictWinner | null;
  hasVerdict: boolean;
}

/** Imperative handles the parent calls on the active / leaving battle. */
export interface BattleControls {
  stop: () => void;
  skipTurn: () => void;
}

interface BattleControllerProps {
  session: DebateSession;
  index: number;
  /** Is this the battle the user is currently watching? */
  isActive: boolean;
  /** The shared (global) pace. The active battle honors it; others run auto. */
  globalPace: DebatePace;
  /** Whether the "See Results" action is enabled (all battles done, etc.). */
  resultsReady: boolean;
  reduce: boolean;
  onPersist: (s: DebateSession) => void;
  onState: (index: number, snap: BattleSnapshot) => void;
  registerControls: (index: number, controls: BattleControls | null) => void;
  onToggleGlobalPace: () => void;
  /** Stop the whole match (every battle), not just this one. */
  onStop: () => void;
  onRestart: () => void;
  onNewSetup: () => void;
  onResults: () => void;
}

export function BattleController({
  session,
  index,
  isActive,
  globalPace,
  resultsReady,
  reduce,
  onPersist,
  onState,
  registerControls,
  onToggleGlobalPace,
  onStop,
  onRestart,
  onNewSetup,
  onResults,
}: BattleControllerProps) {
  const d = useT();
  const { availability } = useArena();

  // Live "am I the watched battle?" flag, read inside the runner's speech/audio
  // hooks so a switch takes effect immediately (without restarting the runner).
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  // Voice-over state (docs/21). The voicePlayer singleton owns the persisted
  // toggle, playback and cost; we mirror it into React state and feed the runner
  // a speak() hook. Background battles return a NOOP so no TTS is fetched.
  const speakOpts = {
    serverTts: availability?.tts ?? false,
    tone: session.tone,
    customTone: session.customTone,
  };
  const speakOptsRef = useRef(speakOpts);
  speakOptsRef.current = speakOpts;
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceCostUsd, setVoiceCostUsd] = useState(0);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  useEffect(() => {
    setVoiceEnabled(voicePlayer.hydrate());
    setVoiceCostUsd(voicePlayer.getCostUsd());
    const offEnabled = voicePlayer.subscribeEnabled(setVoiceEnabled);
    const offPlaying = voicePlayer.subscribePlaying(setSpeakingId);
    const offCost = voicePlayer.subscribeCost(setVoiceCostUsd);
    return () => {
      offEnabled();
      offPlaying();
      offCost();
      // NOTE: do NOT voicePlayer.stop() here — the singleton is shared, and the
      // parent (DebateArena) owns stopping it on its own unmount. A background
      // battle unmounting must never cut off the active battle's voice.
    };
  }, []);

  const prepareSpeech = useCallback(
    (m: DebateMessage, signal: AbortSignal) =>
      isActiveRef.current
        ? voicePlayer.prepare(m, speakOptsRef.current, signal)
        : Promise.resolve(null),
    [],
  );
  const isAudible = useCallback(() => isActiveRef.current, []);

  const runner = useDebateRunner(session, { onPersist, prepareSpeech, isAudible });

  // Apply the effective pace: the watched battle follows the global pace; every
  // background battle runs auto so it keeps advancing without a gate. Switching
  // battles re-runs this for both the leaving and arriving battle.
  const effectivePace: DebatePace = isActive ? globalPace : "auto";
  useEffect(() => {
    runner.setPace(effectivePace);
  }, [effectivePace, runner.setPace]);

  // Lift a compact snapshot for the tab bar (NOT on every typewriter frame —
  // only when a meaningful field changes).
  const activeSpeaker = runner.activeTurn?.speaker ?? null;
  const winner = runner.verdict?.winner ?? session.verdict?.winner ?? null;
  const hasVerdict = Boolean(runner.verdict ?? session.verdict);
  const costUsd =
    runner.phase === "done" ? session.costSummary.totalCost : runner.costSummary.totalCost;
  const onStateRef = useRef(onState);
  onStateRef.current = onState;
  useEffect(() => {
    onStateRef.current(index, {
      phase: runner.phase,
      currentRound: runner.currentRound,
      totalRounds: runner.totalRounds,
      activeSpeaker,
      messageCount: runner.messages.length,
      costUsd,
      winner,
      hasVerdict,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    index,
    runner.phase,
    runner.currentRound,
    runner.totalRounds,
    activeSpeaker,
    runner.messages.length,
    Math.round(costUsd * 1e6),
    winner,
    hasVerdict,
  ]);

  // Register imperative controls so the parent can stop-all + clean-switch.
  const registerControlsRef = useRef(registerControls);
  registerControlsRef.current = registerControls;
  useEffect(() => {
    registerControlsRef.current(index, { stop: runner.stop, skipTurn: runner.skipTurn });
    return () => registerControlsRef.current(index, null);
  }, [index, runner.stop, runner.skipTurn]);

  // The message currently being typed out, for replay-on-re-enable.
  const activeMessageRef = useRef<DebateMessage | null>(null);
  activeMessageRef.current = runner.activeMessage;

  const toggleVoice = useCallback(() => {
    const nowOn = voicePlayer.toggle();
    if (nowOn && activeMessageRef.current) {
      voicePlayer.replay(activeMessageRef.current, speakOptsRef.current);
    }
  }, []);

  const skip = useCallback(() => {
    voicePlayer.stop();
    runner.skipTurn();
  }, [runner.skipTurn]);

  // Stable per-message voice handle so DebateMessageCard's memo() actually holds.
  // The timeline calls voiceFor(m) for EVERY card on every typewriter frame;
  // returning a fresh {playing,onToggle} each time gave each completed card a
  // referentially-new prop and re-rendered it (+ its MarkdownText) ~30x/s. Cache
  // by message id, rebuilding only when THIS message's `playing` flips; onToggle
  // reads speakingId via a ref so it never changes identity.
  const speakingIdRef = useRef(speakingId);
  speakingIdRef.current = speakingId;
  const voiceCacheRef = useRef(new Map<string, { playing: boolean; onToggle: () => void }>());
  const voiceFor = useCallback(
    (m: DebateMessage) => {
      const playing = speakingId === m.id;
      const cached = voiceCacheRef.current.get(m.id);
      if (cached && cached.playing === playing) return cached;
      const onToggle =
        cached?.onToggle ??
        (() => {
          if (speakingIdRef.current === m.id) voicePlayer.stop();
          else voicePlayer.replay(m, speakOptsRef.current);
        });
      const handle = { playing, onToggle };
      voiceCacheRef.current.set(m.id, handle);
      return handle;
    },
    [speakingId],
  );

  const doneVerdict = session.verdict ?? runner.verdict;
  const doneCostSummary =
    runner.phase === "done" ? session.costSummary : runner.costSummary;

  const roles = useMemo(() => {
    const r = session.mode === "debate" ? d.debate.roles.debate : d.debate.roles.discussion;
    return { a: r.a, b: r.b };
  }, [session.mode, d]);

  const statusFor = (speaker: "modelA" | "modelB"): ModelCardStatus => {
    if (runner.phase === "stopped") return "idle";
    if (runner.activeTurn?.speaker === speaker) {
      return runner.phase === "streaming" ? "speaking" : "thinking";
    }
    if (runner.phase === "done") return "finished";
    return "idle";
  };

  const activeModelName = runner.activeTurn
    ? runner.activeTurn.speaker === "modelB"
      ? session.modelB.displayName
      : session.modelA.displayName
    : undefined;
  const announceName = activeModelName ?? d.debate.announce.fighterFallback;
  const announcement =
    runner.phase === "thinking"
      ? session.deepDebate
        ? d.debate.announce.researching(announceName, runner.currentRound, runner.totalRounds)
        : d.debate.announce.thinking(announceName, runner.currentRound, runner.totalRounds)
      : runner.phase === "streaming"
        ? d.debate.announce.responding(announceName, runner.currentRound, runner.totalRounds)
        : runner.phase === "judging"
          ? d.debate.announce.judging
          : runner.phase === "awaiting"
            ? runner.awaitingKind === "verdict"
              ? d.debate.announce.awaitingVerdict
              : d.debate.announce.awaitingNext
            : runner.phase === "stopped"
              ? d.debate.announce.stopped
              : runner.phase === "error"
                ? d.debate.announce.error
                : runner.verdict
                  ? d.debate.announce.verdictReady
                  : d.debate.announce.complete;

  // The HUD pace toggle flips the SHARED pace for the whole match.
  const togglePace = useCallback(() => onToggleGlobalPace(), [onToggleGlobalPace]);

  // Brief "ROUND N" flash whenever the active round advances during play.
  const [flashRound, setFlashRound] = useState<number | null>(null);
  const prevRoundRef = useRef(runner.currentRound);
  useEffect(() => {
    const live = runner.phase === "thinking" || runner.phase === "streaming";
    // Only the watched battle flashes "ROUND N" — a background battle advancing
    // rounds must not bleed an overlay onto the battle the user is viewing. We
    // still sync prevRoundRef while inactive so switching in later doesn't
    // retroactively fire a flash for a round it advanced through off-screen.
    if (isActiveRef.current && live && runner.currentRound !== prevRoundRef.current) {
      setFlashRound(runner.currentRound);
    } else if (!isActiveRef.current || runner.phase === "stopped" || runner.phase === "error") {
      setFlashRound(null);
    }
    prevRoundRef.current = runner.currentRound;
  }, [runner.currentRound, runner.phase]);
  useEffect(() => {
    if (flashRound == null) return;
    const t = setTimeout(() => setFlashRound(null), 1300);
    return () => clearTimeout(t);
  }, [flashRound]);

  // Screen-reader transcript (critical #5): the typewriter reveal is silent to
  // assistive tech, so without this a blind user hears the phase ping and never
  // learns a single argument. Announce each FINALIZED turn's text (model + round
  // + content) in a polite live region — keyed to completed messages, never the
  // per-frame typewriter, so it never spams. (The verdict announces via the
  // VerdictCard's own live region.)
  const [srTranscript, setSrTranscript] = useState("");
  const announcedCountRef = useRef(0);
  useEffect(() => {
    const msgs = runner.messages;
    if (!isActiveRef.current || msgs.length <= announcedCountRef.current) {
      announcedCountRef.current = msgs.length;
      return;
    }
    announcedCountRef.current = msgs.length;
    const m = msgs[msgs.length - 1];
    if (!m) return;
    const name =
      m.speaker === "judge"
        ? d.debate.message.judge
        : m.speaker === "modelB"
          ? session.modelB.displayName
          : session.modelA.displayName;
    setSrTranscript(`${name}${m.roundLabel ? `, ${m.roundLabel}` : ""}. ${m.content}`);
  }, [runner.messages, d, session.modelA.displayName, session.modelB.displayName]);

  // Inactive battles keep their runner + hooks alive but render nothing visible.
  if (!isActive) return null;

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
      {/* Finalized turn content for screen readers (critical #5). */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {srTranscript}
      </div>

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
              {d.debate.roundFlash(flashRound)}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <DebateHUD
        currentRound={runner.currentRound}
        totalRounds={runner.totalRounds}
        costSummary={doneCostSummary}
        phase={runner.phase}
        messageCount={runner.messages.length}
        toneText={d.debate.topic.tone(
          session.tone === "custom"
            ? (session.customTone || d.debate.topic.customTone)
            : session.tone,
        )}
        formatText={session.deepDebate ? d.debate.topic.deepDebate : session.responseLength}
        pace={runner.pace}
        onTogglePace={togglePace}
        voiceEnabled={voiceEnabled}
        onToggleVoice={toggleVoice}
        voiceCostUsd={voiceCostUsd}
        canSkip={runner.phase === "streaming"}
        onSkip={skip}
      />

      {/* Topic bar — just the topic; the fighters are on the side cards and the
          tone/length chips moved up into the HUD (July 2026 declutter). */}
      <div className="mt-4 rounded-card border-4 border-ink bg-card p-3 shadow-hard-sm sm:p-4">
        <h1 className="font-heading text-lg font-extrabold sm:text-2xl">
          {session.topic}
        </h1>
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
            voiceFor={voiceFor}
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
              {d.debate.noJudge}
            </div>
          ) : null}

          {runner.phase === "done" && isDebateComplete(session) ? (
            <RejudgePanel
              session={session}
              availability={availability}
              onSession={onPersist}
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
              <p className="font-heading font-extrabold">{d.debate.stoppedPanel.title}</p>
              <p className="mt-1 text-sm text-ink/65">
                {d.debate.stoppedPanel.body}
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
                {runner.awaitingKind === "verdict" ? d.debate.awaiting.verdictTitle : d.debate.awaiting.moveTitle}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink/70">
                {runner.awaitingKind === "verdict"
                  ? d.debate.awaiting.verdictBody
                  : d.debate.awaiting.moveBody}
              </p>
              <div className="mt-4 flex justify-center">
                <ArcadeButton variant="primary-green" size="lg" onClick={runner.next}>
                  {runner.awaitingKind === "verdict" ? d.debate.awaiting.revealVerdict : d.debate.awaiting.nextTurn}
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
                {d.debate.errors[runner.error.code].title}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink/70">
                {d.debate.errors[runner.error.code].body}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <ArcadeButton variant="primary-green" onClick={runner.retry}>
                  {d.debate.errorPanel.retryTurn}
                </ArcadeButton>
                {/* Completed rounds are still in memory — let the user salvage
                    them instead of only Retry / New Setup (which discards). */}
                {runner.messages.length > 0 ? (
                  <ArcadeButton variant="neutral-white" onClick={onResults}>
                    {d.debate.errorPanel.seeResults}
                  </ArcadeButton>
                ) : null}
                <ArcadeButton variant="neutral-white" onClick={onNewSetup}>
                  {d.debate.errorPanel.newSetup}
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
        hasMessages={resultsReady}
        onStop={onStop}
        onRestart={onRestart}
        onNewSetup={onNewSetup}
        onResults={onResults}
        onRetry={runner.retry}
        onNext={runner.next}
      />
    </div>
  );
}
