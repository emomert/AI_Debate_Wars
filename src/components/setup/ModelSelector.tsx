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
  brandsForLocale,
  familiesForBrand,
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
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import type { ProviderAvailability } from "@/lib/state/ArenaContext";

type Accent = "blue" | "red" | "purple";

const ACCENT_SELECTED: Record<Accent, string> = {
  blue: "border-arcade-blue bg-arcade-blue/10 shadow-hard",
  red: "border-arcade-red bg-arcade-red/10 shadow-hard",
  purple: "border-arcade-purple bg-arcade-purple/10 shadow-hard",
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
}: ModelSelectorProps) {
  const { locale } = useLocale();
  const d = useT();
  const selected = getModelById(selectedId);
  const [activeBrand, setActiveBrand] = useState<string>(
    selected?.brand ?? BRANDS[0]?.brand ?? "OpenAI",
  );
  // Free (OpenRouter) brands live behind a collapsible menu — there are many of
  // them. Open it by default if the current pick is one of them.
  const [freeOpen, setFreeOpen] = useState<boolean>(
    selected?.providerId === "openrouter",
  );

  // Which model LINES are expanded, keyed "brand:family" so state survives
  // tab-hopping without leaking across brands with same-named lines.
  const [openFamilies, setOpenFamilies] = useState<Set<string>>(() => {
    return selected ? new Set([`${selected.brand}:${selected.family}`]) : new Set();
  });

  // The selected model can change AFTER mount (config rehydrates from
  // sessionStorage a tick later), which would otherwise leave the brand tab
  // stuck on its mount-time default. Re-sync the active tab / free menu / open
  // line to the selection when it changes — without clobbering a user's
  // mid-browse tab click (this only fires when the selection actually changes).
  useEffect(() => {
    if (!selected) return;
    setActiveBrand(selected.brand);
    if (selected.providerId === "openrouter") setFreeOpen(true);
    setOpenFamilies((prev) => {
      const key = `${selected.brand}:${selected.family}`;
      if (prev.has(key)) return prev;
      return new Set(prev).add(key);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // In Turkish mode, brands whose models all lack fluent Turkish disappear; if
  // the active tab was one of them, fall back to the first available brand.
  useEffect(() => {
    if (!brandsForLocale(locale).some((b) => b.brand === activeBrand)) {
      setActiveBrand(brandsForLocale(locale)[0]?.brand ?? "OpenAI");
    }
  }, [locale, activeBrand]);

  const families = familiesForBrand(activeBrand, locale);

  const toggleFamily = (family: string) => {
    const key = `${activeBrand}:${family}`;
    setOpenFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const localeBrands = brandsForLocale(locale);
  const primaryBrands = localeBrands.filter((b) => b.backend !== "openrouter");
  const freeBrands = localeBrands.filter((b) => b.backend === "openrouter");
  const freeModelCount = freeBrands.reduce(
    (n, b) => n + modelsForBrand(b.brand, locale).length,
    0,
  );

  const renderTab = (b: BrandInfo) => {
    const active = activeBrand === b.brand;
    const ready = backendReady(b.backend, availability);
    return (
      <button
        key={b.brand}
        type="button"
        role="tab"
        aria-selected={active}
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

      {/* Step 1 — brand tabs (free OpenRouter brands behind a collapsible menu) */}
      <div className="mb-2 flex flex-wrap items-center gap-2" role="tablist" aria-label={`${label} brand`}>
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
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mb-3 origin-top rounded-card border-3 border-dashed border-ink/40 bg-paper p-2.5"
          >
            <p className="mb-2 px-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/45">
              {d.setup.models.freeVia}
              {backendReady("openrouter", availability) === false
                ? d.setup.models.needsOpenRouterKey
                : d.setup.models.zeroCost}
            </p>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label={d.setup.models.freeBrands}>
              {freeBrands.map((b) => renderTab(b))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Step 2 — model LINES for the active brand. Single-model lines are a
          plain selectable row; bigger lines expand into their variants.
          role="group" (not radiogroup): collapsed lines unmount their option
          buttons, and the expander itself isn't an option — aria-pressed
          toggles keep the selection state honest in every collapse state. */}
      <div role="group" aria-label={`${label} model`} className="space-y-2">
        {families.map((f) => {
          if (f.models.length === 1) return renderModelRow(f.models[0]);

          const key = `${activeBrand}:${f.family}`;
          const open = openFamilies.has(key);
          const flagship = f.models[0];
          const picked = f.models.find((m) => m.id === selectedId);

          return (
            <div
              key={key}
              className="overflow-hidden rounded-card border-4 border-ink bg-surface shadow-hard-sm"
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => {
                  playSound(open ? "buttonClick" : "modeSelect");
                  toggleFamily(f.family);
                }}
                className={cn(
                  "flex w-full items-center gap-3 p-3 text-left transition hover:bg-paper",
                  // Inset ring (arbitrary values — the default scale has no 3):
                  // the wrapper is overflow-hidden, so an outside ring would be
                  // clipped invisible for keyboard users.
                  "focus-visible:outline-[3px] focus-visible:outline-offset-[-3px]",
                )}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-btn border-3 border-ink bg-paper text-2xl">
                  {flagship.avatar}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-base font-extrabold leading-tight">
                      {f.family}
                    </span>
                    {picked ? (
                      <Badge color="green" size="sm">
                        {picked.id !== flagship.id
                          ? d.setup.models.pickedWith(picked.displayName)
                          : d.setup.models.picked}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="block text-xs font-semibold text-ink/55">
                    {flagship.nickname}
                  </span>
                </span>
                <span className="rounded-badge border-2 border-ink bg-paper px-1.5 py-0.5 text-[10px] font-bold">
                  {d.setup.models.modelsCount(f.models.length)}
                </span>
                <span aria-hidden className="font-bold">
                  {open ? "▴" : "▾"}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {open ? (
                  <motion.div
                    key="variants"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <div className="space-y-2 border-t-3 border-dashed border-ink/30 p-2.5">
                      {f.models.map((m) => renderModelRow(m))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );

  function renderModelRow(m: ModelCatalogEntry) {
    const isSelected = m.id === selectedId;
    const isConflict = !isSelected && m.id === conflictId;
    const ready = backendReady(m.providerId, availability);
    // Deep Debate: OpenRouter models search natively; OpenAI/DeepSeek need
    // the server's search key (reported by /api/health — optimistic until
    // it resolves so eligible models don't flash disabled).
    const noWeb =
      requireWebSearch &&
      !modelSupportsWebSearch(m.id, availability ? availability.webSearch : true);
    return (
      <button
        key={m.id}
        type="button"
        aria-pressed={isSelected}
        disabled={noWeb}
        aria-disabled={noWeb}
        onClick={() => {
          if (noWeb) return;
          playSound("modelSelected");
          onSelect(m);
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-card border-4 p-3 text-left transition",
          "focus-visible:outline-3 focus-visible:outline-offset-2",
          noWeb && "cursor-not-allowed opacity-45",
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
          </span>
          <span className="block text-xs font-semibold text-ink/55">
            {m.nickname}
          </span>

          {/* Debate-fit rating bar */}
          <span className="mt-1.5 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink/45">
              {d.setup.models.debateFit}
            </span>
            <span className="h-2 w-24 overflow-hidden rounded-full border-2 border-ink bg-paper">
              <span
                className={cn("block h-full", ACCENT_BAR[accent])}
                style={{ width: `${m.debateRating}%` }}
              />
            </span>
            <span className="font-mono text-xs font-bold">{m.debateRating}</span>
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

        <Badge color={m.costTier === "free" ? "green" : "white"} size="sm">
          {COST_TIER_LABEL[m.costTier]}
        </Badge>
      </button>
    );
  }
}
