"use client";

/**
 * FighterRoster — the model catalogue as interactive fighter cards: avatar,
 * nickname, debate-rating stat bar, brand filter chips and a rating sort.
 * Clicking a card expands it with full registry details and its REAL
 * per-token pricing (joined live from the pricing table — same source the
 * billing engine uses, so the report can't drift).
 */

import { useMemo, useState } from "react";

import { useT } from "@/lib/i18n/LocaleProvider";
import {
  BRANDS,
  MODEL_CATALOG,
  type ModelCatalogEntry,
} from "@/lib/models/modelRegistry";
import { getModelPrice } from "@/lib/cost/pricing";
import { BrandLogo } from "@/components/report/BrandLogo";
import { cn } from "@/lib/utils/cn";

function price(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;
}

function ratingColor(rating: number): string {
  if (rating >= 90) return "bg-arcade-green";
  if (rating >= 80) return "bg-arcade-yellow";
  if (rating >= 70) return "bg-arcade-orange";
  return "bg-arcade-red";
}

function FighterCard({ model }: { model: ModelCatalogEntry }) {
  const d = useT();
  const [open, setOpen] = useState(false);
  const p = getModelPrice(model.providerId, model.id);

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className={cn(
        "rounded-card border-3 border-ink bg-surface p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-hard-sm",
        open && "shadow-hard-sm",
      )}
    >
      <div className="flex items-start gap-2">
        <span aria-hidden className="text-2xl leading-none">
          {model.avatar}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{model.displayName}</p>
          <p className="truncate text-[11px] text-ink/60">{model.family}</p>
        </div>
        <BrandLogo brand={model.brand} size={12} />
      </div>
      <div className="mt-2" title={d.report.roster.ratingTitle}>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-ink bg-paper">
            <div
              className={cn("h-full", ratingColor(model.debateRating))}
              style={{ width: `${model.debateRating}%` }}
            />
          </div>
          <span className="font-mono text-xs font-bold">{model.debateRating}</span>
        </div>
      </div>
      {open ? (
        <dl className="mt-2.5 space-y-1 border-t-3 border-ink/10 pt-2 text-[11px]">
          <div className="flex justify-between gap-2">
            <dt className="text-ink/55">{d.report.roster.detailFamily}</dt>
            <dd className="font-bold">{model.family}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink/55">{d.report.roster.detailBackend}</dt>
            <dd className="font-mono font-bold">{model.providerId}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink/55">{d.report.roster.detailMaxOut}</dt>
            <dd className="font-mono font-bold">{model.maxOutputTokens.toLocaleString("en-US")} tok</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink/55">{d.report.roster.detailStreaming}</dt>
            <dd className="font-bold">{model.supportsStreaming ? d.report.roster.yes : d.report.roster.no}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
            <dt className="text-ink/55">{d.report.roster.detailPricing}</dt>
            <dd className="font-mono font-bold">
              {price(p.inputCostPer1M)} {d.report.roster.detailInput} ·{" "}
              <span className="text-arcade-green">
                {price(p.cachedInputCostPer1M ?? p.inputCostPer1M)} {d.report.roster.detailCached}
              </span>{" "}
              · {price(p.outputCostPer1M)} {d.report.roster.detailOutput}
            </dd>
          </div>
        </dl>
      ) : null}
    </button>
  );
}

export function FighterRoster() {
  const d = useT();
  const [brand, setBrand] = useState<string>("all");
  const [sort, setSort] = useState<"rating" | "catalog">("rating");

  const models = useMemo(() => {
    const list = MODEL_CATALOG.filter((m) => brand === "all" || m.brand === brand);
    return sort === "rating" ? [...list].sort((a, b) => b.debateRating - a.debateRating) : list;
  }, [brand, sort]);

  const chip = (active: boolean) =>
    cn(
      "flex items-center gap-1.5 rounded-btn border-3 border-ink px-2 py-1 text-[11px] font-extrabold transition",
      active ? "bg-arcade-pink text-night shadow-hard-sm" : "bg-surface hover:bg-arcade-yellow hover:text-night",
    );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setBrand("all")} className={chip(brand === "all")}>
          {d.report.roster.filterAll}
        </button>
        {BRANDS.map((b) => (
          <button
            key={b.brand}
            type="button"
            onClick={() => setBrand(b.brand)}
            className={chip(brand === b.brand)}
          >
            <BrandLogo brand={b.brand} size={11} />
            {b.brand}
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setSort("rating")} className={chip(sort === "rating")}>
            🏆 {d.report.roster.sortRating}
          </button>
          <button type="button" onClick={() => setSort("catalog")} className={chip(sort === "catalog")}>
            📇 {d.report.roster.sortCatalog}
          </button>
        </div>
        <p className="font-mono text-xs text-ink/50">{d.report.roster.count(models.length)}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {models.map((m) => (
          <FighterCard key={m.id} model={m} />
        ))}
      </div>
      <p className="mt-3 text-xs text-ink/55">{d.report.roster.tapHint}</p>
    </div>
  );
}
