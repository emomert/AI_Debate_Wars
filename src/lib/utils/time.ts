/** Returns an ISO timestamp for the current moment. */
export function now(): string {
  return new Date().toISOString();
}
