/**
 * Debator — cut the recorded demo footage into the ≤30s home-page video.
 *
 * Reads demo-recording/raw.webm + events.json (from scripts/record-demo.mjs)
 * and speed-edits per phase: topic typing near real-time, fighter picks light,
 * a beat on the Match Card's coin total, the match fast-forwarded (first turn
 * readable), and a real hold on the verdict score bar.
 *
 * Two things the old cut got wrong, fixed here:
 *  - DEAD SPACE. The old arena shots spent ~40% of the screen on empty dotted
 *    background. That is fixed IN CAMERA — record-demo.mjs now scrolls each
 *    finished turn to center — rather than by cropping here. A crop was tried
 *    and rejected: to keep 16:9 it also eats the left/right margins, slicing
 *    the logo and topic line mid-word, which reads as an accident. Framing
 *    belongs in the shot, not the edit.
 *  - CAPTIONS DRIFTING. The clip is silent, so DemoOverlay narrates it. Rather
 *    than burn text into the pixels (unstyleable, unlocalizable, needs a
 *    re-encode to fix a typo), we emit public/demo/demo-chapters.json with the
 *    real cut boundaries and let the overlay render captions from THAT — one
 *    source of truth, so a re-cut can never desync the words from the picture.
 *
 * Output: public/demo/demo-match.mp4 (h264, silent, faststart)
 *       + public/demo/demo-chapters.json
 * Needs ffmpeg on PATH. Usage: node scripts/edit-demo.mjs
 */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const RAW = "demo-recording/raw.webm";
const OUT = "public/demo/demo-match.mp4";
const CHAPTERS = "public/demo/demo-chapters.json";
const W = 1280;
const H = 720;

const events = JSON.parse(readFileSync("demo-recording/events.json", "utf8"));
const ms = (name) => {
  const e = events.find((x) => x.name === name);
  if (!e) throw new Error(`missing event mark: ${name}`);
  return e.ms;
};

// Real footage duration — decode it (Playwright's webm lacks duration
// metadata; ffmpeg reports decode progress on stderr).
const nullRun = spawnSync("ffmpeg", ["-i", RAW, "-f", "null", "-"], { encoding: "utf8" });
const times = [...(nullRun.stderr ?? "").matchAll(/time=(\d+):(\d+):(\d+\.\d+)/g)];
if (times.length === 0) throw new Error("could not decode footage duration");
const last = times[times.length - 1];
const duration = Number(last[1]) * 3600 + Number(last[2]) * 60 + Number(last[3]);

// Event clock (t0 at goto) vs video clock (starts at page creation): the last
// mark fires right before the recording stops, so the tail difference IS the
// start offset. Shift every boundary by it.
const offset = Math.max(0, duration - ms("end") / 1000);
const t = (name) => ms(name) / 1000 + offset;

/**
 * Phase plan. `target` = seconds on screen (speeds never go below 1x).
 * `caption` is what DemoOverlay narrates over that stretch.
 */
// Boundaries use marks with REAL gaps between them. Two pairs are effectively
// simultaneous in the recorder — setup-ready→typing-start (it clicks the topic
// box immediately) and cost-shown→match-start (it clicks START immediately) —
// so trimming between them yields a sub-frame clip that encodes to nothing.
// The opening instead backs up a beat from setup-ready, and the coin beat is
// the rules-done→cost-shown hold (where the recorder actually pauses on the
// Match Card). The MIN_SEG guard below catches any future degenerate pair.
const plan = [
  { from: Math.max(0, t("setup-ready") - 2.0), to: t("typing-start"), target: 1.4, caption: "Set up your match" },
  { from: t("typing-start"), to: t("typing-end"), target: 3.0, caption: "① Drop in any topic" },
  { from: t("typing-end"), to: t("fighters-done"), target: 4.8, caption: "② Pick your two fighters" },
  { from: t("fighters-done"), to: t("rules-done"), target: 2.4, caption: "③ Set the rules" },
  { from: t("rules-done"), to: t("cost-shown"), target: 2.0, caption: "Every match has a coin price" },
  { from: t("match-start"), to: t("turn-1-done"), target: 3.0, caption: "④ They argue — for real" },
  { from: t("turn-1-done"), to: t("verdict"), target: 6.5, caption: "Three rounds, back and forth" },
  { from: t("verdict"), to: t("verdict-framed"), target: 2.0, caption: "⑤ A neutral AI judge decides" },
  { from: t("verdict-framed"), to: duration, target: 3.5, caption: "⑤ A neutral AI judge decides" },
].filter((seg) => {
  // A trim shorter than a couple of frames produces no packets and ffmpeg
  // aborts with "Nothing was written into output file" — drop it loudly.
  const real = seg.to - seg.from;
  if (real >= 0.25) return true;
  console.warn(`! skipping degenerate segment (${real.toFixed(3)}s): "${seg.caption}"`);
  return false;
});

const chains = [];
const labels = [];
const chapters = [];
let clock = 0;

plan.forEach((seg, i) => {
  const real = Math.max(0.05, seg.to - seg.from);
  const speed = Math.max(1, real / seg.target);
  const shown = real / speed;

  const steps = [
    `trim=start=${seg.from.toFixed(3)}:end=${seg.to.toFixed(3)}`,
    `setpts=(PTS-STARTPTS)/${speed.toFixed(4)}`,
  ];
  // Normalize EVERY segment to the same size, pixel format, aspect and frame
  // rate before concat. The filter demands identical parameters on all inputs;
  // mixing cropped and uncropped ones (differing SAR) fails the whole graph
  // with "Error reinitializing filters", and Playwright's webm is variable-fps.
  steps.push(`scale=${W}:${H}`, "setsar=1", "format=yuv420p", "fps=30");
  chains.push(`[0:v]${steps.join(",")}[v${i}]`);
  labels.push(`[v${i}]`);

  // Merge consecutive segments that narrate the same line.
  const prev = chapters[chapters.length - 1];
  if (prev && prev.caption === seg.caption) prev.end = clock + shown;
  else chapters.push({ start: clock, end: clock + shown, caption: seg.caption });
  clock += shown;

  console.log(
    `seg ${i}: ${seg.from.toFixed(1)}s → ${seg.to.toFixed(1)}s (real ${real.toFixed(1)}s) @ ${speed.toFixed(1)}x` +
      ` → ${shown.toFixed(1)}s`,
  );
});

const filter = `${chains.join(";")};${labels.join("")}concat=n=${plan.length}:v=1:a=0[out]`;

mkdirSync("public/demo", { recursive: true });
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-i", RAW,
    "-filter_complex", filter,
    "-map", "[out]",
    "-an",
    "-c:v", "libx264",
    "-crf", "22",
    "-preset", "medium",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    OUT,
  ],
  { stdio: ["ignore", "inherit", "inherit"] },
);

writeFileSync(
  CHAPTERS,
  `${JSON.stringify(
    { duration: Number(clock.toFixed(3)), chapters: chapters.map((c) => ({ ...c, start: Number(c.start.toFixed(3)), end: Number(c.end.toFixed(3)) })) },
    null,
    2,
  )}\n`,
);

console.log(`\nWrote ${OUT} (~${clock.toFixed(1)}s) + ${CHAPTERS} (${chapters.length} captions)`);
