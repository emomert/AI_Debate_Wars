/**
 * Client-side verdict image generator (feedback: share the result as an image of
 * the verdict card). Drawn on a <canvas> — NOT a DOM screenshot — so it needs no
 * dependency and reliably uses the already-loaded web fonts (document.fonts),
 * avoiding the font-embedding flakiness of html-to-image. Browser-only.
 */

import type { DebateSession } from "@/lib/debate/debateTypes";
import { getModelById } from "@/lib/models/modelRegistry";
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
const H = 675;
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
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = "alphabetic";

  // Background + dotted arcade grid.
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.dot;
  for (let y = 24; y < H; y += 28) {
    for (let x = 24; x < W; x += 28) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Card with chunky offset shadow + thick border.
  const cx = 48;
  const cy = 44;
  const cw = W - 96;
  const ch = H - 92;
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

  const padX = cx + 48;
  const innerW = cw - 96;

  // Header: VERDICT pill (left) + DEBATOR wordmark (right).
  const pillY = cy + 40;
  ctx.font = `400 38px ${FONT_DISPLAY}`;
  const pillLabel = "🏆 VERDICT";
  const pillTextW = ctx.measureText(pillLabel).width;
  const pillW = pillTextW + 44;
  const pillH = 60;
  ctx.fillStyle = C.yellow;
  roundRect(ctx, padX, pillY, pillW, pillH, 14);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = C.ink;
  roundRect(ctx, padX, pillY, pillW, pillH, 14);
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.textAlign = "left";
  ctx.fillText(pillLabel, padX + 22, pillY + 42);

  ctx.font = `400 34px ${FONT_DISPLAY}`;
  ctx.fillStyle = C.ink;
  ctx.textAlign = "right";
  ctx.fillText("DEBATOR", padX + innerW, pillY + 40);
  ctx.font = `500 16px ${FONT_BODY}`;
  ctx.fillStyle = "rgba(5,5,5,0.55)";
  ctx.fillText("AI vs AI", padX + innerW, pillY + 60);

  // Winner headline (one line).
  ctx.textAlign = "left";
  ctx.fillStyle = C.ink;
  ctx.font = `800 50px ${FONT_HEADING}`;
  const winY = pillY + pillH + 70;
  ctx.fillText(wrapLines(ctx, winnerLine(session), innerW, 1)[0] ?? "", padX, winY);
  let cursorY = winY;

  const v = session.verdict;
  // The winning argument (one line).
  if (v?.winnerArgument) {
    cursorY += 34;
    ctx.font = `700 22px ${FONT_BODY}`;
    ctx.fillStyle = C.ink;
    ctx.fillText(wrapLines(ctx, `💥 ${v.winnerArgument}`, innerW, 1)[0] ?? "", padX, cursorY);
  }
  // Why the judge decided (2 lines; strip ** markdown — canvas has no bold run).
  if (v?.summary) {
    cursorY += 34;
    ctx.font = `500 22px ${FONT_BODY}`;
    ctx.fillStyle = "rgba(5,5,5,0.72)";
    const rLines = wrapLines(ctx, v.summary.replace(/\*\*/g, ""), innerW, 2);
    rLines.forEach((line, i) => ctx.fillText(line, padX, cursorY + i * 30));
    cursorY += (rLines.length - 1) * 30;
  }

  // Fighter score boxes.
  const boxY = cursorY + 36;
  const boxH = 96;
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
    roundRect(ctx, x, boxY, boxW, boxH, 16);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.ink;
    roundRect(ctx, x, boxY, boxW, boxH, 16);
    ctx.stroke();
    // accent bar
    ctx.fillStyle = accent;
    roundRect(ctx, x + 6, boxY + 6, 10, boxH - 12, 5);
    ctx.fill();
    ctx.textAlign = "left";
    ctx.font = `700 18px ${FONT_BODY}`;
    ctx.fillStyle = accent;
    ctx.fillText(tag, x + 30, boxY + 34);
    ctx.font = `800 26px ${FONT_HEADING}`;
    ctx.fillStyle = C.ink;
    const nameLines = wrapLines(ctx, name, boxW - (score !== undefined ? 120 : 50), 1);
    ctx.fillText(nameLines[0] ?? name, x + 30, boxY + 68);
    if (score !== undefined) {
      ctx.font = `400 44px ${FONT_DISPLAY}`;
      ctx.fillStyle = accent;
      ctx.textAlign = "right";
      ctx.fillText(String(score), x + boxW - 24, boxY + 64);
    }
  };
  drawFighter(padX, C.blue, "A", session.modelA.displayName, session.verdict?.scoreModelA);
  drawFighter(
    padX + boxW + gap,
    C.red,
    "B",
    session.modelB.displayName,
    session.verdict?.scoreModelB,
  );

  // Topic line.
  ctx.textAlign = "left";
  ctx.font = `700 14px ${FONT_BODY}`;
  ctx.fillStyle = "rgba(5,5,5,0.45)";
  const topicLabelY = boxY + boxH + 42;
  ctx.fillText("TOPIC", padX, topicLabelY);
  ctx.font = `500 24px ${FONT_BODY}`;
  ctx.fillStyle = C.ink;
  const topicLines = wrapLines(ctx, session.topic, innerW, 2);
  topicLines.forEach((line, i) => ctx.fillText(line, padX, topicLabelY + 32 + i * 32));

  // Footer strip: judge (left) + meta/cost (right).
  const footY = cy + ch - 30;
  ctx.font = `500 20px ${FONT_BODY}`;
  ctx.fillStyle = "rgba(5,5,5,0.6)";
  ctx.textAlign = "left";
  if (session.verdict) {
    const judge = getModelById(session.verdict.judgeModelId)?.displayName ?? "Judge";
    ctx.fillText(`⚖️ Judge: ${judge}`, padX, footY);
  } else {
    ctx.fillText("No judge", padX, footY);
  }
  ctx.textAlign = "right";
  const meta = `${session.roundCount} rounds · ${session.mode} · ${formatCost(session.costSummary.totalCost)}`;
  ctx.fillText(meta, padX + innerW, footY);

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
