/**
 * Stable id generation. Uses crypto.randomUUID when available, with a safe
 * fallback for older runtimes.
 */
export function createId(prefix = "id"): string {
  let core: string;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    core = crypto.randomUUID();
  } else {
    core = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
  return `${prefix}_${core}`;
}
