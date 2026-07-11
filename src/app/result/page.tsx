"use client";

/**
 * Result — the final closure screen (docs/02, docs/09). ONE merged verdict card
 * (question, sides, verdict, judge + change-the-judge, share row), then the
 * community publish panel and Deep Debate sources. Falls back to a friendly
 * empty state if there's no session (e.g. after a refresh).
 */

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { FloatingBadge } from "@/components/game/FloatingBadge";
import { Badge } from "@/components/game/Badge";
import { VerdictCard } from "@/components/debate/VerdictCard";
import { RejudgePanel } from "@/components/result/RejudgePanel";
import { SourcesList, mergeCitations } from "@/components/debate/SourcesList";
import { isDebateComplete } from "@/lib/debate/orchestrator";
import { validateSetup } from "@/lib/debate/validators";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useArena } from "@/lib/state/ArenaContext";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";

// Lazy + config-gated so the Supabase SDK stays off the result bundle when
// auth is disabled, and otherwise loads only after hydration.
const MatchSaver = dynamic(
  () => import("@/components/result/MatchSaver").then((m) => m.MatchSaver),
  { ssr: false },
);
// Same code-split treatment: the publish panel pulls in the Supabase SDK for
// its auth state, so it loads only after hydration and only when auth is on.
const PublishPanel = dynamic(
  () => import("@/components/result/PublishPanel").then((m) => m.PublishPanel),
  { ssr: false },
);
const authEnabled = isSupabaseConfigured();

export default function ResultPage() {
  const router = useRouter();
  const d = useT();
  const { locale } = useLocale();
  const {
    config,
    sessions,
    activeBattleIndex,
    setActiveBattleIndex,
    updateSession,
    startMatch,
    availability,
    hydrated,
  } = useArena();
  const session = sessions[activeBattleIndex] ?? null;
  const multi = sessions.length > 1;

  if (!session) {
    return (
      <GameShell>
        <GamePanel className="text-center">
          <p className="font-heading text-2xl font-extrabold">
            {hydrated ? d.result.page.empty.title : d.result.page.empty.loading}
          </p>
          {hydrated ? (
            <>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
                {d.result.page.empty.body}
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <ArcadeButton variant="primary-green" onClick={() => router.push("/setup")}>
                  {d.result.page.empty.setup}
                </ArcadeButton>
                <ArcadeButton variant="neutral-white" onClick={() => router.push("/")}>
                  {d.result.page.empty.home}
                </ArcadeButton>
              </div>
            </>
          ) : null}
        </GamePanel>
      </GameShell>
    );
  }

  const rematch = () => {
    // Re-validate the live config before relaunching (mirrors setup's start
    // guard) — a stale/invalid config reaching here via Try-a-Sample/Reopen
    // shouldn't burn tokens; send the user to setup to fix it instead.
    const injectedSearchReady = availability ? availability.webSearch : null;
    if (!validateSetup(config, { injectedSearchReady, locale }).valid) {
      router.push("/setup");
      return;
    }
    startMatch();
    router.push("/debate");
  };

  // Deep Debate: aggregate + de-dupe every source cited across the match.
  const allSources = mergeCitations(session.messages.map((m) => m.citations));

  return (
    <GameShell>
      {/* Header */}
      <div className="mb-5 text-center">
        <div className="mb-3 flex justify-center">
          <FloatingBadge color="green" rotate={-3}>
            {d.result.page.matchComplete}
          </FloatingBadge>
        </div>
        <h1 className="font-display text-4xl tracking-tight sm:text-6xl">
          {d.result.page.heading}
        </h1>
        {session.status === "stopped" ? (
          <p className="mt-2">
            <Badge color="red">{d.result.page.stoppedEarly}</Badge>
          </p>
        ) : null}
      </div>

      {/* Battle switcher — pick which battle's result to view (multi-battle only) */}
      {multi ? (
        <div className="mb-5">
          <div
            className="flex items-stretch gap-2 overflow-x-auto pb-1"
            role="group"
            aria-label={d.result.battles.overviewTitle}
          >
            {sessions.map((s, i) => {
              const active = i === activeBattleIndex;
              const w = s.verdict?.winner;
              const wLabel =
                s.status !== "complete"
                  ? d.result.battles.inProgress
                  : w === "modelA"
                    ? d.result.battles.winnerA
                    : w === "modelB"
                      ? d.result.battles.winnerB
                      : w === "tie"
                        ? d.result.battles.tie
                        : null;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={d.result.battles.tabAria(i + 1)}
                  onClick={() => setActiveBattleIndex(i)}
                  className={
                    "min-w-[150px] shrink-0 rounded-card border-4 border-ink p-2 text-left transition focus-visible:outline-3 focus-visible:outline-offset-2 " +
                    (active
                      ? "bg-night text-white shadow-hard"
                      : "bg-surface shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-heading text-sm font-extrabold">
                      {d.result.battles.tab(i + 1)}
                    </span>
                    {wLabel ? (
                      <Badge color={active ? "white" : "purple"} size="sm">
                        {wLabel}
                      </Badge>
                    ) : null}
                  </div>
                  <div
                    className={
                      "mt-0.5 truncate text-[11px] font-semibold " +
                      (active ? "text-white/70" : "text-ink/60")
                    }
                  >
                    {s.modelA.displayName} {d.result.battles.vs} {s.modelB.displayName}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-center text-[11px] font-bold text-ink/55">
            {d.result.battles.viewing(activeBattleIndex + 1, sessions.length)}
          </p>
        </div>
      ) : null}

      <div className="space-y-5">
        {/* The merged closing card: verdict + judge (change in place) + share. */}
        {session.verdict ? (
          <VerdictCard
            session={session}
            verdict={session.verdict}
            availability={availability}
            onSession={(s) => updateSession(activeBattleIndex, s)}
          />
        ) : (
          <>
            <GamePanel className="text-center">
              <p className="font-heading text-lg font-extrabold">{d.result.page.noJudge.title}</p>
              <p className="mt-1 text-sm text-ink/60">
                {isDebateComplete(session)
                  ? d.result.page.noJudge.ended
                  : d.result.page.noJudge.stopped}
              </p>
            </GamePanel>
            {/* Add a judge after the fact: only a COMPLETE transcript can be
                scored — the server rejects partial matches. */}
            {isDebateComplete(session) ? (
              <RejudgePanel
                session={session}
                availability={availability}
                onSession={(s) => updateSession(activeBattleIndex, s)}
              />
            ) : null}
          </>
        )}

        {/* Community publish: full-match sharing with visibility controls. */}
        {authEnabled ? <PublishPanel session={session} /> : null}

        {allSources.length > 0 ? (
          <GamePanel title={d.result.page.sources.title(allSources.length)}>
            <p className="mb-3 text-sm text-ink/65">
              {d.result.page.sources.blurb}
            </p>
            <SourcesList citations={allSources} defaultOpen label={d.result.page.sources.label} />
          </GamePanel>
        ) : null}

        {/* Persist the finished match to the signed-in user's history (no-op
            when auth is off / signed out). Invisible — placement doesn't matter. */}
        {authEnabled ? <MatchSaver session={session} /> : null}
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <ArcadeButton variant="neutral-white" onClick={() => router.push("/debate")}>
          {d.result.page.actions.backToArena}
        </ArcadeButton>
        <ArcadeButton variant="neutral-white" onClick={() => router.push("/setup")}>
          {d.result.page.actions.newSetup}
        </ArcadeButton>
        <ArcadeButton variant="primary-green" onClick={rematch}>
          {d.result.page.actions.rematch}
        </ArcadeButton>
        <ArcadeButton variant="neutral-white" onClick={() => router.push("/")}>
          {d.result.page.actions.home}
        </ArcadeButton>
      </div>
    </GameShell>
  );
}
