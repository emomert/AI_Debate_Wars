/**
 * Dynamic Open Graph image for share links (the unfurl preview). Renders the
 * verdict as a 1200x630 PNG from the URL-encoded payload — no DB, no auth.
 * Edge runtime via next/og (Satori): inline styles only, default font, no emoji.
 *
 * Every text block is line-clamped + flex-shrink:0 and the card is overflow
 * hidden, so a long verdict can never overlap or spill past the frame (the
 * client canvas renderer caps lines the same way).
 */

import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";

import { decodeSharePayload, shareHeadline, type SharePayload } from "@/lib/share/shareLink";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const d = searchParams.get("d");
  const p: SharePayload | null = d ? decodeSharePayload(d) : null;

  const headline = p ? shareHeadline(p) : "Make AIs fight your ideas";
  const hasScores = p?.sa !== undefined && p?.sb !== undefined;
  // Image-specific tighter caps (independent of the on-page clamps) so the
  // bottom row always stays inside the frame.
  const wa = p?.wa ? p.wa.slice(0, 130) : "";
  const reasoning = p?.s ? p.s.slice(0, 200) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          padding: "44px",
          background: C.paper,
          fontFamily: "sans-serif",
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
            padding: "40px",
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
                background: C.yellow,
                border: `5px solid ${C.ink}`,
                borderRadius: "14px",
                padding: "6px 20px",
                fontSize: "34px",
                fontWeight: 800,
                color: C.ink,
              }}
            >
              VERDICT
            </div>
            <div style={{ display: "flex", fontSize: "30px", fontWeight: 800, color: C.ink }}>
              DEBATOR
            </div>
          </div>

          {/* Winner headline */}
          <div
            style={{
              marginTop: "26px",
              fontSize: "56px",
              fontWeight: 800,
              color: C.ink,
              lineHeight: 1.05,
              ...clampLines(2),
            }}
          >
            {headline}
          </div>

          {/* Winning argument */}
          {wa ? (
            <div style={{ marginTop: "14px", fontSize: "25px", color: C.ink, lineHeight: 1.25, ...clampLines(2) }}>
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
            <Fighter color={C.blue} tag="A" name={p?.a ?? "Model A"} score={hasScores ? p!.sa : undefined} />
            <Fighter color={C.red} tag="B" name={p?.b ?? "Model B"} score={hasScores ? p!.sb : undefined} />
          </div>

          {/* Topic — single string child (clampLines uses -webkit-box, which
              Satori rejects on a multi-child div). */}
          {p?.t ? (
            <div style={{ marginTop: "18px", fontSize: "22px", color: C.sub, ...clampLines(1) }}>
              {`Topic: ${p.t}`}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

function Fighter({
  color,
  tag,
  name,
  score,
}: {
  color: string;
  tag: string;
  name: string;
  score?: number;
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
        <div style={{ fontSize: "26px", fontWeight: 800, color: C.ink, ...clampLines(1) }}>{name}</div>
      </div>
      {score !== undefined ? (
        <div style={{ display: "flex", fontSize: "44px", fontWeight: 800, color, flexShrink: 0 }}>
          {score}
        </div>
      ) : null}
    </div>
  );
}
