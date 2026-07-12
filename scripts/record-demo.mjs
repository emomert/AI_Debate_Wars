/**
 * Debator — record the REAL "See a Demo" footage (docs/09).
 *
 * Drives the live app in a recorded browser session exactly like a user:
 * types the topic, picks DeepSeek V4 Flash (Fighter A · Pro) and GPT-5.4 Mini
 * (Fighter B · Against), sets Fast pace, starts the match, and lets a REAL
 * 3-round match run to its verdict. Saves the raw footage + per-phase
 * timestamps for scripts/edit-demo.mjs to cut into the ≤30s home-page demo.
 *
 * Needs: the dev server running (npm run dev), provider keys in .env.local,
 * Google Chrome installed (playwright-core channel "chrome" — no downloads).
 * Costs a few cents (one real match). Usage:
 *   node scripts/record-demo.mjs   # writes demo-recording/raw.webm + events.json
 */

import { mkdirSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = "demo-recording";
const TOPIC = "Jamie Lannister is a good person.";

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
});
const page = await ctx.newPage();

const t0 = Date.now();
const events = [];
const mark = (name) => {
  events.push({ name, ms: Date.now() - t0 });
  console.log(`[${(((Date.now() - t0) / 1000).toFixed(1) + "s").padStart(7)}] ${name}`);
};
const pause = (ms) => page.waitForTimeout(ms);

try {
  await page.goto(`${BASE}/setup`, { waitUntil: "networkidle" });
  await pause(900); // route fade + panels settle
  mark("setup-ready");

  // 1 · Topic — typed at human speed.
  const topicBox = page.getByRole("textbox").first();
  await topicBox.click();
  mark("typing-start");
  await page.keyboard.type(TOPIC, { delay: 70 });
  mark("typing-end");
  await pause(700);

  // 2 · Fighters. Transient A==B conflicts are allowed by the picker, so the
  // order (A first, then B) always lands on a valid pair.
  mark("fighter-a-start");
  await page.getByRole("group", { name: "Fighter A provider" }).getByRole("button", { name: "DeepSeek" }).click();
  await pause(500);
  await page.getByRole("group", { name: "Fighter A model" }).getByRole("button", { name: /DeepSeek V4 Flash/ }).click();
  await pause(700);
  mark("fighter-b-start");
  await page.getByRole("group", { name: "Fighter B provider" }).getByRole("button", { name: "OpenAI" }).click();
  await pause(500);
  await page.getByRole("group", { name: "Fighter B model" }).getByRole("button", { name: /GPT-5\.4 Mini/ }).click();
  await pause(700);
  mark("fighters-done");

  // 3 · Rules — serious + short are already the defaults; show them briefly,
  // then pick Fast pace so the match auto-plays.
  await page.getByText("3 · Match Rules").scrollIntoViewIfNeeded();
  await pause(900);
  await page.getByRole("radio", { name: /Fast/ }).click();
  await pause(600);

  // 4 · Judge (auto — already set) then START.
  await page.getByText("4 · Judge").scrollIntoViewIfNeeded();
  await pause(900);
  mark("rules-done");
  await page.getByRole("button", { name: /start the match/i }).click();
  mark("match-start");
  await page.waitForURL("**/debate", { timeout: 15_000 });

  // Arena — poll the persisted session; mark each finished turn + the verdict.
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

  // Hold on the verdict card: scroll it into view and let the reveal play out.
  await pause(1_200);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  await pause(5_000);
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
