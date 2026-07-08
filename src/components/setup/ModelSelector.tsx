"use client";

/**
 * ModelSelector — fighter picker (docs/02 "choose your fighters").
 *
 * Step 1: pick a BRAND (OpenAI / DeepSeek / Qwen / Llama / …) with key hints.
 * Step 2: pick a model LINE (GPT-5.4, DeepSeek V4, …) — multi-model lines
 * expand into a collapsible variant list, single-model lines select directly.
 *
 * Brands map to a backend internally (e.g. Qwen → OpenRouter), but the user only
 * ever sees the brand.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  BRANDS,
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

const ACCENT_BAR: Record<Accent, string> = {
  blue: "bg-arcade-blue",
  red: "bg-arcade-red",
  purple: "bg-arcade-purple",
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
  const [activeBrand, setActiveBrand] = useState<string>(
    selected?.brand ?? BRANDS[0]?.brand ?? "OpenAI",
  );
  // OpenRouter brands live behind a collapsible "More brands" menu — there are
  // many of them. Open it by default if the current pick is one of them.
  const [freeOpen, setFreeOpen] = useState<boolean>(
    selected?.providerId === "openrouter",
  );

  // Which brands have their "show all models" list expanded (keyed by brand so
  // the choice survives tab-hopping). A brand whose current pick is a non-
  // recommended model is shown expanded regardless (see showRest below).
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

  // The selected model can change AFTER mount (config rehydrates from
  // sessionStorage a tick later), which would otherwise leave the brand tab
  // stuck on its mount-time default. Re-sync the active tab / free menu to the
  // selection when it changes — without clobbering a user's mid-browse tab click
  // (this only fires when the selection actually changes).
  useEffect(() => {
    if (!selected) return;
    setActiveBrand(selected.brand);
    if (selected.providerId === "openrouter") setFreeOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // In Turkish mode, brands whose models all lack fluent Turkish disappear; if
  // the active tab was one of them, fall back to the first available brand.
  useEffect(() => {
    if (!brandsForLocale(locale).some((b) => b.brand === activeBrand)) {
      setActiveBrand(brandsForLocale(locale)[0]?.brand ?? "OpenAI");
    }
  }, [locale, activeBrand]);

  // Flatten the active brand into a recommended-first list. A short curated set
  // shows by default; the rest live behind a "Show all" expander so the picker
  // isn't an overwhelming wall of models.
  const brandModels = [...modelsForBrand(activeBrand, locale)]
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
  const showRest = selectedInRest || expandedBrands.has(activeBrand);

  const toggleBrandExpand = (brand: string) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  };

  const localeBrands = brandsForLocale(locale).filter(
    (b) => !allowSet || modelsForBrand(b.brand, locale).some((m) => allowSet.has(m.id)),
  );
  const primaryBrands = localeBrands.filter((b) => b.backend !== "openrouter");
  const freeBrands = localeBrands.filter((b) => b.backend === "openrouter");
  const freeModelCount = freeBrands.reduce(
    (n, b) => n + modelsForBrand(b.brand, locale).filter((m) => !allowSet || allowSet.has(m.id)).length,
    0,
  );

  const renderTab = (b: BrandInfo) => {
    const active = activeBrand === b.brand;
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
          "inline-flex items-center gap-1.5 rounded-btn border-3 border-ink px-3 py-1.5 text-sm font-extrabold transition",
          "focus-visible:outline-3 focus-visible:outline-offset-2",
          active ? "bg-night text-white shadow-hard-sm" : "bg-surface hover:bg-paper",
        )}
      >
        <span>{b.brand}</span>
        {ready === null ? null : ready ? (
          <span aria-label={d.setup.models.ready} className="h-2 w-2 rounded-full bg-arcade-green" />
        ) : (
          <span className="text-[10px] font-bold text-arcade-orange">🔑</span>
        )}
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

      {/* Step 1 — brand tabs (OpenRouter brands behind a collapsible menu) */}
      <div className="mb-2 flex flex-wrap items-center gap-2" role="group" aria-label={`${label} brand`}>
        {primaryBrands.map((b) => renderTab(b))}
        {freeBrands.length > 0 ? (
          <button
            type="button"
            aria-expanded={freeOpen}
            onClick={() => {
              playSound(freeOpen ? "buttonClick" : "modeSelect");
              setFreeOpen((v) => !v);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-btn border-3 border-ink px-3 py-1.5 text-sm font-extrabold transition",
              "focus-visible:outline-3 focus-visible:outline-offset-2",
              freeOpen ? "bg-arcade-green text-night" : "bg-arcade-yellow text-night",
            )}
          >
            <span>{d.setup.models.freeModels}</span>
            <span className="rounded-badge border-2 border-night bg-white px-1 text-[10px] text-night">
              {freeModelCount}
            </span>
            <span aria-hidden>{freeOpen ? "▴" : "▾"}</span>
          </button>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {freeOpen ? (
          <motion.div
            key="free-brands"
            initial={reduce ? false : { opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: "easeOut" }}
            className="mb-3 origin-top rounded-card border-3 border-dashed border-ink/40 bg-paper p-2.5"
          >
            <p className="mb-2 px-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/45">
              {d.setup.models.freeVia}
              {backendReady("openrouter", availability) === false
                ? d.setup.models.needsOpenRouterKey
                : d.setup.models.zeroCost}
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={d.setup.models.freeBrands}>
              {freeBrands.map((b) => renderTab(b))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
                  toggleBrandExpand(activeBrand);
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
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-btn border-3 border-ink bg-paper text-2xl">
          {m.avatar}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-heading text-base font-extrabold leading-tight">
              {m.displayName}
            </span>
            {isSelected ? <Badge color="green" size="sm">{d.setup.models.picked}</Badge> : null}
            {notReady ? <Badge color="ink" size="sm">{d.setup.models.unavailable}</Badge> : null}
          </span>
          <span className="block text-xs font-semibold text-ink/55">
            {m.nickname}
          </span>

          {/* Debate-skill rating bar (title explains the 0–100 score) */}
          <span
            className="mt-1.5 flex items-center gap-2"
            title={d.setup.models.debateFitHelp}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink/45">
              {d.setup.models.debateFit}
            </span>
            <span className="h-2 w-24 overflow-hidden rounded-full border-2 border-ink bg-paper">
              <span
                className={cn("block h-full", ACCENT_BAR[accent])}
                style={{ width: `${m.debateRating}%` }}
              />
            </span>
            <span className="font-mono text-xs font-bold">{m.debateRating}/100</span>
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
