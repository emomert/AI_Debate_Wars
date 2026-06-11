"use client";

/**
 * Result — the final closure screen (docs/02, docs/09). Verdict reveal (if a
 * judge ran), match summary with total cost, and a share/recap panel. Falls
 * back to a friendly empty state if there's no session (e.g. after a refresh).
 */

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { FloatingBadge } from "@/components/game/FloatingBadge";
import { Badge } from "@/components/game/Badge";
import { VerdictCard } from "@/components/debate/VerdictCard";
import { FinalSummaryCard } from "@/components/result/FinalSummaryCard";
import { RejudgePanel } from "@/components/result/RejudgePanel";
import { SharePanel } from "@/components/result/SharePanel";
import { SourcesList, mergeCitations } from "@/components/debate/SourcesList";
import { isDebateComplete } from "@/lib/debate/orchestrator";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useArena } from "@/lib/state/ArenaContext";
import { useT } from "@/lib/i18n/LocaleProvider";

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
  const { session, setSession, startMatch, availability, hydrated } = useArena();

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

      <div className="space-y-5">
        {session.verdict ? (
          <VerdictCard
            verdict={session.verdict}
            modelA={session.modelA}
            modelB={session.modelB}
          />
        ) : (
          <GamePanel className="text-center">
            <p className="font-heading text-lg font-extrabold">{d.result.page.noJudge.title}</p>
            <p className="mt-1 text-sm text-ink/60">
              {isDebateComplete(session)
                ? d.result.page.noJudge.ended
                : d.result.page.noJudge.stopped}
            </p>
          </GamePanel>
        )}

        {/* Order (feedback #8): Verdict → Change the judge → Share → Summary. */}
        {/* Re-judge: only a COMPLETE transcript can be (re-)scored — the server
            rejects partial matches, so a stopped session hides the panel. */}
        {isDebateComplete(session) ? (
          <RejudgePanel
            session={session}
            availability={availability}
            onSession={setSession}
          />
        ) : null}

        <SharePanel session={session} />

        {/* Community publish: full-match sharing with visibility controls. */}
        {authEnabled ? <PublishPanel session={session} /> : null}

        <FinalSummaryCard session={session} />

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
        <ArcadeButton variant="primary-yellow" onClick={rematch}>
          {d.result.page.actions.rematch}
        </ArcadeButton>
        <ArcadeButton variant="primary-green" onClick={() => router.push("/")}>
          {d.result.page.actions.home}
        </ArcadeButton>
      </div>
    </GameShell>
  );
}
