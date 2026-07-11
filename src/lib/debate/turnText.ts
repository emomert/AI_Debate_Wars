/**
 * Post-processing for model turn TEXT (the debate pipeline's last-mile
 * cleanup, like citations.ts is for [n] markers).
 */

/**
 * Strip an echoed heading like "Opening Arguments — Pro Side" from the top of
 * a turn. Models — deep-debate runs especially — tend to open with a title
 * restating the round label and/or their side even when the prompt forbids it.
 *
 * Deliberately conservative: the first non-blank line is removed only when it
 * clearly IS a title — short, no sentence-ending punctuation, and mentioning
 * the round label or a "<pro|against|for|con> side" phrase — and only when
 * real content follows it. Everything else passes through untouched.
 */
export function stripEchoedHeading(content: string, roundLabel?: string): string {
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return content;

  // Unwrap markdown decoration: "## **Rebuttals — Pro Side:**" → "Rebuttals — Pro Side"
  const plain = lines[i]
    .trim()
    .replace(/^#+\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/[:\s]+$/, "")
    .trim();
  if (plain === "" || plain.length > 80 || /[.!?…]$/.test(plain)) return content;

  const lower = plain.toLowerCase();
  const mentionsRound =
    typeof roundLabel === "string" &&
    roundLabel.trim() !== "" &&
    lower.includes(roundLabel.trim().toLowerCase());
  const mentionsSide = /\b(pro|against|for|con)[\s-]+side\b/.test(lower);
  if (!mentionsRound && !mentionsSide) return content;

  const rest = lines
    .slice(i + 1)
    .join("\n")
    .trimStart();
  return rest === "" ? content : rest;
}
