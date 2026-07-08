"use client";

/**
 * useBlitzRunner — the Blitz-mode playback engine.
 *
 * Separate from useDebateRunner because Blitz plays differently: it pre-generates
 * turns into a buffer, then STREAMS playback while the rest generate in the
 * background (buffer-then-stream, like video). Each turn can carry a rhetorical
 * `move` that drives a full-frame splash before the line types out. Auto pace
 * only. Reduce-motion collapses the typewriter to instant text. The app still
 * owns the flow — generation is sequential over the fixed turn list, never a loop.
 */

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
import { playSound } from "@/lib/audio/soundManager";
import { canStartPlayback } from "@/lib/debate/blitzBuffer";

export type BlitzPhase =
  | "intro"
  | "roundTitle"
  | "speaking"
  | "moveSplash"
  | "verdict"
  | "done"
  | "error";

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

const INTRO_FLOOR_MS = 1200;
const ROUND_TITLE_MS = 700;
const MOVE_SPLASH_MS = 450;
const BETWEEN_TURNS_MS = 300;
const TYPE_MIN_MS = 500;
const TYPE_PER_CHAR_MS = 12;
const TYPE_FRAME_MS = 33;
const POLL_MS = 120;
const RETRY_BASE_MS = 500;
const MAX_ATTEMPTS = 4;

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("aborted", "AbortError"));
    const onAbort = () => {
      clearTimeout(id);
      reject(new DOMException("aborted", "AbortError"));
    };
    const id = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

export function useBlitzRunner(initialSession: DebateSession): BlitzRunnerState {
  const [state, setState] = useState<Omit<BlitzRunnerState, "replay">>(() => ({
    phase: "intro",
    roundLabel: null,
    speaker: null,
    line: "",
    move: null,
    messages: [],
    verdict: null,
    error: null,
    bufferedCount: 0,
    totalTurns: initialSession.turns.length,
  }));
  const [runToken, setRunToken] = useState(0);
  const reduceMotion = useReduceMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;

  const replay = useCallback(() => setRunToken((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const sfx = (k: Parameters<typeof playSound>[0]) => playSound(k); // no-ops when muted

    // Fresh working copy so completed turns can drive the transcript check.
    const working: DebateSession = {
      ...initialSession,
      turns: initialSession.turns.map((t) => ({ ...t, status: "pending" })),
      messages: [],
    };
    const generated: DebateMessage[] = [];

    // Reset state for a replay.
    setState((p) => ({
      ...p,
      phase: "intro",
      roundLabel: null,
      speaker: null,
      line: "",
      move: null,
      messages: [],
      verdict: null,
      error: null,
      bufferedCount: 0,
    }));

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
      const frames = Math.max(1, Math.ceil(total / TYPE_FRAME_MS));
      for (let i = 1; i <= frames; i++) {
        if (signal.aborted) return;
        const shown = Math.ceil((text.length * i) / frames);
        setState((p) => ({ ...p, line: text.slice(0, shown) }));
        await delay(TYPE_FRAME_MS, signal);
      }
      setState((p) => ({ ...p, line: text }));
    }

    async function run() {
      try {
        const total = working.turns.length;

        // Absorb React StrictMode's dev mount→unmount→mount: this initial delay
        // is aborted by the first unmount BEFORE any paid generateTurn fires, so
        // the turn isn't generated (and billed) twice in development.
        await delay(200, signal);

        // Generate all turns sequentially in the background (turn n needs 1..n-1).
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
        genAll.catch(() => {}); // per-turn failures surface via the playback await below

        // VS intro: floor + wait for the buffer to fill (or a fatal gen error).
        await delay(INTRO_FLOOR_MS, signal);
        while (!canStartPlayback(generated.length, total)) {
          if (signal.aborted) return;
          // If generation died before filling the buffer, surface it.
          const settled = await Promise.race([genAll.then(() => "done").catch((e) => e), delay(POLL_MS, signal).then(() => null)]);
          if (settled && settled !== "done") throw settled;
        }

        // Playback.
        let lastRound = 0;
        for (let i = 0; i < total; i++) {
          if (signal.aborted) return;
          // Playback may outrun a slow generator — wait for this turn.
          while (generated.length <= i) {
            if (signal.aborted) return;
            const settled = await Promise.race([genAll.then(() => "done").catch((e) => e), delay(POLL_MS, signal).then(() => null)]);
            if (settled && settled !== "done" && generated.length <= i) throw settled;
          }
          const turn = working.turns[i];
          const msg = generated[i];

          if (turn.roundNumber !== lastRound) {
            lastRound = turn.roundNumber;
            setState((p) => ({
              ...p,
              phase: "roundTitle",
              roundLabel: turn.roundLabel,
              line: "",
              move: null,
              speaker: null,
            }));
            sfx("blitzRoundTitle");
            await delay(ROUND_TITLE_MS, signal);
          }

          if (msg.move) {
            setState((p) => ({ ...p, phase: "moveSplash", move: msg.move!, speaker: turn.speaker as "modelA" | "modelB", line: "" }));
            sfx(msg.move === "TOUCHE" || msg.move === "RECEIPTS" ? "blitzHit" : "blitzObjection");
            await delay(MOVE_SPLASH_MS, signal);
          }

          setState((p) => ({
            ...p,
            phase: "speaking",
            speaker: turn.speaker as "modelA" | "modelB",
            move: msg.move ?? null,
            line: "",
          }));
          sfx("blitzWhoosh");
          await typeLine(msg.content);
          setState((p) => ({ ...p, messages: generated.slice(0, i + 1) }));
          await delay(BETWEEN_TURNS_MS, signal);
        }

        // Judge.
        if (working.judge.enabled) {
          let verdict: DebateVerdict | undefined;
          let attempt = 0;
          for (;;) {
            try {
              verdict = await generateVerdict(working, signal);
              break;
            } catch (err) {
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
