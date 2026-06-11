/**
 * speechText — turns a debate message's markdown content into clean text for
 * speech synthesis. Shared by the Web Speech engine (client) and the /api/tts
 * route (server), so both voices read the same words: no markdown syntax, no
 * [n] citation markers, no URLs.
 */

/** Strip markdown + citation markers down to plain speakable sentences. */
export function toSpeechText(content: string): string {
  let text = content;

  // Fenced code blocks → drop entirely (reading code aloud is noise).
  text = text.replace(/```[\s\S]*?```/g, " ");
  // Inline code → keep the inner text.
  text = text.replace(/`([^`]*)`/g, "$1");
  // Links: [label](url) → label; bare URLs → dropped.
  text = text.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1");
  text = text.replace(/https?:\/\/\S+/g, " ");
  // Citation markers like [1], [12] → removed (the chips are visual-only).
  text = text.replace(/\[\d+\]/g, "");
  // Emphasis/bold markers.
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  // Headings and blockquotes → plain lines.
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^>\s?/gm, "");
  // List bullets → sentence-ish lines.
  text = text.replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "");
  // Collapse whitespace.
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Cap speech text at `max` characters, cutting at a sentence boundary where
 * possible so the voice never stops mid-word.
 */
export function truncateForSpeech(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSentence = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
  );
  // Only respect the boundary if it keeps a meaningful chunk.
  if (lastSentence > max * 0.5) return slice.slice(0, lastSentence + 1);
  const lastSpace = slice.lastIndexOf(" ");
  return lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
}

/**
 * Split text into chunks safe for the Web Speech API. Desktop Chrome silently
 * cuts utterances around ~200-250 characters / ~15s, so we speak sentence
 * groups of at most `maxLen` chars, chained one after another.
 */
export function chunkForWebSpeech(text: string, maxLen = 180): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > maxLen) {
      chunks.push(current.trim());
      current = "";
    }
    // A single overlong sentence still gets split on commas / spaces.
    if (sentence.length > maxLen) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      let rest = sentence;
      while (rest.length > maxLen) {
        const slice = rest.slice(0, maxLen);
        const cut = Math.max(slice.lastIndexOf(", "), slice.lastIndexOf(" "));
        const at = cut > maxLen * 0.4 ? cut + 1 : maxLen;
        chunks.push(rest.slice(0, at).trim());
        rest = rest.slice(at);
      }
      current = rest;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 0);
}
