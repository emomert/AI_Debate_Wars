"use client";

/**
 * Result — the final closure screen (docs/02, docs/09). Verdict reveal (if a
 * judge ran), match summary with total cost, and a share/recap panel. Falls
 * back to a friendly empty state if there's no session (e.g. after a refresh).
 */

import { useRouter } from "next/navigation";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { FloatingBadge } from "@/components/game/FloatingBadge";
import { Badge } from "@/components/game/Badge";
import { VerdictCard } from "@/components/debate/VerdictCard";
import { FinalSummaryCard } from "@/components/result/FinalSummaryCard";
import { SharePanel } from "@/components/result/SharePanel";
import { useArena } from "@/lib/state/ArenaContext";

export default function ResultPage() {
  const router = useRouter();
  const { session, startMatch, hydrated } = useArena();

  if (!session) {
    return (
      <GameShell>
        <GamePanel className="text-center">
          <p className="font-heading text-2xl font-extrabold">
            {hydrated ? "No finished match yet" : "Loading results…"}
          </p>
          {hydrated ? (
            <>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
                Run a debate first and your verdict and cost summary will show up
                here.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <ArcadeButton variant="primary-green" onClick={() => router.push("/setup")}>
                  ⚙️ Set up a match
                </ArcadeButton>
                <ArcadeButton variant="neutral-white" onClick={() => router.push("/")}>
                  ⌂ Home
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

  return (
    <GameShell>
      {/* Header */}
      <div className="mb-5 text-center">
        <div className="mb-3 flex justify-center">
          <FloatingBadge color="green" rotate={-3}>
            ✅ Match Complete
          </FloatingBadge>
        </div>
        <h1 className="font-display text-4xl tracking-tight sm:text-6xl">
          The Dust Settles
        </h1>
        {session.status === "stopped" ? (
          <p className="mt-2">
            <Badge color="red">Match was stopped early</Badge>
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
            <p className="font-heading text-lg font-extrabold">No judge this round</p>
            <p className="mt-1 text-sm text-ink/60">
              The debate ended after the final round. Enable Judge Mode in setup
              for a final verdict.
            </p>
          </GamePanel>
        )}

        <FinalSummaryCard session={session} />
        <SharePanel session={session} />
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <ArcadeButton variant="neutral-white" onClick={() => router.push("/debate")}>
          ↩ Back to arena
        </ArcadeButton>
        <ArcadeButton variant="neutral-white" onClick={() => router.push("/setup")}>
          ⚙️ New Setup
        </ArcadeButton>
        <ArcadeButton variant="primary-yellow" onClick={rematch}>
          🔁 Rematch
        </ArcadeButton>
        <ArcadeButton variant="primary-green" onClick={() => router.push("/")}>
          ⌂ Home
        </ArcadeButton>
      </div>
    </GameShell>
  );
}
