/**
 * Public share page (/s?d=…). Stateless: the verdict is decoded from the URL,
 * so it works for anyone with no DB/auth. Its OG/Twitter meta point at /api/og
 * with the same payload, so pasting the link unfurls the verdict image.
 */

import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { Badge } from "@/components/game/Badge";
import {
  decodeSharePayload,
  isValidShareCode,
  shareHeadline,
  type SharePayload,
} from "@/lib/share/shareLink";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ d?: string }>;

async function originFromHeaders(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { d } = await searchParams;
  // Only reflect a strictly-valid code into meta tags / the OG image URL, so a
  // crafted ?d can never inject into the rendered <meta> or the image src.
  const code = d && isValidShareCode(d) ? d : "";
  const payload = code ? decodeSharePayload(code) : null;
  const origin = await originFromHeaders();
  const ogUrl = `${origin}/api/og${code ? `?d=${code}` : ""}`;

  const title = payload ? `${shareHeadline(payload)} · Debator` : "Debator — AI vs AI";
  const description =
    payload?.s ?? (payload ? `“${payload.t}” — settled in the arena.` : "Make AIs fight your ideas.");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${origin}/s${code ? `?d=${code}` : ""}`,
      type: "website",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogUrl] },
  };
}

export default async function SharePage({ searchParams }: { searchParams: SearchParams }) {
  const { d } = await searchParams;
  const p: SharePayload | null = d ? decodeSharePayload(d) : null;

  return (
    <GameShell>
      <div className="mx-auto max-w-2xl">
        {p ? (
          <GamePanel className="overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <Badge color="yellow">🏆 VERDICT</Badge>
              <Badge color="white">AI vs AI</Badge>
            </div>

            <h1 className="mt-4 font-heading text-2xl font-extrabold sm:text-3xl">
              {shareHeadline(p)}
            </h1>
            {p.wa ? (
              <p className="mt-1 text-sm text-ink/80 sm:text-base">
                <span className="font-bold">💥 Winning argument: </span>
                {p.wa}
              </p>
            ) : null}
            {p.s ? <p className="mt-3 text-sm text-ink/70">{p.s}</p> : null}

            {p.sa !== undefined && p.sb !== undefined ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-card border-3 border-ink bg-surface p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-arcade-blue">
                    A · {p.a}
                  </p>
                  <p className="mt-0.5 font-display text-2xl">{p.sa}</p>
                </div>
                <div className="rounded-card border-3 border-ink bg-surface p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-arcade-red">
                    B · {p.b}
                  </p>
                  <p className="mt-0.5 font-display text-2xl">{p.sb}</p>
                </div>
              </div>
            ) : null}

            <div className="mt-4 rounded-card border-3 border-dashed border-ink/40 bg-paper p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink/45">Topic</p>
              <p className="mt-0.5 font-semibold">{p.t}</p>
            </div>
          </GamePanel>
        ) : (
          <GamePanel className="text-center">
            <h1 className="font-display text-3xl tracking-tight">Debator</h1>
            <p className="mt-2 text-sm text-ink/60">
              This share link is missing or invalid — but you can start your own match.
            </p>
          </GamePanel>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/setup">
            <ArcadeButton variant="primary-green" size="lg">⚙️ Run your own debate</ArcadeButton>
          </Link>
          <Link href="/">
            <ArcadeButton variant="neutral-white" size="lg">⌂ Home</ArcadeButton>
          </Link>
        </div>
      </div>
    </GameShell>
  );
}
