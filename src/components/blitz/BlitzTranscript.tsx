"use client";

/**
 * BlitzTranscript — the accessible + replay surface for the stage. An always-on
 * visually-hidden aria-live region announces each completed line so screen
 * readers follow the match (the stage shows one line at a time), plus a visible
 * toggle to read the full history as cards.
 */

import { useState } from "react";
import type { DebateMessage, DebateSession, DebateVerdict } from "@/lib/debate/debateTypes";

function speakerName(session: DebateSession, s: DebateMessage["speaker"]): string {
  if (s === "modelA") return session.modelA.displayName;
  if (s === "modelB") return session.modelB.displayName;
  return "Judge";
}

export function BlitzTranscript({
  session,
  messages,
  verdict,
}: {
  session: DebateSession;
  messages: DebateMessage[];
  verdict: DebateVerdict | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Screen-reader live region — always present, visually hidden. */}
      <div aria-live="polite" className="sr-only">
        {messages.map((m) => (
          <p key={m.id}>
            {speakerName(session, m.speaker)}
            {m.move ? ` (${m.move})` : ""}: {m.content}
          </p>
        ))}
        {verdict ? <p>Verdict: {verdict.summary}</p> : null}
      </div>

      {messages.length > 0 ? (
        <div className="mt-2 text-center">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="text-sm underline text-ink/70"
          >
            {open ? "Hide transcript" : "Show transcript"}
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="mt-2 space-y-2">
          {messages.map((m) => (
            <div key={m.id} className="rounded-card border-2 border-ink bg-card p-3">
              <span className="font-display text-sm text-ink">{speakerName(session, m.speaker)}</span>
              {m.move ? <span className="ml-2 text-xs text-ink/60">[{m.move}]</span> : null}
              <p className="text-ink">{m.content}</p>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
