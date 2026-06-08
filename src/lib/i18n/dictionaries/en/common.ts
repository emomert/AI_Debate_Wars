/**
 * Shared strings used across the whole app (header, footer, language toggle).
 * Area dictionaries each live in their own file so translation work can be
 * split per-area without edit conflicts. English is the source of truth: the
 * `Dictionary` type is derived from the English composition (see ./index), and
 * every Turkish area file must match its shape.
 */
export const common = {
  brand: "DEBATOR",
  tagline: "Arcade interface, serious intelligence.",
  /** Language toggle accessible labels (kept in the target language). */
  switchToEnglish: "Switch to English",
  switchToTurkish: "Türkçe'ye geç",
};
