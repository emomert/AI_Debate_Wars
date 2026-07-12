/**
 * Debator — cut the recorded demo footage into the ≤30s home-page video.
 *
 * Reads demo-recording/raw.webm + events.json (from scripts/record-demo.mjs)
 * and speed-edits per phase: intro brisk, topic typing ~real-time, fighter
 * selection light, the match heavily fast-forwarded (first turn readable),
 * verdict held near real-time. Output: public/demo/demo-match.mp4 (h264,
 * silent, faststart). Needs ffmpeg on PATH.
 *
 * Usage: node scripts/edit-demo.mjs
 */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const RAW = "demo-recording/raw.webm";
const OUT = "public/demo/demo-match.mp4";

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

// Phase plan: [start, end, target seconds on screen]. Speeds never go below 1x.
// The clip OPENS just before typing begins — everything earlier is the page
// still loading (dev-server compile on a cold route), not worth screen time.
const plan = [
  [Math.max(0, t("typing-start") - 1.2), t("typing-start"), 1.2],
  [t("typing-start"), t("typing-end"), 3.2],
  [t("typing-end"), t("rules-done"), 6.5],
  [t("rules-done"), t("turn-1-done"), 3.5],
  [t("turn-1-done"), t("verdict"), 9.0],
  [t("verdict"), duration, 5.0],
];

const chains = [];
const labels = [];
plan.forEach(([from, to, target], i) => {
  const real = Math.max(0.05, to - from);
  const speed = Math.max(1, real / target);
  chains.push(
    `[0:v]trim=start=${from.toFixed(3)}:end=${to.toFixed(3)},setpts=(PTS-STARTPTS)/${speed.toFixed(4)}[v${i}]`,
  );
  labels.push(`[v${i}]`);
  console.log(
    `seg ${i}: ${from.toFixed(1)}s → ${to.toFixed(1)}s (real ${real.toFixed(1)}s) @ ${speed.toFixed(1)}x → ${(real / speed).toFixed(1)}s`,
  );
});
const filter = `${chains.join(";")};${labels.join("")}concat=n=${plan.length}:v=1:a=0,fps=30[out]`;

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

const total = plan.reduce((s, [from, to, target]) => s + Math.min(to - from, target), 0);
console.log(`\nWrote ${OUT} (~${total.toFixed(1)}s)`);
