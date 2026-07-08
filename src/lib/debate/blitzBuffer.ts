/** Blitz pre-generation buffer: how many turns to generate before playback starts. */
export const BLITZ_BUFFER = 4;

/** True once enough turns are buffered (or the whole — shorter — match is ready). */
export function canStartPlayback(generatedCount: number, totalTurns: number): boolean {
  return generatedCount >= Math.min(BLITZ_BUFFER, totalTurns);
}
