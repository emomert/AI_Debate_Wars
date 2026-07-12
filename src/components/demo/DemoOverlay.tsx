"use client";

/**
 * DemoOverlay — the "See a Demo" full-screen cinematic (docs/09). Replays ONE
 * real recorded match (src/lib/demo/demoMatch.ts) as a ~30s scripted montage
 * built from lightweight replicas of the setup + arena screens:
 *
 *   topic types out (camera zoom) → fighter tiles select → rules flash
 *   serious/short/auto-judge → START slams → 3 rounds of sped-up streaming
 *   turns → verdict card + score bar → "Your turn." end card.
 *
 * Design rules honored: skippable at any moment (✕ / Skip / Esc), reduced
 * motion collapses to an instant-cut variant (no zoom, instant text, shorter
 * clock), SFX go through soundManager (silent unless arcade sound is on).
 * Everything is driven by ONE rAF clock so the whole thing stays declarative:
 * render(t). No network, no providers — the match content is baked.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ArcadeButton } from "@/components/game/ArcadeButton";
import { BrandLogo } from "@/components/report/BrandLogo";
import { DEMO_MATCH } from "@/lib/demo/demoMatch";
import { playSound } from "@/lib/audio/soundManager";
import { useReduceMotion } from "@/lib/motion/useReduceMotion";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils/cn";

/* ------------------------------- timeline -------------------------------- */

// Scene boundaries in ms (normal motion). Reduced motion halves the clock and
// cuts hard between scenes. Total ≈ 29.5s.
const T = {
  zoomIn: 700,
  typeStart: 1_000,
  typeEnd: 3_600, // 33 chars ≈ 79ms/char
  topicOk: 4_000,
  zoomOut: 5_400,
  fighters: 6_300,
  tileA: 7_000,
  rowA: 7_700,
  tileB: 9_400,
  rowB: 10_100,
  rules: 12_300,
  chipTone: 12_700,
  chipLength: 13_300,
  chipJudge: 13_900,
  startPress: 15_400,
  arena: 16_400,
  verdict: 26_400,
  scoreBar: 27_200,
  end: 29_500,
} as const;

// Six turns share the arena window: splash → stream, ~1.55s each + splashes.
const ARENA_MS = T.verdict - T.arena; // 10s
const TURN_MS = 1_450;
const SPLASH_MS = 700;

/** Per-turn schedule inside the arena scene (start offsets, ms). */
function turnSchedule(): { splashAt: number[]; turnAt: number[] } {
  const splashAt: number[] = [];
  const turnAt: number[] = [];
  let t = 0;
  for (let i = 0; i < DEMO_MATCH.turns.length; i++) {
    if (i % 2 === 0) {
      splashAt.push(t); // round splash before each pair
      t += SPLASH_MS;
    }
    turnAt.push(t);
    t += TURN_MS;
  }
  return { splashAt, turnAt };
}
const SCHEDULE = turnSchedule();

/** 0→1 progress of `t` through [a, b]. */
const seg = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

/* -------------------------------- component ------------------------------- */

export function DemoOverlay({ onClose }: { onClose: () => void }) {
  const d = useT();
  const router = useRouter();
  const reduce = useReduceMotion();
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState(false);
  const [runId, setRunId] = useState(0); // bump to replay
  const closeRef = useRef<HTMLButtonElement>(null);
  const firedCues = useRef<Set<string>>(new Set());

  // Reduced motion: same story, half the clock, no transforms, instant text.
  const speed = reduce ? 2 : 1;
  const t = elapsed * speed;
  const done = ended || t >= T.end;

  // The one clock. Accumulates CAPPED per-frame deltas instead of wall time,
  // so a hidden/occluded tab (rAF suspended) pauses the demo rather than
  // fast-forwarding past scenes when frames resume. Stops itself at the end.
  useEffect(() => {
    if (ended) return;
    let raf = 0;
    let acc = 0;
    let last = performance.now();
    const loop = (now: number) => {
      acc += Math.min(100, now - last);
      last = now;
      setElapsed(acc);
      if (acc * speed < T.end) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ended, speed, runId]);

  // SFX cues — fire once when the clock crosses them (respects the sound toggle).
  useEffect(() => {
    const cues: Array<[string, number, Parameters<typeof playSound>[0]]> = [
      ["typing", T.typeStart, "typingStart"],
      ["tileA", T.tileA, "buttonClick"],
      ["rowA", T.rowA, "modelSelected"],
      ["tileB", T.tileB, "buttonClick"],
      ["rowB", T.rowB, "modelSelected"],
      ["start", T.startPress, "debateStart"],
      ["r1", T.arena + SCHEDULE.splashAt[0], "roundStart"],
      ["r2", T.arena + SCHEDULE.splashAt[1], "roundStart"],
      ["r3", T.arena + SCHEDULE.splashAt[2], "roundStart"],
      ["verdict", T.verdict, "verdictReveal"],
    ];
    for (const [id, at, key] of cues) {
      if (t >= at && !firedCues.current.has(id)) {
        firedCues.current.add(id);
        playSound(key);
      }
    }
  }, [t]);

  // Esc closes; lock body scroll while open; focus lands on Close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const skip = useCallback(() => setEnded(true), []);
  const replay = useCallback(() => {
    firedCues.current.clear();
    setEnded(false);
    setElapsed(0);
    setRunId((n) => n + 1);
  }, []);
  const goSetup = useCallback(() => {
    playSound("buttonClick");
    onClose();
    router.push("/setup");
  }, [onClose, router]);

  // Which replica screen is on stage.
  const scene = done
    ? "end"
    : t < T.fighters
      ? "setup"
      : t < T.rules
        ? "fighters"
        : t < T.arena
          ? "rules"
          : t < T.verdict
            ? "arena"
            : "verdict";

  // Camera: zoom to the topic box while it types, otherwise rest. Reduced
  // motion never transforms.
  const camera =
    !reduce && scene === "setup" && t >= T.zoomIn && t < T.zoomOut
      ? "scale(1.45) translate(0%, 10%)"
      : "scale(1) translate(0, 0)";

  const typedTopic = reduce
    ? DEMO_MATCH.topic
    : DEMO_MATCH.topic.slice(
        0,
        Math.floor(DEMO_MATCH.topic.length * seg(t, T.typeStart, T.typeEnd)),
      );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={d.home.demo.aria}
      className="fixed inset-0 z-50 flex flex-col bg-night/95 p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top bar: label + close */}
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2">
        <span className="rounded-badge border-3 border-ink bg-arcade-yellow px-2 py-1 font-heading text-[11px] font-extrabold uppercase tracking-wide text-night">
          {d.home.demo.watching}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={d.home.demo.close}
          className="rounded-btn border-3 border-ink bg-paper px-2.5 py-1 font-heading text-sm font-extrabold shadow-hard-sm transition hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2"
        >
          ✕
        </button>
      </div>

      {/* Stage — height-capped and vertically centered so sparse scenes don't
          float at the top of a viewport-tall box. */}
      <div className="mx-auto mt-3 grid min-h-0 w-full max-w-3xl flex-1 place-items-center">
      <div className="h-full max-h-[540px] w-full overflow-hidden rounded-modal border-4 border-ink bg-paper shadow-hard-lg">
        <div
          className="h-full w-full transition-transform duration-700 ease-in-out"
          style={{ transform: camera, transformOrigin: "35% 20%" }}
        >
          {scene === "setup" ? (
            <SetupScene typedTopic={typedTopic} caret={t < T.topicOk && !reduce} ok={t >= T.topicOk} />
          ) : null}
          {scene === "fighters" ? (
            <FightersScene
              tileA={t >= T.tileA}
              rowA={t >= T.rowA}
              tileB={t >= T.tileB}
              rowB={t >= T.rowB}
              reduce={reduce}
            />
          ) : null}
          {scene === "rules" ? (
            <RulesScene
              tone={t >= T.chipTone}
              length={t >= T.chipLength}
              judge={t >= T.chipJudge}
              pressed={t >= T.startPress}
              reduce={reduce}
            />
          ) : null}
          {scene === "arena" ? <ArenaScene at={t - T.arena} reduce={reduce} /> : null}
          {scene === "verdict" ? <VerdictScene bar={seg(t, T.scoreBar, T.end - 600)} reduce={reduce} /> : null}
          {scene === "end" ? (
            <EndScene
              onUse={goSetup}
              onReplay={replay}
              yourTurn={d.home.demo.yourTurn}
              sub={d.home.demo.yourTurnSub}
              cta={d.home.demo.cta}
              replayLabel={d.home.demo.replay}
            />
          ) : null}
        </div>
      </div>
      </div>

      {/* Bottom bar: progress + skip */}
      <div className="mx-auto mt-3 flex w-full max-w-3xl items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full border-2 border-ink bg-paper/20">
          <div
            className="h-full bg-arcade-yellow"
            style={{ width: `${Math.min(100, (t / T.end) * 100)}%` }}
          />
        </div>
        {!done ? (
          <button
            type="button"
            onClick={skip}
            className="rounded-btn border-3 border-ink bg-paper px-3 py-1 font-heading text-xs font-extrabold uppercase tracking-wide shadow-hard-sm transition hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2"
          >
            {d.home.demo.skip}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* --------------------------------- scenes -------------------------------- */

function PanelChrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-3 p-4 sm:p-6">
      <p className="font-display text-2xl tracking-tight sm:text-3xl">{title}</p>
      {children}
    </div>
  );
}

function SetupScene({ typedTopic, caret, ok }: { typedTopic: string; caret: boolean; ok: boolean }) {
  return (
    <PanelChrome title="Set Up Your Match">
      <div className="rounded-card border-4 border-ink bg-card p-3 sm:p-4">
        <p className="mb-2 font-heading text-sm font-extrabold">🎤 Your Topic</p>
        <div className="min-h-16 rounded-card border-4 border-ink bg-paper px-3 py-2 text-base sm:text-lg">
          {typedTopic}
          {caret ? <span className="animate-caret-blink">▏</span> : null}
        </div>
        {ok ? (
          <p className="mt-2 inline-block rounded-badge border-2 border-ink bg-arcade-green px-2 py-0.5 text-[11px] font-extrabold text-white">
            ✓ Ready to fight
          </p>
        ) : null}
      </div>
      <div className="rounded-card border-4 border-ink bg-surface p-3 opacity-60">
        <p className="font-heading text-sm font-extrabold">2 · Choose Your Fighters</p>
      </div>
    </PanelChrome>
  );
}

function FighterPick({
  brand,
  name,
  stance,
  tile,
  row,
  accent,
  reduce,
}: {
  brand: string;
  name: string;
  stance: string;
  tile: boolean;
  row: boolean;
  accent: "blue" | "red";
  reduce: boolean;
}) {
  return (
    <div className="flex-1">
      <p className="mb-1.5 font-heading text-xs font-extrabold uppercase tracking-wide text-ink/60">
        Fighter {accent === "blue" ? "A" : "B"}
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {["Claude", brand, "Gemini"].map((b, i) => (
          <div
            key={b}
            className={cn(
              "flex flex-col items-center gap-1 rounded-btn border-3 border-ink px-1 py-1.5",
              !reduce && "transition-all duration-300",
              i === 1 && tile ? "scale-105 bg-night text-white shadow-hard-sm" : "bg-surface",
            )}
          >
            <BrandLogo brand={b} size={14} />
            <span className="text-[9px] font-extrabold sm:text-[10px]">{b}</span>
          </div>
        ))}
      </div>
      <div
        className={cn(
          "mt-2 flex items-center gap-2 rounded-card border-4 p-2",
          !reduce && "transition-all duration-300",
          row
            ? accent === "blue"
              ? "border-arcade-blue bg-arcade-blue/10 opacity-100"
              : "border-arcade-red bg-arcade-red/10 opacity-100"
            : "border-ink/20 bg-surface opacity-40",
        )}
      >
        <BrandLogo brand={brand} size={18} />
        <span className="min-w-0 flex-1 truncate font-heading text-xs font-extrabold sm:text-sm">
          {name}
        </span>
        {row ? (
          <span
            className={cn(
              "rounded-badge border-2 border-ink px-1.5 py-0.5 text-[9px] font-extrabold text-white",
              accent === "blue" ? "bg-arcade-blue" : "bg-arcade-red",
            )}
          >
            {stance}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function FightersScene({
  tileA,
  rowA,
  tileB,
  rowB,
  reduce,
}: {
  tileA: boolean;
  rowA: boolean;
  tileB: boolean;
  rowB: boolean;
  reduce: boolean;
}) {
  return (
    <PanelChrome title="Choose Your Fighters">
      <div className="flex flex-col gap-4 sm:flex-row">
        <FighterPick
          brand={DEMO_MATCH.fighterA.brand}
          name={DEMO_MATCH.fighterA.name}
          stance={DEMO_MATCH.fighterA.stance}
          tile={tileA}
          row={rowA}
          accent="blue"
          reduce={reduce}
        />
        <FighterPick
          brand={DEMO_MATCH.fighterB.brand}
          name={DEMO_MATCH.fighterB.name}
          stance={DEMO_MATCH.fighterB.stance}
          tile={tileB}
          row={rowB}
          accent="red"
          reduce={reduce}
        />
      </div>
    </PanelChrome>
  );
}

function RuleChip({ on, children, reduce }: { on: boolean; children: React.ReactNode; reduce: boolean }) {
  return (
    <span
      className={cn(
        "rounded-badge border-3 border-ink px-2.5 py-1 font-heading text-xs font-extrabold uppercase tracking-wide",
        !reduce && "transition-all duration-300",
        on ? "scale-105 bg-arcade-yellow text-night shadow-hard-sm" : "bg-surface text-ink/50",
      )}
    >
      {children}
    </span>
  );
}

function RulesScene({
  tone,
  length,
  judge,
  pressed,
  reduce,
}: {
  tone: boolean;
  length: boolean;
  judge: boolean;
  pressed: boolean;
  reduce: boolean;
}) {
  return (
    <PanelChrome title="Match Rules">
      <p className="text-sm text-ink/60">Already set — 3 rounds, ready to go:</p>
      <div className="flex flex-wrap items-center gap-2">
        <RuleChip on={tone} reduce={reduce}>🎯 Serious</RuleChip>
        <RuleChip on={length} reduce={reduce}>Short</RuleChip>
        <RuleChip on={judge} reduce={reduce}>⚖️ Auto Judge · {DEMO_MATCH.judgeName}</RuleChip>
      </div>
      <div className="mt-auto flex justify-center pb-4">
        <span
          className={cn(
            "inline-block rounded-btn border-4 border-ink bg-arcade-green px-8 py-3 font-heading text-lg font-extrabold uppercase tracking-wide text-white",
            !reduce && "transition-all duration-150",
          )}
          style={{
            boxShadow: pressed ? "2px 2px 0 var(--shadow-ink)" : "6px 6px 0 var(--shadow-ink)",
            transform: pressed ? "translate(4px, 4px)" : "none",
          }}
        >
          ▶ Start the Match
        </span>
      </div>
    </PanelChrome>
  );
}

function ArenaScene({ at, reduce }: { at: number; reduce: boolean }) {
  // Visible turns + the active one's streaming progress.
  const turns = DEMO_MATCH.turns;
  let active = -1;
  for (let i = 0; i < turns.length; i++) if (at >= SCHEDULE.turnAt[i]) active = i;
  const splashRound =
    SCHEDULE.splashAt.findIndex((s) => at >= s && at < s + SPLASH_MS) + 1;
  const roundNow = active < 0 ? 1 : turns[active].round;

  return (
    <div className="relative flex h-full flex-col gap-2 p-3 sm:p-4">
      {/* Mini HUD */}
      <div className="flex items-center gap-1.5">
        <span className="rounded-badge border-3 border-ink bg-arcade-yellow px-2 py-1 font-heading text-[11px] font-extrabold uppercase text-night">
          Round {roundNow} / 3
        </span>
        <span className="rounded-badge border-3 border-ink bg-surface px-2 py-1 font-heading text-[11px] font-extrabold uppercase">
          Serious
        </span>
        <span className="rounded-badge border-3 border-ink bg-surface px-2 py-1 font-heading text-[11px] font-extrabold uppercase">
          Short
        </span>
      </div>
      <div className="rounded-card border-4 border-ink bg-card px-3 py-2 font-heading text-sm font-extrabold sm:text-base">
        {DEMO_MATCH.topic}
      </div>

      {/* Last two bubbles (montage keeps the stage uncluttered) */}
      <div className="flex flex-1 flex-col justify-end gap-2 overflow-hidden">
        {turns.map((turn, i) => {
          if (i !== active && i !== active - 1) return null;
          const isActive = i === active;
          const p = isActive ? Math.min(1, (at - SCHEDULE.turnAt[i]) / (TURN_MS * 0.85)) : 1;
          const text = reduce ? turn.text : turn.text.slice(0, Math.floor(turn.text.length * p));
          const isA = turn.speaker === "A";
          const f = isA ? DEMO_MATCH.fighterA : DEMO_MATCH.fighterB;
          return (
            <div
              key={i}
              className={cn(
                "rounded-card border-4 border-ink p-2.5",
                isA ? "mr-6 bg-arcade-blue/10 sm:mr-16" : "ml-6 bg-arcade-red/10 sm:ml-16",
                !isActive && "opacity-60",
              )}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <BrandLogo brand={f.brand} size={12} />
                <span className="font-heading text-[11px] font-extrabold">{f.name}</span>
                <span
                  className={cn(
                    "rounded-badge border-2 border-ink px-1 py-0.5 text-[8px] font-extrabold text-white",
                    isA ? "bg-arcade-blue" : "bg-arcade-red",
                  )}
                >
                  {f.stance}
                </span>
                <span className="ml-auto text-[9px] font-bold uppercase text-ink/45">
                  {turn.roundLabel}
                </span>
              </div>
              <p className="text-xs leading-snug text-ink/85 sm:text-sm">{text}</p>
            </div>
          );
        })}
      </div>

      {/* Round splash */}
      {splashRound > 0 ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="rounded-modal border-4 border-ink bg-arcade-yellow px-6 py-3 font-display text-3xl text-night shadow-hard-lg sm:text-4xl">
            ROUND {splashRound}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function VerdictScene({ bar, reduce }: { bar: number; reduce: boolean }) {
  const { verdict, fighterA, fighterB, judgeName } = DEMO_MATCH;
  const a = reduce ? verdict.scoreA : Math.round(verdict.scoreA * bar);
  const b = reduce ? verdict.scoreB : Math.round(verdict.scoreB * bar);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center sm:gap-4">
      <span className="rounded-badge border-3 border-ink bg-arcade-purple px-3 py-1 font-heading text-xs font-extrabold uppercase tracking-wide text-white">
        ⚖️ Verdict · Judge {judgeName}
      </span>
      <p className="font-display text-3xl tracking-tight sm:text-4xl">
        🏆 {fighterA.name} wins!
      </p>
      {/* Score bar */}
      <div className="w-full max-w-md">
        <div className="flex h-6 overflow-hidden rounded-full border-3 border-ink">
          <div
            className={cn("bg-arcade-blue", !reduce && "transition-all duration-300")}
            style={{ width: `${a + b > 0 ? (a / (a + b)) * 100 : 50}%` }}
          />
          <div className="flex-1 bg-arcade-red" />
        </div>
        <div className="mt-1 flex justify-between font-mono text-sm font-bold">
          <span>
            {fighterA.name} · {a}
          </span>
          <span>
            {b} · {fighterB.name}
          </span>
        </div>
      </div>
      <p className="max-w-lg text-xs leading-snug text-ink/70 sm:text-sm">“{verdict.line}”</p>
    </div>
  );
}

function EndScene({
  onUse,
  onReplay,
  yourTurn,
  sub,
  cta,
  replayLabel,
}: {
  onUse: () => void;
  onReplay: () => void;
  yourTurn: string;
  sub: string;
  cta: string;
  replayLabel: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-display text-4xl tracking-tight sm:text-5xl">{yourTurn}</p>
      <p className="max-w-md text-sm text-ink/70 sm:text-base">{sub}</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <ArcadeButton variant="primary-green" size="lg" onClick={onUse} rightIcon={<span aria-hidden>▶</span>}>
          {cta}
        </ArcadeButton>
        <ArcadeButton variant="neutral-white" onClick={onReplay}>
          {replayLabel}
        </ArcadeButton>
      </div>
    </div>
  );
}
