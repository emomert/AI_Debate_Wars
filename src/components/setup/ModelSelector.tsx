"use client";

/**
 * ModelSelector — fighter picker (docs/02 "choose your fighters").
 *
 * Step 1: pick a PROVIDER from a uniform grid of company tiles (logo + name,
 * alphabetical — every provider is presented as an equal; the backend that
 * actually serves a model is never surfaced as a hierarchy).
 * Step 2: pick a model inside that provider — a short recommended list first,
 * the rest behind a "Show all" expander.
 *
 * Brands map to a backend internally (e.g. Qwen → OpenRouter), but the user only
 * ever sees the brand.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  COST_TIER_LABEL,
  RECOMMENDED_MODEL_IDS,
  brandsForLocale,
  getModelById,
  modelsForBrand,
  modelSupportsWebSearch,
  type Backend,
  type BrandInfo,
  type ModelCatalogEntry,
} from "@/lib/models/modelRegistry";
import { Badge } from "@/components/game/Badge";
import { BrandLogo } from "@/components/report/BrandLogo";
import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/audio/soundManager";
import { useReduceMotion } from "@/lib/motion/useReduceMotion";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import type { ProviderAvailability } from "@/lib/state/ArenaContext";

type Accent = "blue" | "red" | "purple";

// Keep the INK comic outline on selection (matching the dark-mode guard in
// globals.css) — a thin arcade-color stroke on a 10% tint is low-contrast,
// especially in dark mode. Selection reads from the colored fill + bigger hard
// shadow + the "PICKED" badge instead.
const ACCENT_SELECTED: Record<Accent, string> = {
  blue: "border-ink bg-arcade-blue/10 shadow-hard",
  red: "border-ink bg-arcade-red/10 shadow-hard",
  purple: "border-ink bg-arcade-purple/10 shadow-hard",
};

interface ModelSelectorProps {
  label: string;
  accent: Accent;
  selectedId: string;
  onSelect: (entry: ModelCatalogEntry) => void;
  /** Optional id to mark as "already used by the other fighter". */
  conflictId?: string;
  /** Which backends have server-side keys. */
  availability?: ProviderAvailability | null;
  /** Deep Debate: disable models that can't web-search. */
  requireWebSearch?: boolean;
  /** When set, restrict the picker to these model ids (Blitz roster). */
  allowedModelIds?: string[];
}

function backendReady(
  backend: Backend,
  availability?: ProviderAvailability | null,
): boolean | null {
  if (availability == null) return null; // unknown until /api/health resolves
  return Boolean(availability[backend]);
}

export function ModelSelector({
  label,
  accent,
  selectedId,
  onSelect,
  conflictId,
  availability,
  requireWebSearch = false,
  allowedModelIds,
}: ModelSelectorProps) {
  const { locale } = useLocale();
  const d = useT();
  const reduce = useReduceMotion();
  const selected = getModelById(selectedId);
  // Blitz roster restriction: when set, only these model ids are pickable.
  const allowSet =
    allowedModelIds && allowedModelIds.length > 0 ? new Set(allowedModelIds) : null;
  const [activeBrand, setActiveBrand] = useState<string>(selected?.brand ?? "");

  // Which brands have their "show all models" list expanded (keyed by brand so
  // the choice survives tile-hopping). A brand whose current pick is a non-
  // recommended model is shown expanded regardless (see showRest below).
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

  // The selected model can change AFTER mount (config rehydrates from
  // sessionStorage a tick later), which would otherwise leave the provider grid
  // stuck on its mount-time default. Re-sync the active tile to the selection
  // when it changes — without clobbering a user's mid-browse tile click
  // (this only fires when the selection actually changes).
  useEffect(() => {
    if (!selected) return;
    setActiveBrand(selected.brand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // Every provider is an equal — one uniform grid, alphabetical so no company
  // reads as "the default". (Locale can hide brands; Blitz can restrict them.)
  const brands = brandsForLocale(locale)
    .filter(
      (b) =>
        !allowSet || modelsForBrand(b.brand, locale).some((m) => allowSet.has(m.id)),
    )
    .sort((a, b) => a.brand.localeCompare(b.brand));

  // The active tile, derived at render so a vanished brand (locale switch,
  // Blitz restriction) falls back gracefully instead of via an effect.
  const currentBrand = brands.some((b) => b.brand === activeBrand)
    ? activeBrand
    : (brands[0]?.brand ?? "");

  // Flatten the active brand into a recommended-first list. A short curated set
  // shows by default; the rest live behind a "Show all" expander so the picker
  // isn't an overwhelming wall of models.
  const brandModels = [...modelsForBrand(currentBrand, locale)]
    .filter((m) => !allowSet || allowSet.has(m.id))
    .sort((a, b) => b.debateRating - a.debateRating);
  let recommendedModels = brandModels.filter((m) => RECOMMENDED_MODEL_IDS.has(m.id));
  let restModels = brandModels.filter((m) => !RECOMMENDED_MODEL_IDS.has(m.id));
  // Defensive: a brand with no curated pick still shows its best as recommended.
  if (recommendedModels.length === 0 && brandModels.length > 0) {
    recommendedModels = brandModels.slice(0, 1);
    restModels = brandModels.slice(1);
  }
  const selectedInRest = !!selected && restModels.some((m) => m.id === selected.id);
  const showRest = selectedInRest || expandedBrands.has(currentBrand);

  const toggleBrandExpand = (brand: string) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  };

  const renderTile = (b: BrandInfo) => {
    const active = currentBrand === b.brand;
    const ready = backendReady(b.backend, availability);
    return (
      <button
        key={b.brand}
        type="button"
        aria-pressed={active}
        onClick={() => {
          playSound("buttonClick");
          setActiveBrand(b.brand);
        }}
        className={cn(
          "flex flex-col items-center gap-1.5 rounded-btn border-3 border-ink px-1.5 py-2.5 transition",
          "focus-visible:outline-3 focus-visible:outline-offset-2",
          active ? "bg-night text-white shadow-hard-sm" : "bg-surface hover:bg-paper",
        )}
      >
        <BrandLogo brand={b.brand} size={18} />
        <span className="flex min-w-0 max-w-full items-center gap-1 text-[11px] font-extrabold leading-none">
          <span className="truncate">{b.brand}</span>
          {ready === null ? null : ready ? (
            <span
              aria-label={d.setup.models.ready}
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-arcade-green"
            />
          ) : (
            <span className="shrink-0 text-[10px] font-bold text-arcade-orange">🔑</span>
          )}
        </span>
      </button>
    );
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-heading text-base font-extrabold uppercase tracking-wide">
          {label}
        </span>
        {selected ? (
          <span className="truncate text-xs font-semibold text-ink/60">
            {selected.displayName}
          </span>
        ) : null}
      </div>

      {/* Step 1 — provider grid: one identical tile per company (logo + name),
          alphabetical. No provider is promoted above another. */}
      <div
        className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4"
        role="group"
        aria-label={`${label} provider`}
      >
        {brands.map((b) => renderTile(b))}
      </div>

      {/* Step 2 — a short RECOMMENDED list for the active brand, with the rest
          tucked behind a "Show all" expander at the bottom so the picker stays
          scannable instead of dumping every model at once. role="group" (not
          radiogroup): the collapsed rows unmount, and aria-pressed on each row
          keeps the selection state honest in every collapse state. */}
      <div role="group" aria-label={`${label} model`} className="space-y-2">
        {recommendedModels.map((m) => renderModelRow(m))}

        {restModels.length > 0 ? (
          <>
            {/* Hide the toggle when the current pick is a non-recommended model:
                the rest list is force-shown (showRest) so it can't be collapsed,
                and a "Show fewer" button that does nothing would be a dead click. */}
            {!selectedInRest ? (
              <button
                type="button"
                aria-expanded={showRest}
                onClick={() => {
                  playSound(showRest ? "buttonClick" : "modeSelect");
                  toggleBrandExpand(currentBrand);
                }}
                className={cn(
                  "w-full rounded-btn border-3 border-dashed border-ink/40 bg-paper px-3 py-2 text-sm font-extrabold text-ink/70 transition",
                  "hover:border-ink hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2",
                )}
              >
                {showRest
                  ? d.setup.models.showFewer
                  : d.setup.models.showAll(brandModels.length)}
              </button>
            ) : null}

            <AnimatePresence initial={false}>
              {showRest ? (
                <motion.div
                  key="rest"
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.18, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-1">
                    {restModels.map((m) => renderModelRow(m))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        ) : null}
      </div>
    </div>
  );

  function renderModelRow(m: ModelCatalogEntry) {
    const isSelected = m.id === selectedId;
    const isConflict = !isSelected && m.id === conflictId;
    const ready = backendReady(m.providerId, availability);
    // Provider has no server key (per /api/health) — selecting it would fail
    // mid-match. `ready === false` only after health resolves, so stay optimistic
    // (don't disable) while it's still null/unknown.
    const notReady = ready === false;
    // Deep Debate: OpenRouter models search natively; OpenAI/DeepSeek need
    // the server's search key (reported by /api/health — optimistic until
    // it resolves so eligible models don't flash disabled).
    const noWeb =
      requireWebSearch &&
      !modelSupportsWebSearch(m.id, availability ? availability.webSearch : true);
    const blocked = noWeb || notReady;
    return (
      <button
        key={m.id}
        type="button"
        aria-pressed={isSelected}
        disabled={blocked}
        aria-disabled={blocked}
        onClick={() => {
          if (blocked) return;
          playSound("modelSelected");
          onSelect(m);
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-card border-4 p-3 text-left transition",
          "focus-visible:outline-3 focus-visible:outline-offset-2",
          blocked && "cursor-not-allowed opacity-45",
          isSelected
            ? ACCENT_SELECTED[accent]
            : "border-ink bg-surface shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard",
        )}
      >
        <BrandLogo brand={m.brand} size={24} />

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-heading text-base font-extrabold leading-tight">
              {m.displayName}
            </span>
            {isSelected ? <Badge color="green" size="sm">{d.setup.models.picked}</Badge> : null}
            {notReady ? <Badge color="ink" size="sm">{d.setup.models.unavailable}</Badge> : null}
          </span>

          {noWeb ? (
            <span className="mt-1 block text-[10px] font-bold text-arcade-orange">
              {d.setup.models.needsWebSearchKey}
            </span>
          ) : isConflict ? (
            <span className="mt-1 block text-[10px] font-bold text-arcade-orange">
              {d.setup.models.alsoPicked}
            </span>
          ) : ready === false ? (
            <span className="mt-1 block text-[10px] font-bold text-arcade-orange">
              {d.setup.models.needsApiKey}
            </span>
          ) : null}
        </span>

        <Badge color="white" size="sm">
          {COST_TIER_LABEL[m.costTier]}
        </Badge>
      </button>
    );
  }
}
