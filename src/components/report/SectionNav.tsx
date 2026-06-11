"use client";

/**
 * SectionNav — sticky scrollspy chip bar for the report's sections.
 * Pure anchors (#id) so sections stay deep-linkable; an IntersectionObserver
 * highlights the section currently in view.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface NavSection {
  id: string;
  label: string;
}

export function SectionNav({ sections, ariaLabel }: { sections: NavSection[]; ariaLabel: string }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      // Trigger when a section's top crosses the upper third of the viewport.
      { rootMargin: "-120px 0px -60% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label={ariaLabel}
      className="sticky top-[52px] z-20 -mx-4 mb-6 border-b-3 border-ink/10 bg-paper/90 px-4 py-2 backdrop-blur print:hidden sm:-mx-6 sm:px-6"
    >
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {sections.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={activeId === s.id ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-btn border-3 border-ink px-2.5 py-1 text-xs font-extrabold transition",
              activeId === s.id
                ? "bg-arcade-yellow text-night shadow-hard-sm"
                : "bg-surface hover:bg-arcade-yellow hover:text-night",
            )}
          >
            <span className="font-mono text-[10px] text-ink/50">{i + 1}</span> {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
