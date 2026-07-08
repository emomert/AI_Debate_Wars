"use client";

/**
 * FighterPanel — the Phase-1 reusable fighter representation on the Blitz stage.
 * Any model fills one panel design with its existing identity (blown-up emoji
 * avatar, brand logo, side color). Bespoke character sprites (Phase 2) will swap
 * in behind the same `pose` prop with no call-site change.
 */

import type { SelectedModel } from "@/lib/debate/debateTypes";
import { getModelById } from "@/lib/models/modelRegistry";
import { BrandLogo } from "@/components/report/BrandLogo";
import { cn } from "@/lib/utils/cn";

export type FighterPose = "idle" | "attack" | "hit" | "win" | "lose";

const POSE_CLASS: Record<FighterPose, string> = {
  idle: "translate-y-0",
  attack: "-translate-y-1 scale-105",
  hit: "translate-x-1 opacity-90",
  win: "-translate-y-2 scale-110",
  lose: "translate-y-1 opacity-70",
};

export function FighterPanel({
  model,
  side,
  active,
  pose,
}: {
  model: SelectedModel;
  side: "A" | "B";
  active: boolean;
  pose: FighterPose;
}) {
  const info = getModelById(model.modelId);
  const avatar = info?.avatar ?? "🤖";
  const brand = info?.brand ?? "";
  const sideFrame = side === "A" ? "border-l-8 border-l-arcade-blue" : "border-r-8 border-r-arcade-red";

  return (
    <div
      className={cn(
        "flex w-32 flex-col items-center gap-1.5 rounded-panel border-4 border-ink bg-card p-3 shadow-hard transition-transform duration-200 sm:w-40 sm:p-4",
        sideFrame,
        active ? "scale-105" : "scale-100 opacity-80",
        POSE_CLASS[pose],
      )}
    >
      <div className="text-5xl sm:text-6xl" aria-hidden>
        {avatar}
      </div>
      <div className="text-center font-display text-sm leading-tight text-ink sm:text-base">
        {model.displayName}
      </div>
      {brand ? <BrandLogo brand={brand} size={16} /> : null}
    </div>
  );
}
