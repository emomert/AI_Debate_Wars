"use client";

/**
 * SharePanel — copy a text recap of the match to the clipboard. Full share URLs
 * are out of scope for the MVP (docs/01), so social buttons are placeholders.
 */

import { useState } from "react";

import type { DebateSession } from "@/lib/debate/debateTypes";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { Badge } from "@/components/game/Badge";
import { formatCost } from "@/lib/utils/format";

function buildRecap(session: DebateSession): string {
  const v = session.verdict;
  const lines = [
    `🏟️ Debator`,
    `Topic: ${session.topic}`,
    `Mode: ${session.mode} · ${session.roundCount} rounds · tone ${session.tone}`,
    `Fighters: ${session.modelA.displayName} (A) vs ${session.modelB.displayName} (B)`,
    v ? `Verdict: ${v.summary}` : `No judge — ended after the final round.`,
    `Total cost: ${formatCost(session.costSummary.totalCost)}`,
  ];
  return lines.join("\n");
}

export function SharePanel({ session }: { session: DebateSession }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildRecap(session));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <GamePanel title="📣 Share the Match" padding="md">
      <p className="text-sm text-ink/65">
        Copy a recap to your clipboard. Shareable links arrive in a later release.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ArcadeButton variant="primary-yellow" onClick={copy}>
          {copied ? "✅ Copied!" : "📋 Copy recap"}
        </ArcadeButton>
        <Badge color="white">🐦 Social · soon</Badge>
        <Badge color="white">🔗 Link · soon</Badge>
      </div>
    </GamePanel>
  );
}
