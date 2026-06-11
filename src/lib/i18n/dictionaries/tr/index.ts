/**
 * Turkish dictionary composition. Typed as `Dictionary` (derived from English)
 * so any missing/renamed key is a compile error — the two languages can never
 * silently drift out of sync.
 */
import type { Dictionary } from "../en";
import { common } from "./common";
import { shell } from "./shell";
import { home } from "./home";
import { setup } from "./setup";
import { debate } from "./debate";
import { result } from "./result";
import { profile } from "./profile";
import { report } from "./report";
import { auth } from "./auth";
import { legal } from "./legal";
import { community } from "./community";

export const tr: Dictionary = {
  common,
  shell,
  home,
  setup,
  debate,
  result,
  profile,
  report,
  auth,
  legal,
  community,
};
