/**
 * Dynamic Open Graph image for share links (the unfurl preview). Renders the
 * verdict as a 1200x630 PNG from the URL-encoded payload — no DB, no auth.
 * Edge runtime via next/og (Satori): inline styles only, no emoji.
 *
 * On-brand fonts (Lilita One display + Baloo 2 headings) are fetched at render
 * time via the Google Fonts `&text=` subset trick (returns a TTF Satori can
 * use). If the fetch fails the image still renders with the bundled default
 * font — a font hiccup must never break the preview. Every text block is
 * line-clamped + flex-shrink:0 and the card is overflow-hidden, so a long
 * verdict can never overlap or spill past the frame.
 */

import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";

import { decodeSharePayload, type SharePayload } from "@/lib/share/shareLink";
import { verifySharePayload, shareSigningEnabled } from "@/lib/share/signing";

export const runtime = "edge";

const C = {
  paper: "#f7f7f2",
  ink: "#050505",
  card: "#ffffff",
  blue: "#3B82F6",
  red: "#FF4D4D",
  yellow: "#FFD91A",
  sub: "#5b5b55",
};

const DISPLAY = "Lilita One";
const HEADING = "Baloo 2";

/** Satori line-clamp: hard-cap a text block to N lines with ellipsis. */
function clampLines(n: number): CSSProperties {
  return {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: n,
    overflow: "hidden",
    flexShrink: 0,
  } as CSSProperties;
}

/**
 * Fetch a Google font as TTF bytes for the exact glyphs in `text` (the `&text=`
 * subset makes Google return `format('truetype')`, which Satori supports —
 * unlike the default woff2). Returns null on any failure.
 */
async function loadFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      family,
    )}:wght@${weight}&text=${encodeURIComponent(text)}`;
    // A legacy UA makes Google serve TTF (Satori can't use woff2), and a hard
    // timeout means a slow/degraded Google Fonts can never hang the unfurl —
    // an abort falls through to the default-font fallback below.
    const css = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1)" },
      signal: AbortSignal.timeout(1500),
    }).then((r) => (r.ok ? r.text() : ""));
    const src = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:opentype|truetype)'\)/);
    if (!src) return null;
    const res = await fetch(src[1], { signal: AbortSignal.timeout(1500) });
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const d = searchParams.get("d");
  const p: SharePayload | null = d ? decodeSharePayload(d) : null;

  // Verdict-signature check (critical #2). Dormant until SHARE_SECRET is set.
  const signingOn = shareSigningEnabled();
  const verified = p && signingOn ? await verifySharePayload(p) : false;
  const unverified = Boolean(p && signingOn && !verified);

  // PRE-TRUNCATE by length — Satori does not reliably honor WebkitLineClamp, so
  // single-line blocks (names, topic) must be capped by char count or they wrap
  // and push the bottom rows out of the fixed frame.
  const hasScores = p?.sa !== undefined && p?.sb !== undefined;
  const a = (p?.a ?? "Model A").slice(0, 24);
  const b = (p?.b ?? "Model B").slice(0, 24);
  const topic = p?.t ? p.t.slice(0, 78) : "";
  const wa = p?.wa ? p.wa.slice(0, 110) : "";
  const reasoning = p?.s ? p.s.slice(0, 150) : "";
  const headline = !p
    ? "Make AIs fight your ideas"
    : p.w === "modelA"
      ? `${a} takes it`
      : p.w === "modelB"
        ? `${b} takes it`
        : p.w === "tie"
          ? "It's a draw"
          : `${a} vs ${b}`;

  // All glyphs we'll draw — passed to the font subsetter for full coverage.
  const glyphs = [
    "VERDICT UNVERIFIED DEBATOR Topic: AI vs",
    headline,
    wa,
    reasoning,
    topic,
    a,
    b,
    hasScores ? `${p!.sa} ${p!.sb}` : "",
  ].join(" ");

  // Baloo at BOTH 400 (reasoning/topic) and 700 (headings) so body text isn't
  // forced bold; Lilita One (single weight) for the display elements.
  const [lilita, baloo700, baloo400] = await Promise.all([
    loadFont(DISPLAY, 400, glyphs),
    loadFont(HEADING, 700, glyphs),
    loadFont(HEADING, 400, glyphs),
  ]);
  const fonts = [
    lilita && { name: DISPLAY, data: lilita, weight: 400 as const, style: "normal" as const },
    baloo700 && { name: HEADING, data: baloo700, weight: 700 as const, style: "normal" as const },
    baloo400 && { name: HEADING, data: baloo400, weight: 400 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[];

  const displayFamily = lilita ? `${DISPLAY}, sans-serif` : "sans-serif";
  const headingFamily = baloo700 || baloo400 ? `${HEADING}, sans-serif` : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          padding: "28px",
          background: C.paper,
          fontFamily: headingFamily,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            background: C.card,
            border: `8px solid ${C.ink}`,
            borderRadius: "28px",
            padding: "34px",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                background: unverified ? C.red : C.yellow,
                border: `5px solid ${C.ink}`,
                borderRadius: "14px",
                padding: "4px 22px",
                fontSize: "34px",
                fontFamily: displayFamily,
                color: unverified ? "#ffffff" : C.ink,
              }}
            >
              {unverified ? "UNVERIFIED" : "VERDICT"}
            </div>
            <div style={{ display: "flex", fontSize: "32px", fontFamily: displayFamily, color: C.ink }}>
              DEBATOR
            </div>
          </div>

          {/* Winner headline */}
          <div
            style={{
              marginTop: "22px",
              fontSize: "50px",
              fontFamily: displayFamily,
              color: C.ink,
              lineHeight: 1.05,
              ...clampLines(2),
            }}
          >
            {headline}
          </div>

          {/* Winning argument */}
          {wa ? (
            <div style={{ marginTop: "14px", fontSize: "25px", fontWeight: 700, color: C.ink, lineHeight: 1.25, ...clampLines(2) }}>
              {wa}
            </div>
          ) : null}

          {/* Reasoning */}
          {reasoning ? (
            <div style={{ marginTop: "12px", fontSize: "23px", color: C.sub, lineHeight: 1.3, ...clampLines(3) }}>
              {reasoning}
            </div>
          ) : null}

          <div style={{ display: "flex", flex: 1, minHeight: "16px" }} />

          {/* Fighters + scores */}
          <div style={{ display: "flex", gap: "20px", flexShrink: 0 }}>
            <Fighter color={C.blue} tag="A" name={a} score={hasScores ? p!.sa : undefined} displayFamily={displayFamily} />
            <Fighter color={C.red} tag="B" name={b} score={hasScores ? p!.sb : undefined} displayFamily={displayFamily} />
          </div>

          {/* Topic — single string child (clampLines uses -webkit-box, which
              Satori rejects on a multi-child div). Pre-truncated to one line. */}
          {topic ? (
            <div style={{ marginTop: "16px", fontSize: "22px", color: C.sub, ...clampLines(1) }}>
              {`Topic: ${topic}`}
            </div>
          ) : null}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fonts.length ? fonts : undefined,
      // Each `d` is a stable, unique verdict, so the image can be cached hard —
      // amortizing the font fetches across repeat crawls.
      headers: { "cache-control": "public, max-age=86400, s-maxage=86400, immutable" },
    },
  );
}

function Fighter({
  color,
  tag,
  name,
  score,
  displayFamily,
}: {
  color: string;
  tag: string;
  name: string;
  score?: number;
  displayFamily: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        justifyContent: "space-between",
        background: "#fafafa",
        border: `4px solid ${C.ink}`,
        borderLeft: `12px solid ${color}`,
        borderRadius: "16px",
        padding: "16px 20px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", fontSize: "18px", fontWeight: 700, color }}>{tag}</div>
        <div style={{ fontSize: "26px", fontWeight: 700, color: C.ink, ...clampLines(1) }}>{name}</div>
      </div>
      {score !== undefined ? (
        <div style={{ display: "flex", fontSize: "46px", fontFamily: displayFamily, color, flexShrink: 0 }}>
          {score}
        </div>
      ) : null}
    </div>
  );
}
