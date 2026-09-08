"use client";

/**
 * PricingExplorer — the cost table, made explorable: every catalogue model
 * joined with the price the billing engine would actually use (getModelPrice,
 * including the $0 OpenRouter rule and the fallback), filterable by text,
 * sortable by column, with a log-scale output-price bar per row.
 */

import { useMemo, useState } from "react";

import { useT } from "@/lib/i18n/LocaleProvider";
import { MODEL_CATALOG } from "@/lib/models/modelRegistry";
import { getModelPrice, priceKey } from "@/lib/cost/pricing";
import { BrandLogo } from "@/components/report/BrandLogo";
import { cn } from "@/lib/utils/cn";

type SortKey = "catalog" | "input" | "output";

function priceText(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
}

export function PricingExplorer() {
  const d = useT();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("catalog");

  const allRows = useMemo(
    () =>
      MODEL_CATALOG.map((m) => ({
        model: m,
        key: priceKey(m.providerId, m.id),
        price: getModelPrice(m.providerId, m.id),
      })),
    [],
  );

  const maxOutput = useMemo(
    () => Math.max(...allRows.map((r) => r.price.outputCostPer1M), 1),
    [allRows],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? allRows.filter(
          (r) =>
            r.model.displayName.toLowerCase().includes(q) ||
            r.model.brand.toLowerCase().includes(q) ||
            r.model.id.toLowerCase().includes(q),
        )
      : allRows;
    if (sort === "catalog") return filtered;
    return [...filtered].sort((a, b) =>
      sort === "input"
        ? b.price.inputCostPer1M - a.price.inputCostPer1M
        : b.price.outputCostPer1M - a.price.outputCostPer1M,
    );
  }, [allRows, query, sort]);

  // Log scale so $0.28 and $30 are both visible on the same bar.
  const barWidth = (n: number) =>
    n <= 0 ? 0 : Math.max(4, Math.round((100 * Math.log10(1 + n / 0.05)) / Math.log10(1 + maxOutput / 0.05)));

  const sortableTh = (key: SortKey, label: string) => (
    <th className="py-2 pr-3">
      <button
        type="button"
        onClick={() => setSort(key)}
        className={cn(
          "rounded-btn px-1 font-heading text-xs uppercase tracking-wide transition hover:text-ink",
          sort === key ? "text-ink underline decoration-2 underline-offset-2" : "text-ink/60",
        )}
      >
        {label}
        {sort === key ? " ▾" : ""}
      </button>
    </th>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={d.report.cost.explorer.filterPlaceholder}
          className="w-full max-w-xs rounded-btn border-3 border-ink bg-surface px-3 py-1.5 text-sm outline-none focus-visible:outline-3 focus-visible:outline-offset-2"
        />
        <p className="font-mono text-xs text-ink/50">
          {d.report.cost.explorer.count(rows.length, allRows.length)}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b-3 border-ink text-left">
              {sortableTh("catalog", d.report.cost.colModel)}
              {sortableTh("input", d.report.cost.colInput)}
              <th className="py-2 pr-3 font-heading text-xs uppercase tracking-wide text-ink/60">
                {d.report.cost.colCached}
              </th>
              {sortableTh("output", d.report.cost.colOutput)}
              <th className="w-[22%] py-2" aria-label={d.report.cost.explorer.barNote} />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ model, key, price }) => (
              <tr key={key} className="border-b border-ink/10">
                <td className="py-1.5 pr-3">
                  <div className="flex items-center gap-2">
                    <BrandLogo brand={model.brand} size={11} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{model.displayName}</p>
                      <p className="truncate font-mono text-[10px] text-ink/45">{model.id}</p>
                    </div>
                  </div>
                </td>
                <td className="py-1.5 pr-3 font-mono text-xs">${priceText(price.inputCostPer1M)}</td>
                <td className="py-1.5 pr-3 font-mono text-xs text-arcade-green">
                  ${priceText(price.cachedInputCostPer1M ?? price.inputCostPer1M)}
                </td>
                <td className="py-1.5 pr-3 font-mono text-xs">${priceText(price.outputCostPer1M)}</td>
                <td className="py-1.5">
                  <div className="h-2.5 overflow-hidden rounded-full border-2 border-ink/40 bg-paper">
                    <div
                      className="h-full bg-arcade-orange"
                      style={{ width: `${barWidth(price.outputCostPer1M)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink/55">{d.report.cost.explorer.empty}</p>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-ink/45">
        {d.report.cost.explorer.sortHint} {d.report.cost.explorer.barNote}
      </p>
    </div>
  );
}
