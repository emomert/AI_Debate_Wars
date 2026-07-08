"use client";

/**
 * DebateArena — the live match. A match is one OR MORE battles (fighter pairings)
 * on the same topic, all running concurrently. This component is the parent: it
 * mounts one BattleController per battle (so they all run at once), renders a tab
 * bar to switch between them, and owns the shared chrome — global pace, the
 * single voicePlayer, the clean battle-switch, and stop-all.
 *
 * A single-battle match renders exactly one BattleController with no tab bar, so
 * the experience is identical to the original single-arena.
 *
 * The app drives everything here; no provider is ever called.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";

import { useArena } from "@/lib/state/ArenaContext";
import type { DebatePace, DebateSession } from "@/lib/debate/debateTypes";
import type { RunnerPhase } from "@/lib/debate/useDebateRunner";
import { voicePlayer } from "@/lib/tts/voicePlayer";
import { stopDrumRoll } from "@/lib/audio/soundManager";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils/cn";
import { formatCost } from "@/lib/utils/format";

import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { Badge } from "@/components/game/Badge";
import {
  BattleController,
  type BattleControls,
  type BattleSnapshot,
} from "@/components/debate/BattleController";
import { BlitzStage } from "@/components/blitz/BlitzStage";

export function DebateArena() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const {
    sessions,
    activeBattleIndex,
    setActiveBattleIndex,
    updateSession,
    startMatch,
    hydrated,
  } = useArena();

  if (sessions.length === 0) {
    return <EmptyArena hydrated={hydrated} onNewSetup={() => router.push("/setup")} />;
  }

  // Blitz mode renders the dedicated animated stage instead of the transcript
  // cards + tab chrome. Blitz is always 1v1, so there's exactly one session.
  if (sessions[0].mode === "blitz") {
    return <BlitzStage key={sessions[0].id} session={sessions[0]} />;
  }

  // Key by the match identity so a rematch (new sessions) gives MatchArena fresh
  // local state, while per-turn session updates (same ids) never remount it.
  const matchKey = sessions[0].matchSetId ?? sessions[0].id;
  return (
    <MatchArena
      key={matchKey}
      sessions={sessions}
      activeBattleIndex={activeBattleIndex}
      setActiveBattleIndex={setActiveBattleIndex}
      updateSession={updateSession}
      reduce={Boolean(reduce)}
      onRestart={() => startMatch()}
      onNewSetup={() => router.push("/setup")}
      onResults={() => router.push("/result")}
    />
  );
}

function EmptyArena({
  hydrated,
  onNewSetup,
}: {
  hydrated: boolean;
  onNewSetup: () => void;
}) {
  const d = useT();
  return (
    <GamePanel className="text-center">
      <p className="font-heading text-2xl font-extrabold">
        {hydrated ? d.debate.empty.titleReady : d.debate.empty.titleLoading}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
        {hydrated ? d.debate.empty.bodyReady : d.debate.empty.bodyLoading}
      </p>
      {hydrated ? (
        <div className="mt-5 flex justify-center">
          <ArcadeButton variant="primary-green" onClick={onNewSetup}>
            {d.debate.empty.setUpMatch}
          </ArcadeButton>
        </div>
      ) : null}
    </GamePanel>
  );
}

interface MatchArenaProps {
  sessions: DebateSession[];
  activeBattleIndex: number;
  setActiveBattleIndex: (i: number) => void;
  updateSession: (i: number, s: DebateSession) => void;
  reduce: boolean;
  onRestart: () => void;
  onNewSetup: () => void;
  onResults: () => void;
}

function MatchArena({
  sessions,
  activeBattleIndex,
  setActiveBattleIndex,
  updateSession,
  reduce,
  onRestart,
  onNewSetup,
  onResults,
}: MatchArenaProps) {
  const multi = sessions.length > 1;

  // Shared pace for the whole match — the watched battle honors it; background
  // battles always run auto. Seeded from the configured pace (this component is
  // keyed per match, so the initializer sees the right session).
  const [globalPace, setGlobalPace] = useState<DebatePace>(() => sessions[0]?.pace ?? "manual");
  const [snapshots, setSnapshots] = useState<(BattleSnapshot | null)[]>(() =>
    sessions.map(() => null),
  );
  const controlsRef = useRef<(BattleControls | null)[]>([]);

  const handleState = useCallback((i: number, snap: BattleSnapshot) => {
    setSnapshots((prev) => {
      const copy = prev.slice();
      copy[i] = snap;
      return copy;
    });
  }, []);

  const registerControls = useCallback((i: number, controls: BattleControls | null) => {
    controlsRef.current[i] = controls;
  }, []);

  const toggleGlobalPace = useCallback(() => {
    setGlobalPace((p) => (p === "auto" ? "manual" : "auto"));
  }, []);

  // Defensive clamp — index never outruns the session list.
  const activeIndex = Math.min(Math.max(0, activeBattleIndex), sessions.length - 1);

  // Clean switch: finish the leaving battle's current turn (so nothing is cut
  // off mid-sentence) and silence its voice, then show the chosen battle. The
  // leaving battle keeps running in the background (its pace flips to auto via
  // BattleController's effect once it's no longer active).
  const switchTo = useCallback(
    (i: number) => {
      if (i === activeIndex) return;
      voicePlayer.stop();
      // The leaving battle may be mid verdict drum-roll on the SHARED audio
      // element; silence it so it doesn't bleed over the battle we're switching
      // to (only the active/audible battle ever started it).
      stopDrumRoll();
      controlsRef.current[activeIndex]?.skipTurn();
      setActiveBattleIndex(i);
    },
    [activeIndex, setActiveBattleIndex],
  );

  // Stop the whole match — every battle, not just the watched one.
  const stopAll = useCallback(() => {
    controlsRef.current.forEach((c) => c?.stop());
  }, []);

  // Leaving the arena silences the (single, shared) voice + drum-roll players.
  useEffect(
    () => () => {
      voicePlayer.stop();
      stopDrumRoll();
    },
    [],
  );

  const terminal = (s: BattleSnapshot | null) =>
    !!s && (s.phase === "done" || s.phase === "stopped" || s.phase === "error");
  const doneCount = sessions.filter((_, i) => terminal(snapshots[i])).length;
  // Multi-battle: results open once EVERY battle is finished (so navigating away
  // doesn't abort battles still in flight). Single battle: as before (has turns).
  const resultsReady = multi
    ? sessions.every((_, i) => terminal(snapshots[i]))
    : // Single battle: read straight from the session (synchronous) so the
      // "See Results" button never flashes disabled waiting for the lifted
      // snapshot — byte-identical to the old hasMessages check.
      sessions[0].messages.length > 0;
  const allBattlesCost = snapshots.reduce((sum, s) => sum + (s?.costUsd ?? 0), 0);

  return (
    <div>
      {multi ? (
        <BattleTabs
          sessions={sessions}
          snapshots={snapshots}
          activeIndex={activeIndex}
          onSelect={switchTo}
          doneCount={doneCount}
          allBattlesCost={allBattlesCost}
        />
      ) : null}

      {sessions.map((s, i) => (
        <BattleController
          key={s.id}
          session={s}
          index={i}
          isActive={i === activeIndex}
          globalPace={globalPace}
          resultsReady={resultsReady}
          reduce={reduce}
          onPersist={(next) => updateSession(i, next)}
          onState={handleState}
          registerControls={registerControls}
          onToggleGlobalPace={toggleGlobalPace}
          onStop={stopAll}
          onRestart={onRestart}
          onNewSetup={onNewSetup}
          onResults={onResults}
        />
      ))}
    </div>
  );
}

const PHASE_DOT: Record<RunnerPhase, string> = {
  thinking: "bg-arcade-yellow",
  streaming: "bg-arcade-green",
  judging: "bg-arcade-purple",
  awaiting: "bg-arcade-blue",
  done: "bg-ink/40",
  stopped: "bg-arcade-red",
  error: "bg-arcade-red",
};

function BattleTabs({
  sessions,
  snapshots,
  activeIndex,
  onSelect,
  doneCount,
  allBattlesCost,
}: {
  sessions: DebateSession[];
  snapshots: (BattleSnapshot | null)[];
  activeIndex: number;
  onSelect: (i: number) => void;
  doneCount: number;
  allBattlesCost: number;
}) {
  const d = useT();
  return (
    <div className="mb-3">
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1" role="group" aria-label="Battles">
        {sessions.map((s, i) => {
          const snap = snapshots[i];
          const active = i === activeIndex;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              aria-label={d.debate.battles.tabAria(i + 1)}
              onClick={() => onSelect(i)}
              className={cn(
                "min-w-[150px] shrink-0 rounded-card border-4 border-ink p-2 text-left transition focus-visible:outline-3 focus-visible:outline-offset-2",
                active
                  ? "bg-night text-white shadow-hard"
                  : "bg-surface shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-heading text-sm font-extrabold">
                  {d.debate.battles.tab(i + 1)}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full border-2 border-ink",
                    snap ? PHASE_DOT[snap.phase] : "bg-ink/20",
                  )}
                />
              </div>
              <div
                className={cn(
                  "mt-0.5 truncate text-[11px] font-semibold",
                  active ? "text-white/70" : "text-ink/60",
                )}
              >
                {s.modelA.displayName} {d.debate.battles.vs} {s.modelB.displayName}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={cn(
                    "font-mono text-[10px] font-bold",
                    active ? "text-white/60" : "text-ink/45",
                  )}
                >
                  R{snap?.currentRound ?? 1}/{snap?.totalRounds ?? s.roundCount}
                </span>
                {snap?.hasVerdict && snap.winner === "modelA" ? (
                  <Badge color="blue" size="sm">
                    <span aria-hidden>🏆 A</span>
                    <span className="sr-only">{d.debate.battles.winnerA}</span>
                  </Badge>
                ) : snap?.hasVerdict && snap.winner === "modelB" ? (
                  <Badge color="red" size="sm">
                    <span aria-hidden>🏆 B</span>
                    <span className="sr-only">{d.debate.battles.winnerB}</span>
                  </Badge>
                ) : snap?.hasVerdict && snap.winner === "tie" ? (
                  <Badge color="white" size="sm">
                    <span aria-hidden>🤝</span>
                    <span className="sr-only">{d.debate.battles.winnerTie}</span>
                  </Badge>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-bold text-ink/55">
        <span>{d.debate.battles.finishedCount(doneCount, sessions.length)}</span>
        <span className="inline-flex items-center gap-1 rounded-btn border-2 border-ink bg-night px-1.5 py-0.5 font-mono text-arcade-green">
          <span aria-hidden>💰</span>
          {formatCost(allBattlesCost)} · {d.debate.battles.allBattles}
        </span>
      </div>
    </div>
  );
}
