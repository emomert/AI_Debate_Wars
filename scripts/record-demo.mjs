/**
 * Debator — record the REAL "See a Demo" footage (docs/09).
 *
 * Drives the live app in a recorded browser session exactly like a user:
 * types the topic, picks Claude Haiku 4.5 (Fighter A · Pro) and GPT-5.4 Mini
 * (Fighter B · Against), shows the Match Card's coin total, sets Fast pace,
 * starts the match, and lets a REAL 3-round match run to its verdict. Saves
 * the raw footage + per-phase timestamps for scripts/edit-demo.mjs.
 *
 * SIGNED IN BY DESIGN (July 2026): coins gate START, so a signed-out run would
 * hit the signup modal and never record a match. We mint a one-time magic-link
 * token with the service role, spend it in a THROWAWAY context, and hand the
 * resulting storageState to the recorded context — so the footage opens on a
 * signed-in /setup (coin chip visible) with no login screen on camera.
 *
 * FIGHTER ORDER IS LOAD-BEARING: the defaults are A=GPT-5.4 Mini,
 * B=DeepSeek V4 Flash. Picking A=DeepSeek first (the old script) collided with
 * B's default, so the camera caught both cards reading the SAME fighter — it
 * looked like a bug. Every pick below moves to a brand neither slot currently
 * holds, so no duplicate state is ever on screen.
 *
 * Needs: the dev server running (npm run dev), provider keys + Supabase service
 * role in .env.local, Google Chrome installed (playwright-core channel
 * "chrome"). Costs 3 coins + a few cents of real tokens. Usage:
 *   node scripts/record-demo.mjs   # writes demo-recording/raw.webm + events.json
 */

import { mkdirSync, writeFileSync, renameSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = "demo-recording";
const TOPIC = "Jamie Lannister is a good person.";
/**
 * TRUE 1080p, same shot. The CSS viewport stays 720p-shaped so the LAYOUT
 * (breakpoints, framing, every scroll position below) is identical to earlier
 * shoots — only the pixel density changes. Recording at a literal 1920x1080
 * viewport would instead shrink the UI and reveal more page: a different, and
 * for a small embedded player a less legible, shot.
 *
 * Getting there is fussier than it looks. `deviceScaleFactor` on the CONTEXT
 * does not work: Playwright's video recorder captures at CSS-pixel size and
 * only ever scales a page DOWN to fit `recordVideo.size`, so a 1280x720
 * viewport lands in the top-left corner of a 1920x1080 canvas with dead grey
 * around it. The device scale has to be real at the BROWSER level
 * (--force-device-scale-factor) with `viewport: null`, so Playwright does not
 * override device metrics with its own emulation.
 *
 * WINDOW_SIZE is in CSS px and includes browser chrome (~16w / ~95h), so 1296
 * x815 yields a 1280x721 CSS viewport = 1920x1081.5 real pixels. That slightly
 * EXCEEDS the frame on purpose — Playwright scales it down to fit, which is
 * better than the grey band an undersized viewport leaves. No window height
 * gives exactly 720 (rounding jumps 719 -> 721).
 *
 * Playwright's recorder is pinned at 25fps and exposes no fps option, so a
 * 60fps output could only duplicate frames — see docs/09.
 */
const WINDOW_SIZE = { width: 1296, height: 815 };
const DEVICE_SCALE = 1.5;
const VIDEO_SIZE = { width: 1920, height: 1080 };
/** CSS viewport the choreography below assumes (used only for a sanity check). */
const VIEWPORT = { width: 1280, height: 720 };

/* ------------------------------- env helpers ------------------------------ */

// Fall back to parsing .env.local so this works without Node's --env-file flag
// (same approach as scripts/apply-migrations.mjs).
const localEnv = (() => {
  try {
    const raw = readFileSync(".env.local", "utf8");
    const out = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
})();
const env = (k) => process.env[k] ?? localEnv[k];

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE = env("SUPABASE_SERVICE_ROLE_KEY");
// Whose account records the demo. Defaults to the first admin id — that account
// already holds coins, and its balance is what shows in the header chip.
const DEMO_USER_ID = env("DEMO_USER_ID") ?? (env("ADMIN_USER_IDS") ?? "").split(",")[0]?.trim();

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (env or .env.local):\n" +
      "coins gate START, so the recorder must sign in.",
  );
  process.exit(1);
}
if (!DEMO_USER_ID) {
  console.error("Need DEMO_USER_ID (or ADMIN_USER_IDS) — the account that records the demo.");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

/* --------------------------- one-time sign-in link ------------------------ */

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(DEMO_USER_ID);
if (userErr || !userRes?.user?.email) {
  console.error(`Could not resolve demo user ${DEMO_USER_ID}: ${userErr?.message ?? "no email"}`);
  process.exit(1);
}
const demoEmail = userRes.user.email;

// A magic-link token_hash the /auth/callback route can verifyOtp (see that file).
const { data: linkRes, error: linkErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: demoEmail,
});
if (linkErr || !linkRes?.properties?.hashed_token) {
  console.error(`Could not mint a sign-in link: ${linkErr?.message ?? "no token"}`);
  process.exit(1);
}
const signInUrl =
  `${BASE}/auth/callback?token_hash=${encodeURIComponent(linkRes.properties.hashed_token)}` +
  `&type=magiclink&next=${encodeURIComponent("/setup")}`;

/* ------------------------------- browser work ----------------------------- */

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [
    `--force-device-scale-factor=${DEVICE_SCALE}`,
    `--window-size=${WINDOW_SIZE.width},${WINDOW_SIZE.height}`,
  ],
});

// Phase 0 — burn the sign-in link OFF camera, keep the session.
const authCtx = await browser.newContext({ viewport: null });
const authPage = await authCtx.newPage();
await authPage.goto(signInUrl, { waitUntil: "networkidle" });
if (/\/login/.test(authPage.url())) {
  console.error(`Sign-in failed (landed on ${authPage.url()}).`);
  await browser.close();
  process.exit(1);
}
const storageState = await authCtx.storageState();
await authCtx.close();
console.log(`Signed in as ${demoEmail} (off camera).`);

// Phase 1 — the recorded session, already authenticated.
const ctx = await browser.newContext({
  viewport: null, // real window metrics — see the WINDOW_SIZE note above
  recordVideo: { dir: OUT_DIR, size: VIDEO_SIZE },
  storageState,
});
const page = await ctx.newPage();

// Verify the capture geometry BEFORE spending coins: a wrong window size
// silently yields a letterboxed or mis-framed video, and by then a real match
// has already been paid for.
const metrics = await page.evaluate(() => ({
  w: window.innerWidth,
  h: window.innerHeight,
  dpr: window.devicePixelRatio,
}));
if (
  metrics.dpr !== DEVICE_SCALE ||
  Math.abs(metrics.w - VIEWPORT.width) > 2 ||
  Math.abs(metrics.h - VIEWPORT.height) > 4
) {
  console.error(
    `Capture geometry is off: CSS ${metrics.w}x${metrics.h} @${metrics.dpr}x ` +
      `(want ~${VIEWPORT.width}x${VIEWPORT.height} @${DEVICE_SCALE}x). Adjust WINDOW_SIZE.`,
  );
  await ctx.close();
  await browser.close();
  process.exit(1);
}
console.log(
  `Capture: CSS ${metrics.w}x${metrics.h} @${metrics.dpr}x → ` +
    `${metrics.w * metrics.dpr}x${metrics.h * metrics.dpr} real pixels.`,
);

const t0 = Date.now();
const events = [];
const mark = (name) => {
  events.push({ name, ms: Date.now() - t0 });
  console.log(`[${(((Date.now() - t0) / 1000).toFixed(1) + "s").padStart(7)}] ${name}`);
};
const pause = (ms) => page.waitForTimeout(ms);
/** Scroll a section to a comfortable spot (not jammed under the sticky header). */
const frame = async (locator, block = "center") => {
  await locator.evaluate((el, b) => el.scrollIntoView({ behavior: "smooth", block: b }), block);
  await pause(700);
};

try {
  await page.goto(`${BASE}/setup`, { waitUntil: "networkidle" });
  await pause(1_200); // route fade + panels settle; coin chip paints
  mark("setup-ready");

  // 1 · Topic — typed at human speed.
  const topicBox = page.getByRole("textbox").first();
  await topicBox.click();
  mark("typing-start");
  await page.keyboard.type(TOPIC, { delay: 70 });
  mark("typing-end");
  await pause(900);

  // 2 · Fighters. Order avoids ever showing A and B as the same fighter:
  // defaults are A=GPT-5.4 Mini / B=DeepSeek V4 Flash, so A→Claude is safe
  // first, then B→OpenAI (A no longer holds OpenAI).
  await frame(page.getByText("2 · Choose Your Fighters"), "start");
  mark("fighter-a-start");
  await page.getByRole("group", { name: "Fighter A provider" }).getByRole("button", { name: "Claude" }).click();
  await pause(600);
  await page.getByRole("group", { name: "Fighter A model" }).getByRole("button", { name: /Haiku 4\.5/ }).click();
  await pause(800);
  mark("fighter-b-start");
  await page.getByRole("group", { name: "Fighter B provider" }).getByRole("button", { name: "OpenAI" }).click();
  await pause(600);
  await page.getByRole("group", { name: "Fighter B model" }).getByRole("button", { name: /GPT-5\.4 Mini/ }).click();
  await pause(900);
  mark("fighters-done");

  // 3 · Rules — tone/length are fixed now; pick Fast so the match auto-plays.
  await frame(page.getByText("3 · Match Rules"), "start");
  await pause(700);
  await page.getByRole("radio", { name: /Fast/ }).click();
  await pause(700);

  // 4 · Judge is mandatory (auto). Then hold on the Match Card so the coin
  // total row is on camera before START — the economy is part of the product.
  await frame(page.getByText("4 · Judge"), "start");
  await pause(800);
  mark("rules-done");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pause(1_400);
  mark("cost-shown");

  await page.getByRole("button", { name: /start the match/i }).click();
  mark("match-start");
  await page.waitForURL("**/debate", { timeout: 15_000 });

  // Arena — poll the persisted session; mark each finished turn + the verdict.
  // Between polls, keep the newest message framed so the editor never has to
  // cut around a half-empty stage.
  const DEADLINE = Date.now() + 6 * 60_000;
  let seenMessages = 0;
  let status = "running";
  while (Date.now() < DEADLINE) {
    await pause(1_000);
    const snap = await page.evaluate(() => {
      try {
        const raw = sessionStorage.getItem("ada:session");
        if (!raw) return null;
        const s = JSON.parse(raw).sessions[0];
        return { status: s.status, messages: s.messages.length, verdict: Boolean(s.verdict) };
      } catch {
        return null;
      }
    });
    if (!snap) continue;
    while (seenMessages < snap.messages) {
      seenMessages += 1;
      mark(`turn-${seenMessages}-done`);
      // Bring the freshly finished turn into frame.
      await page.evaluate(() => {
        const cards = document.querySelectorAll("article, [data-message]");
        cards[cards.length - 1]?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
    if (snap.status === "complete" && snap.verdict) {
      status = "complete";
      mark("verdict");
      break;
    }
    if (snap.status === "error" || snap.status === "stopped") {
      status = snap.status;
      mark(`match-${snap.status}`);
      break;
    }
  }
  if (status !== "complete") throw new Error(`match did not complete (status: ${status})`);

  // Hold on the verdict: let the reveal animate, then settle on the score bar
  // (the money shot) rather than stopping mid-scroll like the old cut did.
  await pause(1_500);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  await pause(2_000);
  mark("verdict-framed");
  await pause(4_000);
  mark("end");
} catch (err) {
  await page.screenshot({ path: join(OUT_DIR, "failure.png") }).catch(() => {});
  writeFileSync(join(OUT_DIR, "events.json"), JSON.stringify(events, null, 2));
  await ctx.close();
  await browser.close();
  console.error("Recording failed:", err.message);
  process.exit(1);
}

const video = page.video();
await ctx.close(); // flushes the video file
const videoPath = await video.path();
renameSync(videoPath, join(OUT_DIR, "raw.webm"));
writeFileSync(join(OUT_DIR, "events.json"), JSON.stringify(events, null, 2));
await browser.close();
console.log(`\nSaved ${join(OUT_DIR, "raw.webm")} + events.json (${events.length} marks)`);
