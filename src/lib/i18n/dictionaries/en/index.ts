/**
 * English dictionary composition — the SOURCE OF TRUTH for the dictionary shape.
 * `Dictionary` is `typeof en`, so adding a key here makes it required in every
 * Turkish area file. Each area lives in its own file so translation work can be
 * split without edit conflicts; create the matching `../tr/<area>.ts` with the
 * same keys.
 */
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
import { coins } from "./coins";

export const en = {
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
  coins,
};

export type Dictionary = typeof en;
