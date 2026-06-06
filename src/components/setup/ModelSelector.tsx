"use client";

/**
 * ModelSelector — two-step fighter picker (docs/02 "choose your fighters").
 *
 * Step 1: pick a BRAND (OpenAI / DeepSeek / Qwen / Llama / …) with key hints.
 * Step 2: pick a model from that brand — full-width rows so the whole name is
 * always readable, with a single "debate fit" rating instead of tags.
 *
 * Brands map to a backend internally (e.g. Qwen → OpenRouter), but the user only
 * ever sees the brand.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  BRANDS,
  COST_TIER_LABEL,
  getModelById,
  modelsForBrand,
  type Backend,
  type BrandInfo,
  type ModelCatalogEntry,
} from "@/lib/models/modelRegistry";
import { Badge } from "@/components/game/Badge";
import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/audio/soundManager";
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
}: ModelSelectorProps) {
  const selected = getModelById(selectedId);
  const [activeBrand, setActiveBrand] = useState<string>(
    selected?.brand ?? BRANDS[0]?.brand ?? "OpenAI",
  );
  // Free (OpenRouter) brands live behind a collapsible menu — there are many of
  // them. Open it by default if the current pick is one of them.
  const [freeOpen, setFreeOpen] = useState<boolean>(
    selected?.providerId === "openrouter",
  );
  const models = modelsForBrand(activeBrand);

  const primaryBrands = BRANDS.filter((b) => b.backend !== "openrouter");
  const freeBrands = BRANDS.filter((b) => b.backend === "openrouter");
  const freeModelCount = freeBrands.reduce(
    (n, b) => n + modelsForBrand(b.brand).length,
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
          <span aria-label="ready" className="h-2 w-2 rounded-full bg-arcade-green" />
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
            <span>🆓 Free models</span>
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
              Free via OpenRouter ·{" "}
              {backendReady("openrouter", availability) === false
                ? "needs OPENROUTER_API_KEY"
                : "$0 to run"}
            </p>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Free brands">
              {freeBrands.map((b) => renderTab(b))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Step 2 — model rows for the active brand */}
      <div role="radiogroup" aria-label={`${label} model`} className="space-y-2">
        {models.map((m) => {
          const isSelected = m.id === selectedId;
          const isConflict = !isSelected && m.id === conflictId;
          const ready = backendReady(m.providerId, availability);
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => {
                playSound("modelSelected");
                onSelect(m);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-card border-4 p-3 text-left transition",
                "focus-visible:outline-3 focus-visible:outline-offset-2",
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
                  {isSelected ? <Badge color="green" size="sm">Picked</Badge> : null}
                </span>
                <span className="block text-xs font-semibold text-ink/55">
                  {m.nickname}
                </span>

                {/* Debate-fit rating bar */}
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-ink/45">
                    Debate fit
                  </span>
                  <span className="h-2 w-24 overflow-hidden rounded-full border-2 border-ink bg-paper">
                    <span
                      className={cn("block h-full", ACCENT_BAR[accent])}
                      style={{ width: `${m.debateRating}%` }}
                    />
                  </span>
                  <span className="font-mono text-xs font-bold">{m.debateRating}</span>
                </span>

                {isConflict ? (
                  <span className="mt-1 block text-[10px] font-bold text-arcade-orange">
                    Also picked for the other fighter
                  </span>
                ) : ready === false ? (
                  <span className="mt-1 block text-[10px] font-bold text-arcade-orange">
                    Needs an API key to run
                  </span>
                ) : null}
              </span>

              <Badge color={m.costTier === "free" ? "green" : "white"} size="sm">
                {COST_TIER_LABEL[m.costTier]}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
