/**
 * Source ranking for Deep Debate — prefer academic / authoritative links.
 *
 * Search engines surface Wikipedia/Reddit first for most topics, but a debate
 * built on evidence should cite journals, universities and official bodies
 * when they exist. So search providers fetch a LARGER pool than needed and
 * this module re-ranks it: academic sources float to the top, community/
 * encyclopedia content sinks, and the original engine relevance order is kept
 * within each tier. Pop-culture topics with zero academic coverage degrade
 * gracefully to the engine's own ranking instead of returning nothing.
 */

import type { Citation } from "@/lib/debate/debateTypes";

/** Higher tier = preferred. The sort is stable within a tier. */
export type SourceTier = 0 | 1 | 2;

// Hosts (matched on the registrable suffix) that publish peer-reviewed work,
// preprints, official statistics or institutional research.
const ACADEMIC_HOSTS = [
  "arxiv.org",
  "biorxiv.org",
  "medrxiv.org",
  "ssrn.com",
  "nature.com",
  "science.org",
  "sciencedirect.com",
  "springer.com",
  "link.springer.com",
  "wiley.com",
  "onlinelibrary.wiley.com",
  "tandfonline.com",
  "sagepub.com",
  "jstor.org",
  "doi.org",
  "plos.org",
  "frontiersin.org",
  "mdpi.com",
  "oup.com",
  "academic.oup.com",
  "cambridge.org",
  "ieee.org",
  "ieeexplore.ieee.org",
  "acm.org",
  "dl.acm.org",
  "nber.org",
  "semanticscholar.org",
  "pubmed.ncbi.nlm.nih.gov",
  "ncbi.nlm.nih.gov",
  "nejm.org",
  "thelancet.com",
  "bmj.com",
  "jamanetwork.com",
  "cell.com",
  "pnas.org",
  "royalsocietypublishing.org",
  "apa.org",
  "acs.org",
  "rsc.org",
  "iop.org",
  "dergipark.org.tr",
  "who.int",
  "oecd.org",
  "worldbank.org",
  "imf.org",
  "un.org",
  "europa.eu",
];

// Hosts demoted below ordinary results: user-generated/community content and
// encyclopedias (feedback: "right now I see that it cites from Wikipedia").
const DEMOTED_HOSTS = [
  "wikipedia.org",
  "wikimedia.org",
  "wikihow.com",
  "fandom.com",
  "reddit.com",
  "quora.com",
  "pinterest.com",
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "medium.com",
  "blogspot.com",
  "tumblr.com",
];

/** True when `hostname` is `host` or a subdomain of it. */
function matchesHost(hostname: string, host: string): boolean {
  return hostname === host || hostname.endsWith(`.${host}`);
}

// ccTLDs whose `ac.`/`edu.`/`gov.` second level is a RESTRICTED registry for
// real institutions (ac.uk, edu.tr, gov.au, …). Deliberately an allowlist:
// open registries like edu.io / gov.io / edu.gg are NOT here, so a private
// lookalike under them stays ordinary instead of being promoted.
const ACADEMIC_CC = new Set([
  "uk", "au", "nz", "jp", "kr", "cn", "hk", "tw", "in", "za", "tr", "br",
  "mx", "il", "sg", "my", "th", "id", "ph", "pk", "eg", "ru", "ua", "gr",
  "pt", "es", "it", "ar", "cl", "co", "pe", "sa", "ae", "ng", "ke", "ca",
]);

/**
 * Academic/government TLD test. `.edu`/`.gov` are restricted US registries, so
 * they qualify bare. Country forms only qualify under ACADEMIC_CC — crucially
 * bare `.ac` does NOT (it's the openly-registrable Ascension Island ccTLD; the
 * academic form is `ac.<cc>` like ac.uk / ac.jp).
 */
function isAcademicTld(hostname: string): boolean {
  if (/\.(edu|gov)$/.test(hostname)) return true;
  const m = hostname.match(/\.(?:edu|gov|ac)\.([a-z]{2})$/);
  return m !== null && ACADEMIC_CC.has(m[1]);
}

export function sourceTier(url: string): SourceTier {
  let hostname: string;
  try {
    // Strip a trailing FQDN dot ("mit.edu." / "wikipedia.org.") so it can't
    // dodge both the academic promotion and the community demotion below.
    hostname = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return 1; // unparseable → treat as ordinary, mapResults already filtered
  }
  if (isAcademicTld(hostname)) return 2;
  if (ACADEMIC_HOSTS.some((h) => matchesHost(hostname, h))) return 2;
  if (DEMOTED_HOSTS.some((h) => matchesHost(hostname, h))) return 0;
  return 1;
}

/**
 * Re-rank a citation pool by source tier (academic → ordinary → demoted),
 * keeping the engine's relevance order within each tier, then take the top
 * `count` and re-index them 1..k so inline [n] markers stay contiguous.
 */
export function rankCitations(pool: Citation[], count: number): Citation[] {
  return pool
    .map((c, i) => ({ c, i, tier: sourceTier(c.url) }))
    .sort((a, b) => b.tier - a.tier || a.i - b.i)
    .slice(0, Math.max(0, count))
    .map(({ c }, i) => ({ ...c, index: i + 1 }));
}
