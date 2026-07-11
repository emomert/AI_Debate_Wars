/**
 * Client-side verdict image generator (feedback: share the result as an image of
 * the verdict card). Drawn on a <canvas> — NOT a DOM screenshot — so it needs no
 * dependency and reliably uses the already-loaded web fonts (document.fonts),
 * avoiding the font-embedding flakiness of html-to-image. Browser-only.
 */

import type { DebateSession } from "@/lib/debate/debateTypes";
import { getModelById } from "@/lib/models/modelRegistry";
import { COST_UI_ENABLED } from "@/lib/cost/uiConfig";
import { formatCost } from "@/lib/utils/format";

// Arcade palette (mirrors tailwind.config.ts / globals.css).
const C = {
  paper: "#f7f7f2",
  dot: "#c9c9c9",
  ink: "#050505",
  card: "#ffffff",
  yellow: "#FFD91A",
  blue: "#3B82F6",
  red: "#FF4D4D",
  purple: "#8B5CF6",
};

const W = 1200;
// The image height is computed per-verdict (below) so the FULL winning argument
// and reasoning always fit; this is just the floor so a short/no-judge verdict
// still renders as a proper card-shaped image.
const MIN_H = 540;
const SCALE = 2; // export at 2x for crisp social images

const FONT_DISPLAY = "'Lilita One', system-ui, sans-serif";
const FONT_HEADING = "'Baloo 2', system-ui, sans-serif";
const FONT_BODY = "'Space Grotesk', system-ui, sans-serif";

function winnerLine(session: DebateSession): string {
  const v = session.verdict;
  const a = session.modelA.displayName;
  const b = session.modelB.displayName;
  if (!v) return session.mode === "debate" ? "Debate complete" : "Discussion complete";
  switch (v.winner) {
    case "modelA":
      return `${a} takes it`;
    case "modelB":
      return `${b} takes it`;
    case "tie":
      return "It's a draw";
    default:
      return session.mode === "debate" ? "Debate complete" : "Discussion complete";
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** Wrap `text` to at most `maxLines` lines within `maxWidth`, ellipsizing the last. Exported for tests. */
export function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !cur) {
      cur = test;
    } else {
      lines.push(cur);
      cur = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);

  // Did any words not make it onto a line? (ran out of maxLines)
  const placed = lines.join(" ").split(" ").filter(Boolean).length;
  const truncated = placed < words.length;

  // Ellipsize the last line when text was cut, AND hard-ellipsize ANY line that
  // is still wider than maxWidth — covers a single unbroken token (e.g. a pasted
  // URL/hashtag with no spaces) that the wrap loop is forced to keep whole.
  for (let i = 0; i < lines.length; i++) {
    const isLast = i === lines.length - 1;
    const overflows = ctx.measureText(lines[i]).width > maxWidth;
    if (!overflows && !(isLast && truncated)) continue;
    let s = lines[i];
    while (s && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
    lines[i] = s ? `${s}…` : "…";
  }
  return lines;
}

/** Ensure the web fonts (weights we draw with) are loaded before painting. */
async function ensureFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const faces = [
    "400 64px 'Lilita One'",
    "800 56px 'Baloo 2'",
    "700 26px 'Space Grotesk'",
    "500 22px 'Space Grotesk'",
  ];
  try {
    await Promise.all(faces.map((f) => document.fonts.load(f)));
    await document.fonts.ready;
  } catch {
    /* fall back to system fonts if loading fails */
  }
}

/** Render the share image and return the canvas (caller turns it into a blob). */
export async function renderVerdictImage(
  session: DebateSession,
): Promise<HTMLCanvasElement> {
  await ensureFonts();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.textBaseline = "alphabetic";

  const v = session.verdict;

  // ---- Card geometry (CSS px; the bitmap is scaled up at the very end). ----
  const cx = 48;
  const cy = 44;
  const cw = W - 96;
  const padX = cx + 48;
  const innerW = cw - 96;
  const panelPad = 22;
  const panelTextW = innerW - panelPad * 2;

  // ---- MEASURE PASS ---------------------------------------------------------
  // Wrap every text block up-front (at scale 1) so the canvas can be sized to
  // fit the FULL winning argument + reasoning — the substance the big verdict
  // card shows. Block ORDER mirrors the on-screen card (owner feedback):
  // topic first, then the Pro/Against fighters, then winner + reasoning.
  ctx.font = `700 26px ${FONT_BODY}`;
  const topicLines = wrapLines(ctx, session.topic, innerW, 2);

  ctx.font = `800 52px ${FONT_HEADING}`;
  const winLines = wrapLines(ctx, winnerLine(session), innerW, 2);

  // ** bold markers stripped everywhere — canvas draws single-style runs.
  ctx.font = `700 22px ${FONT_BODY}`;
  const argLines = v?.winnerArgument
    ? wrapLines(ctx, v.winnerArgument.replace(/\*\*/g, ""), innerW, 5)
    : [];

  // Smaller body size + a higher line cap so a longer reasoning (Turkish runs
  // ~15-20% longer than English) fits in full instead of being clipped.
  ctx.font = `500 20px ${FONT_BODY}`;
  const reasonLines = v?.summary
    ? wrapLines(ctx, v.summary.replace(/\*\*/g, ""), panelTextW, 11)
    : [];

  // ---- VERTICAL LAYOUT: walk top-down, recording each block's top edge so the
  //      draw pass paints at the same coordinates and the card grows to fit. ----
  const winLH = 54;
  const argLH = 30;
  const reasonLH = 26;
  const topicLH = 34;
  const scoreBoxH = 96;

  let y = cy + 36;

  const headerTop = y;
  y += 56 + 30; // VERDICT pill row + gap

  let topicTop = 0;
  if (topicLines.length) {
    topicTop = y;
    y += topicLines.length * topicLH + 8;
  }

  y += 10;
  const scoreTop = y;
  y += scoreBoxH;

  y += 28;
  const winTop = y;
  y += winLines.length * winLH + 6;

  let argTop = 0;
  if (argLines.length) {
    y += 12;
    argTop = y;
    y += 24 /* label */ + argLines.length * argLH + 4;
  }

  let panelTop = 0;
  let panelH = 0;
  if (reasonLines.length) {
    y += 16;
    panelTop = y;
    panelH = 18 + 20 /* label */ + 12 + reasonLines.length * reasonLH + 18;
    y += panelH;
  }

  y += 32;
  const footerBaseline = y;
  y += 20;

  // ---- Final card + canvas height derived from the accumulated content. ----
  const ch = Math.max(MIN_H - cy - 30, y - cy);
  const H = cy + ch + 30; // room for the offset shadow + bottom margin

  // ---- SIZE + SCALE (resetting the context) then DRAW. ----------------------
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = "alphabetic";

  // Background + dotted arcade grid.
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.dot;
  for (let yy = 24; yy < H; yy += 28) {
    for (let xx = 24; xx < W; xx += 28) {
      ctx.beginPath();
      ctx.arc(xx, yy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Card with chunky offset shadow + thick border.
  ctx.fillStyle = C.ink;
  roundRect(ctx, cx + 12, cy + 14, cw, ch, 28);
  ctx.fill();
  ctx.fillStyle = C.card;
  roundRect(ctx, cx, cy, cw, ch, 28);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = C.ink;
  roundRect(ctx, cx, cy, cw, ch, 28);
  ctx.stroke();

  // Header: VERDICT pill (left) + DEBATOR wordmark (right).
  ctx.font = `400 36px ${FONT_DISPLAY}`;
  const pillLabel = "🏆 VERDICT";
  const pillW = ctx.measureText(pillLabel).width + 44;
  const pillH = 56;
  ctx.fillStyle = C.yellow;
  roundRect(ctx, padX, headerTop, pillW, pillH, 14);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = C.ink;
  roundRect(ctx, padX, headerTop, pillW, pillH, 14);
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.textAlign = "left";
  ctx.fillText(pillLabel, padX + 22, headerTop + 39);

  ctx.font = `400 32px ${FONT_DISPLAY}`;
  ctx.fillStyle = C.ink;
  ctx.textAlign = "right";
  ctx.fillText("DEBATOR", padX + innerW, headerTop + 28);
  ctx.font = `500 16px ${FONT_BODY}`;
  ctx.fillStyle = "rgba(5,5,5,0.55)";
  ctx.fillText("AI vs AI", padX + innerW, headerTop + 50);

  // Topic — right under the header, exactly like the on-screen card.
  if (topicLines.length) {
    ctx.textAlign = "left";
    ctx.font = `700 26px ${FONT_BODY}`;
    ctx.fillStyle = C.ink;
    topicLines.forEach((line, i) => ctx.fillText(line, padX, topicTop + 24 + i * topicLH));
  }

  // Winner headline (up to 2 lines).
  ctx.textAlign = "left";
  ctx.fillStyle = C.ink;
  ctx.font = `800 52px ${FONT_HEADING}`;
  winLines.forEach((line, i) => ctx.fillText(line, padX, winTop + 42 + i * winLH));

  // Winning argument — the full one-sentence punchline (up to 4 lines).
  if (argLines.length) {
    ctx.font = `700 14px ${FONT_BODY}`;
    ctx.fillStyle = "rgba(5,5,5,0.5)";
    ctx.fillText("💥 WINNING ARGUMENT", padX, argTop + 14);
    ctx.font = `700 22px ${FONT_BODY}`;
    ctx.fillStyle = C.ink;
    argLines.forEach((line, i) => ctx.fillText(line, padX, argTop + 46 + i * argLH));
  }

  // "Why this verdict" panel — label + the FULL reasoning, in a surface box
  // (mirrors the big verdict card; ** bold markers stripped — canvas has no runs).
  if (reasonLines.length) {
    ctx.fillStyle = "#f4f4ef";
    roundRect(ctx, padX, panelTop, innerW, panelH, 16);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ink;
    roundRect(ctx, padX, panelTop, innerW, panelH, 16);
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.font = `700 14px ${FONT_BODY}`;
    ctx.fillStyle = "rgba(5,5,5,0.5)";
    ctx.fillText("⚖️ WHY THIS VERDICT", padX + panelPad, panelTop + 32);
    ctx.font = `500 20px ${FONT_BODY}`;
    ctx.fillStyle = "rgba(5,5,5,0.82)";
    reasonLines.forEach((line, i) =>
      ctx.fillText(line, padX + panelPad, panelTop + 62 + i * reasonLH),
    );
  }

  // Fighter score boxes.
  const gap = 24;
  const boxW = (innerW - gap) / 2;
  const drawFighter = (
    x: number,
    accent: string,
    tag: string,
    name: string,
    score?: number,
  ) => {
    ctx.fillStyle = "#fafafa";
    roundRect(ctx, x, scoreTop, boxW, scoreBoxH, 16);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.ink;
    roundRect(ctx, x, scoreTop, boxW, scoreBoxH, 16);
    ctx.stroke();
    // accent bar
    ctx.fillStyle = accent;
    roundRect(ctx, x + 6, scoreTop + 6, 10, scoreBoxH - 12, 5);
    ctx.fill();
    ctx.textAlign = "left";
    ctx.font = `700 18px ${FONT_BODY}`;
    ctx.fillStyle = accent;
    ctx.fillText(tag, x + 30, scoreTop + 34);
    ctx.font = `800 26px ${FONT_HEADING}`;
    ctx.fillStyle = C.ink;
    const nameLines = wrapLines(ctx, name, boxW - (score !== undefined ? 120 : 50), 1);
    ctx.fillText(nameLines[0] ?? name, x + 30, scoreTop + 68);
    if (score !== undefined) {
      ctx.font = `400 44px ${FONT_DISPLAY}`;
      ctx.fillStyle = accent;
      ctx.textAlign = "right";
      ctx.fillText(String(score), x + boxW - 24, scoreTop + 64);
    }
  };
  // Side tags mirror the on-screen chips: Pro/Against in debate mode, A/B
  // otherwise (legacy discussion sessions).
  const debate = session.mode === "debate";
  drawFighter(
    padX,
    C.blue,
    debate ? "PRO" : "A",
    session.modelA.displayName,
    v?.scoreModelA,
  );
  drawFighter(
    padX + boxW + gap,
    C.red,
    debate ? "AGAINST" : "B",
    session.modelB.displayName,
    v?.scoreModelB,
  );

  // Footer strip: judge (left) + optional cost (right). The "N rounds · mode"
  // meta was dropped from the card (owner feedback) — the image matches.
  ctx.font = `500 20px ${FONT_BODY}`;
  ctx.fillStyle = "rgba(5,5,5,0.6)";
  ctx.textAlign = "left";
  if (v) {
    const judge = getModelById(v.judgeModelId)?.displayName ?? "Judge";
    ctx.fillText(`⚖️ Judge: ${judge}`, padX, footerBaseline);
  } else {
    ctx.fillText("No judge", padX, footerBaseline);
  }
  if (COST_UI_ENABLED) {
    ctx.textAlign = "right";
    ctx.fillText(formatCost(session.costSummary.totalCost), padX + innerW, footerBaseline);
  }

  return canvas;
}

/** Convenience: render straight to a PNG Blob. */
export async function renderVerdictBlob(session: DebateSession): Promise<Blob> {
  const canvas = await renderVerdictImage(session);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}
