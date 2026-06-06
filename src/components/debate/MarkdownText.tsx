/**
 * MarkdownText — a small, dependency-free markdown renderer for debate turns and
 * the verdict. Handles what LLM debate text actually uses: paragraphs, **bold**,
 * *italic*, `inline code`, bullet/numbered lists and short headings.
 *
 * Streaming-safe: it suppresses a half-typed emphasis marker (so you never see a
 * stray "**" mid-word), and accepts a `cursor` node that it places INLINE right
 * after the last typed character — so the typewriter caret behaves like a real
 * text caret instead of dropping to its own line.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Parse inline markdown within a line: [text](url) links, [n] citation chips
 * (Deep Debate), **bold**, *italic*, `code`.
 */
function renderInline(
  text: string,
  keyBase: string,
  citationCount = 0,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re =
    /(\[([^\]\n]+)\]\(([^)\s]+)\))|(\[(\d{1,3})\])|(\*\*([^*]+?)\*\*)|(__([^_]+?)__)|(\*([^*\s][^*]*?)\*)|(_([^_\s][^_]*?)_)|(`([^`]+?)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[2] !== undefined && m[3] !== undefined) {
      nodes.push(
        <a
          key={key}
          href={m[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-arcade-blue underline decoration-2 underline-offset-2 hover:text-arcade-purple"
        >
          {m[2]}
        </a>,
      );
    } else if (m[5] !== undefined) {
      // Bare [n] citation marker → small superscript chip (the Sources list
      // below carries the actual links). Only chip valid in-range markers.
      const n = Number(m[5]);
      if (citationCount > 0 && n >= 1 && n <= citationCount) {
        nodes.push(
          <sup
            key={key}
            className="mx-0.5 rounded-[4px] border border-ink bg-arcade-purple/20 px-1 font-mono text-[0.7em] font-bold text-ink"
          >
            {n}
          </sup>,
        );
      } else {
        nodes.push(m[4]);
      }
    } else if (m[7] !== undefined) nodes.push(<strong key={key}>{m[7]}</strong>);
    else if (m[9] !== undefined) nodes.push(<strong key={key}>{m[9]}</strong>);
    else if (m[11] !== undefined) nodes.push(<em key={key}>{m[11]}</em>);
    else if (m[13] !== undefined) nodes.push(<em key={key}>{m[13]}</em>);
    else if (m[15] !== undefined)
      nodes.push(
        <code
          key={key}
          className="rounded bg-ink/10 px-1 py-0.5 font-mono text-[0.85em]"
        >
          {m[15]}
        </code>,
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const BULLET_RE = /^\s*[-*]\s+(.*)$/;
const NUMBERED_RE = /^\s*\d+\.\s+(.*)$/;
const HEADING_RE = /^\s*(#{1,4})\s+(.*)$/;

/** Drop a trailing unmatched emphasis marker while text is still being typed. */
function stripIncompleteMarkdown(text: string): string {
  let t = text;
  const drop = (marker: string) => {
    const count = t.split(marker).length - 1;
    if (count % 2 === 1) {
      const i = t.lastIndexOf(marker);
      if (i !== -1) t = t.slice(0, i) + t.slice(i + marker.length);
    }
  };
  drop("**"); // bold first
  drop("`"); // inline code
  drop("*"); // remaining single-star italic
  drop("_"); // underscore italic
  return t;
}

export function MarkdownText({
  content,
  className,
  streaming,
  cursor,
  citationCount = 0,
}: {
  content: string;
  className?: string;
  streaming?: boolean;
  /** Inline node appended right after the final character (e.g. a typing caret). */
  cursor?: ReactNode;
  /** Deep Debate: number of sources, so [n] markers render as citation chips. */
  citationCount?: number;
}) {
  const source = streaming ? stripIncompleteMarkdown(content) : content;
  const blocks = source.split(/\n\s*\n/);
  const lineGroups = blocks.map((b) => b.split("\n").filter((l) => l.trim() !== ""));

  // Index of the last non-empty block — the cursor attaches at its end.
  let lastIdx = -1;
  for (let i = lineGroups.length - 1; i >= 0; i--) {
    if (lineGroups[i].length > 0) {
      lastIdx = i;
      break;
    }
  }

  return (
    <div
      className={cn(
        "space-y-3 text-sm leading-relaxed text-ink/85 sm:text-[15px]",
        className,
      )}
    >
      {blocks.map((block, bi) => {
        const lines = lineGroups[bi];
        if (lines.length === 0) return null;
        const tail = bi === lastIdx ? cursor : null;

        const heading = lines.length === 1 ? lines[0].match(HEADING_RE) : null;
        if (heading) {
          return (
            <p key={bi} className="font-heading text-base font-extrabold text-ink">
              {renderInline(heading[2], `h-${bi}`, citationCount)}
              {tail}
            </p>
          );
        }

        if (lines.every((l) => BULLET_RE.test(l))) {
          return (
            <ul key={bi} className="space-y-1">
              {lines.map((l, li) => (
                <li key={li} className="flex gap-2">
                  <span aria-hidden className="mt-[2px] select-none text-ink/40">
                    ▸
                  </span>
                  <span>
                    {renderInline(l.match(BULLET_RE)![1], `b-${bi}-${li}`, citationCount)}
                    {li === lines.length - 1 ? tail : null}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (lines.every((l) => NUMBERED_RE.test(l))) {
          return (
            <ol key={bi} className="space-y-1">
              {lines.map((l, li) => (
                <li key={li} className="flex gap-2">
                  <span
                    aria-hidden
                    className="select-none font-mono text-xs font-bold text-ink/50"
                  >
                    {li + 1}.
                  </span>
                  <span>
                    {renderInline(l.match(NUMBERED_RE)![1], `o-${bi}-${li}`, citationCount)}
                    {li === lines.length - 1 ? tail : null}
                  </span>
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={bi}>
            {renderInline(lines.join(" "), `p-${bi}`, citationCount)}
            {tail}
          </p>
        );
      })}
    </div>
  );
}
