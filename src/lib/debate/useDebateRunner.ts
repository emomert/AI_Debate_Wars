"use client";

/**
 * useDebateRunner — the live-debate playback engine.
 *
 * The APP drives the flow: it walks the session's pre-planned turns IN ORDER,
 * and for each one it (1) shows a "thinking" beat, (2) calls the server route
 * `/api/debate/turn` to generate exactly ONE turn, (3) locks the turn in and
 * persists progress, then (4) reveals the text with a typewriter animation.
 * After every round it calls `/api/debate/verdict` if Judge Mode is on. No model
 * ever decides what happens next, and the turn list is finite — no chatbot loop.
 *
 * Progress is persisted after each turn (via onPersist), so navigating away and
 * back RESUMES from the next pending turn instead of re-charging completed ones.
 * Works identically in mock mode (no keys) and live mode (OpenAI/DeepSeek).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  DebateMessage,
  DebatePace,
  DebateSession,
  DebateTurn,
  DebateVerdict,
  SessionStatus,
} from "@/lib/debate/debateTypes";
import {
  recomputeCostSummary,
  summarizeSessionCost,
} from "@/lib/cost/calculateCost";
import { generateTurn, generateVerdict } from "@/lib/api/debateClient";
import { type AppErrorShape, type AppErrorCode, toAppError } from "@/lib/utils/errors";
import { useReduceMotion } from "@/lib/motion/useReduceMotion";
import {
  playKeystroke,
  playSound,
  playVerdictRoll,
  stopDrumRoll,
} from "@/lib/audio/soundManager";
import type { PreparedSpeech } from "@/lib/tts/voicePlayer";

export type RunnerPhase =
  | "thinking"
  | "streaming"
  | "judging"
  | "awaiting"
  | "done"
  | "stopped"
  | "error";

export type AwaitingKind = "turn" | "verdict";

// Deliberately unhurried so turns are readable (feedback: "debate is too fast").
const THINKING_MS = 850;
// Typewriter: true letter-by-letter at ~60fps, slow + human, with a synced
// keystroke sound. Per-char pace is clamped so even long turns stay bounded.
const TYPE_PER_CHAR_MS = 17; // base human-ish typing pace (35% faster)
const TYPE_MIN_TOTAL_MS = 1430; // 35% faster
const TYPE_MAX_TOTAL_MS = 7800; // 35% faster
// When voice is on the reveal is paced to the speech length, which can run far
// longer than a silent turn — a wide cap so a 40s voiced turn stays in sync.
const VOICE_TYPE_MAX_TOTAL_MS = 90_000;
const TYPE_FRAME_MS = 33; // ~30fps — half the re-renders of 60fps, still smooth
const TYPE_SOUND_INTERVAL_MS = 55; // throttle keystroke ticks (~18/sec max)
const SENTENCE_PAUSE_MS = 75; // half of before — shorter pause after . ! ? or newline
// A silent (background) battle paces its verdict reveal with this beat instead
// of the audible drum roll, so it never grabs the shared drum-roll element.
const VERDICT_REVEAL_SILENT_MS = 700;

// Silent background retries: if a generation fails, stay in the (non-alarming)
// "thinking"/"judging" state and quietly re-try with backoff before ever showing
// an error. Combined with the server's own retries this gives many attempts, so
// a model "not answering on the first try" self-heals invisibly.
const MAX_CLIENT_ATTEMPTS = 4;
const RETRY_BASE_MS = 600;
const RETRY_MAX_MS = 3000;
const CLIENT_RETRY_BUDGET_MS = 120_000; // overall ceiling so we never loop forever

// Only these (network blip / provider hiccup / transient rate-limit) are worth a
// silent client retry. Deterministic failures — bad key, invalid model, token
// ceiling, out of credits, bad request — fail fast to the error UI instead of
// being retried several times pointlessly.
const CLIENT_TRANSIENT: ReadonlySet<AppErrorCode> = new Set<AppErrorCode>([
  "PROVIDER_ERROR",
  "PROVIDER_TIMEOUT",
  "RATE_LIMITED",
  "UNKNOWN_ERROR",
]);

function isTransient(err: unknown): boolean {
  return CLIENT_TRANSIENT.has(toAppError(err).code);
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("aborted", "AbortError"));
    let id: ReturnType<typeof setTimeout>;
    // Named handler so it can be detached on resolve — otherwise every frame of
    // the typewriter (thousands per debate) leaks an abort listener on the
    // long-lived run signal.
    const onAbort = () => {
      clearTimeout(id);
      reject(new DOMException("aborted", "AbortError"));
    };
    id = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/** Decoupled clone so persisted state isn't mutated by later turns. */
function snapshot(s: DebateSession, status: SessionStatus): DebateSession {
  return {
    ...s,
    status,
    turns: s.turns.map((t) => ({ ...t })),
    messages: [...s.messages],
    // Always recompute from the actual messages (+ verdict) so EVERY persisted
    // snapshot — running, STOPPED, complete — carries an accurate total. (A
    // stopped match used to keep the zeroed initial summary, so Results showed
    // $0.00 next to a real per-fighter split.) recomputeCostSummary no-ops the
    // verdict branch when there's no verdict.
    costSummary: recomputeCostSummary(s),
    updatedAt: new Date().toISOString(),
  };
}

interface RunnerState {
  phase: RunnerPhase;
  messages: DebateMessage[];
  activeTurn: DebateTurn | null;
  /**
   * The locked-in message being revealed by the typewriter. Exposed so the
   * streaming card already knows its citations — [n] markers render as live
   * chips DURING typing instead of flipping from plain text at the end.
   */
  activeMessage: DebateMessage | null;
  streamingText: string;
  verdict: DebateVerdict | null;
  error: AppErrorShape | null;
  awaitingKind: AwaitingKind | null;
}

interface RunnerOptions {
  /** Called after each locked-in turn, on stop, and on completion. */
  onPersist?: (session: DebateSession) => void;
  /**
   * Optional voice-over. Called while still "thinking" (right after the turn
   * locks in) to fetch + ready the audio; the returned handle is played the
   * moment the typewriter starts so words appear AS they're spoken. Its
   * `durationMs` paces the text reveal to the speech. Must resolve quickly
   * (a no-op handle) when voice is off and never break the match — the
   * runner additionally swallows errors.
   */
  prepareSpeech?: (
    message: DebateMessage,
    signal: AbortSignal,
  ) => Promise<PreparedSpeech | null>;
  /**
   * Whether THIS runner may make sound right now. Defaults to always-audible, so
   * a single-battle match behaves byte-identically. In multi-battle mode only
   * the currently-viewed battle is audible — background battles run silent so 3
   * concurrent runners don't pile up overlapping keystrokes / stings / drum
   * rolls (the drum-roll element is a shared singleton). Read via a ref so a
   * live battle-switch takes effect immediately.
   */
  isAudible?: () => boolean;
}

export function useDebateRunner(
  initialSession: DebateSession,
  options: RunnerOptions = {},
) {
  const { onPersist, prepareSpeech, isAudible } = options;

  const alreadyFinished =
    (initialSession.status === "complete" || initialSession.status === "stopped") &&
    initialSession.messages.length > 0;

  const [state, setState] = useState<RunnerState>(() => ({
    phase: alreadyFinished ? "done" : "thinking",
    messages: initialSession.messages,
    activeTurn: null,
    activeMessage: null,
    streamingText: "",
    verdict: initialSession.verdict ?? null,
    error: null,
    awaitingKind: null,
  }));

  // Persistent working copy (preserves completed turns + messages for resume).
  const workingRef = useRef<DebateSession | null>(null);
  if (workingRef.current === null && !alreadyFinished) {
    workingRef.current = {
      ...initialSession,
      turns: initialSession.turns.map((t) => ({ ...t })),
      messages: [...initialSession.messages],
    };
  }

  const controllerRef = useRef<AbortController | null>(null);
  const onPersistRef = useRef(onPersist);
  onPersistRef.current = onPersist;
  const prepareSpeechRef = useRef(prepareSpeech);
  prepareSpeechRef.current = prepareSpeech;
  // Live "may I make sound?" check (default yes). Gated through `sfx`/`keystroke`
  // below so a background battle never steals the shared audio singletons.
  const audibleRef = useRef(isAudible);
  audibleRef.current = isAudible;
  const audible = () => audibleRef.current?.() ?? true;
  const sfx = (key: Parameters<typeof playSound>[0]) => {
    if (audible()) playSound(key);
  };
  const keystroke = () => {
    if (audible()) playKeystroke();
  };

  // Manual-pacing gate: when set, the loop is paused waiting for next()/auto.
  const gateRef = useRef<(() => void) | null>(null);
  // Per-turn "skip" controller: aborting it fast-forwards the typewriter to the
  // full text (the voice is stopped separately by the caller). Set only while a
  // turn is streaming; null otherwise.
  const skipRef = useRef<AbortController | null>(null);
  const paceRef = useRef<DebatePace>(initialSession.pace);
  const [pace, setPaceState] = useState<DebatePace>(initialSession.pace);

  const [runToken, setRunToken] = useState(0);
  // Set by retry() so the re-run skips the manual gate for the single retried
  // turn (otherwise "Retry turn" in Normal pacing bounces to the "Your move"
  // gate instead of actually retrying).
  const retryRef = useRef(false);

  // Reduced motion (OS flag or in-app toggle): skip the per-character typewriter
  // and reveal each turn instantly. The app-driven pacing/gates still apply. Read
  // via a ref so the long-lived run effect sees the live value without re-running.
  const reduceMotion = useReduceMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    if (audible()) stopDrumRoll(); // don't leave the suspense loop playing after a stop
    // (only the audible battle owns the shared drum-roll element)
    const w = workingRef.current;
    if (w) {
      onPersistRef.current?.(snapshot(w, "stopped"));
    }
    setState((prev) => ({
      ...prev,
      phase: "stopped",
      activeTurn: null,
      activeMessage: null,
      streamingText: "",
      messages: w ? w.messages : prev.messages,
    }));
  }, []);

  const retry = useCallback(() => {
    retryRef.current = true; // skip the gate for the turn we're retrying
    setState((prev) => ({ ...prev, error: null, phase: "thinking" }));
    setRunToken((t) => t + 1);
  }, []);

  /** Fast-forward the current turn's typewriter to the full text immediately. */
  const skipTurn = useCallback(() => {
    skipRef.current?.abort();
  }, []);

  /** Advance past a manual-pacing pause (the "Next turn" / "Reveal verdict" button). */
  const next = useCallback(() => {
    const release = gateRef.current;
    if (release) {
      gateRef.current = null;
      sfx("next");
      release();
    }
  }, []);

  /** Switch pacing live; flipping to auto releases any current pause. */
  const setPace = useCallback((p: DebatePace) => {
    paceRef.current = p;
    setPaceState(p);
    if (p === "auto") {
      const release = gateRef.current;
      if (release) {
        gateRef.current = null;
        release();
      }
    }
  }, []);

  useEffect(() => {
    if (alreadyFinished) return;
    const workingMaybe = workingRef.current;
    if (!workingMaybe) return;
    // Non-null binding so nested async closures keep the narrowed type.
    const working: DebateSession = workingMaybe;

    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;

    const persist = (status: SessionStatus) =>
      onPersistRef.current?.(snapshot(working, status));

    async function typewriter(content: string, targetMs?: number, skipSignal?: AbortSignal) {
      const total = content.length;
      // Deliberately NOT gated on prefers-reduced-motion: the typewriter is the
      // core experience and a text reveal isn't vestibular-trigger motion, so
      // every visitor gets the same playback. Decorative bounces elsewhere still
      // honor the OS setting.
      // Skip the per-frame typewriter entirely for reduced motion OR for a
      // BACKGROUND battle (not audible/watched) — its text is never on screen, so
      // running a ~30fps setState loop for it just burns the main thread (with up
      // to 3 concurrent battles, that's 2 invisible typewriters). Reveal instantly.
      if (total === 0 || reduceMotionRef.current || !audible()) {
        setState((p) => ({ ...p, streamingText: content }));
        return;
      }
      // Total reveal time scales with length but is clamped, so the per-character
      // cadence stays consistent and long turns don't drag forever. When voice is
      // on, `targetMs` is the speech length: pace the reveal to it (wider clamp)
      // so words appear roughly as they're spoken instead of racing ahead.
      const duration =
        targetMs && Number.isFinite(targetMs) && targetMs > 0
          ? Math.min(VOICE_TYPE_MAX_TOTAL_MS, Math.max(TYPE_MIN_TOTAL_MS, targetMs))
          : Math.min(TYPE_MAX_TOTAL_MS, Math.max(TYPE_MIN_TOTAL_MS, total * TYPE_PER_CHAR_MS));
      const charsPerFrame = total / (duration / TYPE_FRAME_MS);

      let revealed = 0; // fractional cursor position
      let shown = 0; // whole characters currently displayed
      let sinceSound = TYPE_SOUND_INTERVAL_MS; // tick on the very first character

      while (shown < total) {
        if (signal.aborted) throw new DOMException("aborted", "AbortError");
        // Skip pressed → reveal the whole turn instantly and stop typing.
        if (skipSignal?.aborted) {
          setState((p) => ({ ...p, streamingText: content }));
          return;
        }

        revealed = Math.min(total, revealed + charsPerFrame);
        const next = Math.floor(revealed);
        const grew = next > shown;
        if (grew) {
          shown = next;
          setState((p) => ({ ...p, streamingText: content.slice(0, shown) }));
        }

        sinceSound += TYPE_FRAME_MS;
        if (grew && sinceSound >= TYPE_SOUND_INTERVAL_MS) {
          sinceSound = 0;
          keystroke();
        }

        // A real typist pauses a beat at the end of a sentence.
        const last = content[shown - 1];
        const sentenceEnd =
          grew && (last === "." || last === "!" || last === "?" || last === "\n");
        await delay(TYPE_FRAME_MS + (sentenceEnd ? SENTENCE_PAUSE_MS : 0), signal);
      }
      setState((p) => ({ ...p, streamingText: content }));
    }

    /** In manual pacing, pause until next() (or a switch to auto) releases us. */
    function waitForGate(kind: AwaitingKind): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
          return reject(new DOMException("aborted", "AbortError"));
        }
        setState((p) => ({
          ...p,
          phase: "awaiting",
          awaitingKind: kind,
          activeTurn: null,
          activeMessage: null,
          streamingText: "",
        }));
        // Named handler so the normal release path (next() / switch-to-auto) can
        // detach it — otherwise every gated turn leaks an abort listener on the
        // run's long-lived signal (mirrors delay()'s self-cleaning above).
        const onAbort = () => {
          gateRef.current = null;
          reject(new DOMException("aborted", "AbortError"));
        };
        gateRef.current = () => {
          signal.removeEventListener("abort", onAbort);
          resolve();
        };
        signal.addEventListener("abort", onAbort, { once: true });
      });
    }

    async function run() {
      try {
        setState((p) => ({
          ...p,
          phase: "thinking",
          messages: working.messages,
          activeTurn: null,
          streamingText: "",
          error: null,
          awaitingKind: null,
        }));

        let lastRound = 0;
        for (const turn of working.turns) {
          if (turn.status === "complete") continue; // resume: skip done turns
          if (signal.aborted) return;

          // Normal (manual) pacing gates every turn except the very first of the
          // match. Fast (auto) pacing skips the gate. A retried turn also skips
          // the gate so "Retry turn" regenerates immediately (consume the flag
          // on this first processed pending turn).
          const retryFirst = retryRef.current;
          retryRef.current = false;
          const gated =
            !retryFirst && paceRef.current === "manual" && working.messages.length > 0;

          // PREFETCH: for a gated turn, start generating NOW so the answer is
          // ready while the user reads the previous turn — pressing "Next" then
          // reveals it almost instantly instead of starting to think.
          let prefetch: Promise<DebateMessage> | null = null;
          if (gated) {
            prefetch = generateTurn(working, turn.id, signal);
            prefetch.catch(() => {}); // swallow if aborted before we await it
            await waitForGate("turn");
            if (signal.aborted) return;
          }

          if (turn.roundNumber !== lastRound) {
            lastRound = turn.roundNumber;
            sfx("roundStart");
          }

          setState((p) => ({
            ...p,
            phase: "thinking",
            activeTurn: turn,
            streamingText: "",
            awaitingKind: null,
          }));
          sfx("typingStart");
          // Gated turns are usually already fetched, so only a brief beat. The
          // first (ungated) turn keeps a full thinking beat, which also absorbs
          // React strict-mode's mount→unmount→mount so no duplicate call fires.
          await delay(gated ? 350 : THINKING_MS, signal);

          // Resilient generation: quietly retry several times in the background
          // (staying in the non-alarming "thinking" state) before ever showing an
          // error, so a model that flakes on the first try self-heals.
          let message: DebateMessage | undefined;
          {
            let attempt = 0;
            const startedAt = Date.now();
            for (;;) {
              if (signal.aborted) return;
              try {
                message =
                  attempt === 0 && prefetch
                    ? await prefetch
                    : await generateTurn(working, turn.id, signal);
                break;
              } catch (err) {
                // Bail if the user pressed Stop mid-flight, so we don't clobber
                // the "stopped" state with another "thinking".
                if (isAbort(err) || signal.aborted) return;
                attempt += 1;
                if (
                  attempt >= MAX_CLIENT_ATTEMPTS ||
                  Date.now() - startedAt > CLIENT_RETRY_BUDGET_MS ||
                  !isTransient(err) // deterministic failure — don't retry blindly
                ) {
                  throw err; // exhausted — let the catch show the error UI
                }
                setState((p) => ({
                  ...p,
                  phase: "thinking",
                  activeTurn: turn,
                  streamingText: "",
                }));
                await delay(Math.min(RETRY_MAX_MS, RETRY_BASE_MS * attempt), signal);
              }
            }
          }
          if (!message || signal.aborted) return;

          // Lock the (paid) turn in and persist BEFORE animating, so stopping
          // mid-animation never discards it.
          turn.status = "complete";
          working.messages = [...working.messages, message];
          persist("running");
          sfx("turnComplete");
          sfx("costTick");

          // Voice-over (when enabled): fetch + ready the audio WHILE still in the
          // thinking state, so playback can start the instant the typewriter does
          // and the text reveal can be paced to the speech length. Best-effort —
          // any failure leaves `prepared` null and the turn types normally.
          let prepared: PreparedSpeech | null = null;
          if (prepareSpeechRef.current) {
            try {
              prepared = await prepareSpeechRef.current(message, signal);
            } catch {
              /* voice is best-effort */
            }
            if (signal.aborted) return;
          }

          // Animate the already-locked content (kept out of `messages` until the
          // animation ends so the streaming card isn't duplicated in the list).
          // `activeMessage` rides along so the card knows its citations and the
          // [n] chips are live links from the first typed character.
          setState((p) => ({
            ...p,
            phase: "streaming",
            activeTurn: turn,
            activeMessage: message,
            streamingText: "",
          }));
          // Start the voice and the typewriter together; pace the reveal to the
          // speech so words land as they're spoken. The next turn waits for the
          // voice to finish (Fast pacing stays polite). A per-turn skip controller
          // lets the user fast-forward the text + voice (see skipTurn()).
          const skip = new AbortController();
          skipRef.current = skip;
          const speechDone = prepared ? prepared.play() : null;
          await typewriter(message.content, prepared?.durationMs ?? undefined, skip.signal);
          if (signal.aborted) return;
          if (speechDone && !skip.signal.aborted) {
            try {
              await speechDone;
            } catch {
              /* voice is best-effort */
            }
            if (signal.aborted) return;
          }
          skipRef.current = null;

          setState((p) => ({
            ...p,
            messages: working.messages,
            activeTurn: null,
            activeMessage: null,
            streamingText: "",
          }));
          await delay(220, signal);
        }

        // Judge — only after all rounds complete.
        if (working.judge.enabled && !working.verdict) {
          if (signal.aborted) return;
          // Prefetch the verdict during the manual "Reveal the Verdict" pause.
          let verdictPrefetch: Promise<DebateVerdict> | null = null;
          if (paceRef.current === "manual") {
            verdictPrefetch = generateVerdict(working, signal);
            verdictPrefetch.catch(() => {});
            await waitForGate("verdict");
            if (signal.aborted) return;
          }
          setState((p) => ({ ...p, phase: "judging", activeTurn: null, awaitingKind: null }));
          sfx("judgeEnter"); // brief "the judge is in" cue

          // Same silent-retry resilience for the verdict.
          let verdict: DebateVerdict | undefined;
          {
            let attempt = 0;
            const startedAt = Date.now();
            for (;;) {
              if (signal.aborted) return;
              try {
                verdict =
                  attempt === 0 && verdictPrefetch
                    ? await verdictPrefetch
                    : await generateVerdict(working, signal);
                break;
              } catch (err) {
                if (isAbort(err) || signal.aborted) return;
                attempt += 1;
                if (
                  attempt >= MAX_CLIENT_ATTEMPTS ||
                  Date.now() - startedAt > CLIENT_RETRY_BUDGET_MS ||
                  !isTransient(err)
                ) {
                  throw err;
                }
                setState((p) => ({ ...p, phase: "judging", awaitingKind: null }));
                await delay(Math.min(RETRY_MAX_MS, RETRY_BASE_MS * attempt), signal);
              }
            }
          }
          if (!verdict || signal.aborted) return;
          working.verdict = verdict; // computed, but NOT shown yet
          // Drumroll → reveal: play the cue ONCE and reveal the verdict exactly
          // as it ends (resolves instantly if sound is off / blocked / aborted).
          // A background (inactive) battle must NOT grab the shared drum-roll
          // element from the battle the user is watching, so it just paces the
          // reveal with a quiet beat instead.
          if (audible()) await playVerdictRoll(signal);
          else await delay(VERDICT_REVEAL_SILENT_MS, signal);
          if (signal.aborted) return;
          setState((p) => ({ ...p, verdict }));
        }

        working.costSummary = working.verdict
          ? recomputeCostSummary(working)
          : summarizeSessionCost(working.messages);
        persist("complete");
        setState((p) => ({
          ...p,
          phase: "done",
          activeTurn: null,
          streamingText: "",
          verdict: working.verdict ?? null,
        }));
      } catch (err) {
        if (audible()) stopDrumRoll(); // a verdict failure must not leave the loop running
        if (isAbort(err)) return;
        sfx("error");
        setState((p) => ({
          ...p,
          phase: "error",
          activeTurn: null,
          activeMessage: null,
          streamingText: "",
          error: toAppError(err),
        }));
      }
    }

    void run();
    return () => {
      controller.abort();
      if (audible()) stopDrumRoll(); // navigating away mid-judging must silence the loop
    };
    // Re-runs on retry (runToken) and once per session (keyed remount).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSession.id, runToken]);

  const costSummary = useMemo(() => {
    const base = summarizeSessionCost(state.messages);
    // Replaced verdicts from a post-match re-judge were paid for too.
    const verdicts = [...(initialSession.pastVerdicts ?? []), state.verdict];
    for (const verdict of verdicts) {
      if (!verdict?.cost) continue;
      const u = verdict.usage;
      if (u) {
        base.totalInputTokens += u.inputTokens;
        base.totalOutputTokens += u.outputTokens;
        base.totalTokens += u.totalTokens;
      }
      base.totalCost += verdict.cost.totalCost;
    }
    return base;
  }, [state.messages, state.verdict, initialSession.pastVerdicts]);

  const totalRounds = initialSession.roundCount;
  const currentRound =
    state.activeTurn?.roundNumber ??
    state.messages[state.messages.length - 1]?.roundNumber ??
    (state.phase === "done" || state.phase === "judging" ? totalRounds : 1);

  return {
    phase: state.phase,
    messages: state.messages,
    activeTurn: state.activeTurn,
    activeMessage: state.activeMessage,
    streamingText: state.streamingText,
    verdict: state.verdict,
    error: state.error,
    awaitingKind: state.awaitingKind,
    costSummary,
    currentRound,
    totalRounds,
    pace,
    stop,
    retry,
    next,
    setPace,
    skipTurn,
  };
}
