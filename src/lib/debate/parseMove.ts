import { BLITZ_MOVES, type BlitzMove } from "@/lib/debate/debateTypes";

// Matches a leading tag at the very start: optional whitespace, the WORD, an
// optional separator (`:`, `!`, `-`), then a boundary (line break / whitespace /
// end). Regex backtracking lets the trailing `\s*` give a space back to the
// boundary group, so "OBJECTION: text" and "receipts - text" both match cleanly.
// Only a first token that IS a known move (checked below) counts — "I object…"
// resolves its first word to "I", which is not a move, so it stays untagged.
const TAG_RE = /^\s*([A-Za-z]+)\s*[:!\-]?\s*(?:\n|\s|$)/;

const MOVE_LOOKUP = new Map<string, BlitzMove>(
  BLITZ_MOVES.map((m) => [m.toUpperCase(), m]),
);

export function parseMove(raw: string): { move: BlitzMove | null; content: string } {
  const text = raw ?? "";
  const m = TAG_RE.exec(text);
  if (m) {
    const candidate = m[1].toUpperCase();
    const move = MOVE_LOOKUP.get(candidate);
    if (move) {
      const content = text.slice(m[0].length).trim();
      return { move, content };
    }
  }
  return { move: null, content: text.trim() };
}
