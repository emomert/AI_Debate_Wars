"use client";

/**
 * The rotating-line hook shared by the thinking bubble (the wait before text
 * appears) and the streaming card caption (while text is typing). The actual
 * line pools now live in the i18n dictionary (d.debate.fighterLines /
 * researchLines / judgeLines / writingLines) so they're localized; consumers
 * pass the localized array in. `{name}` is replaced with the fighter's name.
 */

import { useEffect, useMemo, useState } from "react";

const ROTATE_MS = 7400;

/**
 * Returns a randomized line from `pool` (with `{name}` filled in) that rotates
 * to a different one every `intervalMs`. SSR-safe: renders a fixed first line
 * on the server / first client paint, then randomizes after mount so there's
 * no hydration mismatch.
 */
export function useRotatingLine(
  pool: readonly string[],
  name: string,
  intervalMs = ROTATE_MS,
): string {
  const lines = useMemo(() => pool.map((t) => t.replace("{name}", name)), [pool, name]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const pick = () => Math.floor(Math.random() * lines.length);
    setIdx(pick());
    if (lines.length <= 1) return;
    const id = setInterval(() => {
      setIdx((cur) => {
        let next = cur;
        while (next === cur) next = pick();
        return next;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [lines, intervalMs]);

  return lines[idx] ?? lines[0] ?? "";
}
