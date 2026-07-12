"use client";

/**
 * BattleList — the fighters section of setup. A match is 1–3 battles on the same
 * topic; each battle is its own fighter pairing (only the fighters differ
 * between battles). A single battle renders like the original A-vs-B picker; add
 * a second/third to run them concurrently in the arena.
 */

import { IconButton } from "@/components/game/IconButton";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { ModelSelector } from "@/components/setup/ModelSelector";
import type { BattleFighters } from "@/lib/debate/debateTypes";
import { MAX_BATTLES } from "@/lib/debate/debateTypes";
import type { ModelCatalogEntry } from "@/lib/models/modelRegistry";
import type { ProviderAvailability } from "@/lib/state/ArenaContext";
import { useT } from "@/lib/i18n/LocaleProvider";

interface BattleListProps {
  pairs: BattleFighters[];
  availability: ProviderAvailability | null;
  requireWebSearch: boolean;
  onSelect: (index: number, slot: "A" | "B", entry: ModelCatalogEntry) => void;
  onSwap: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  /** When set, restrict every fighter picker to these ids (Blitz roster). */
  allowedModelIds?: string[];
  /** Hide the "add battle" control (Blitz is strictly 1v1). */
  allowAddBattle?: boolean;
}

export function BattleList({
  pairs,
  availability,
  requireWebSearch,
  onSelect,
  onSwap,
  onAdd,
  onRemove,
  allowedModelIds,
  allowAddBattle = true,
}: BattleListProps) {
  const d = useT();
  const multi = pairs.length > 1;

  return (
    <div className="space-y-4">
      {pairs.map((pair, i) => (
        <div
          key={pair.uid ?? i}
          className={multi ? "rounded-card border-3 border-ink/25 bg-paper p-3" : undefined}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            {multi ? (
              <span className="font-heading text-sm font-extrabold uppercase tracking-wide text-ink/70">
                {d.setup.battles.battleLabel(i + 1)}
              </span>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <IconButton
                label={multi ? d.setup.battles.swapAria(i + 1) : d.setup.swapFighters}
                onClick={() => onSwap(i)}
              >
                <span aria-hidden>⇄</span>
              </IconButton>
              {multi && i > 0 ? (
                <IconButton label={d.setup.battles.removeAria(i + 1)} onClick={() => onRemove(i)}>
                  <span aria-hidden>✕</span>
                </IconButton>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <ModelSelector
              label={d.setup.fighterA}
              accent="blue"
              selectedId={pair.modelA.modelId}
              conflictId={pair.modelB.modelId}
              availability={availability}
              requireWebSearch={requireWebSearch}
              allowedModelIds={allowedModelIds}
              onSelect={(entry) => onSelect(i, "A", entry)}
            />
            <ModelSelector
              label={d.setup.fighterB}
              accent="red"
              selectedId={pair.modelB.modelId}
              conflictId={pair.modelA.modelId}
              availability={availability}
              requireWebSearch={requireWebSearch}
              allowedModelIds={allowedModelIds}
              onSelect={(entry) => onSelect(i, "B", entry)}
            />
          </div>
        </div>
      ))}

      {allowAddBattle && pairs.length < MAX_BATTLES ? (
        <ArcadeButton variant="neutral-white" size="sm" fullWidth onClick={onAdd}>
          {d.setup.battles.addBattle}
        </ArcadeButton>
      ) : null}
    </div>
  );
}
