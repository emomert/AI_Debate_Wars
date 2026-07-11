/**
 * Shared match page (/m/<id>, docs/20) — the full published match: transcript,
 * optional AI verdict, crowd vote and comments. Server component; fetches via
 * the get_shared_match() RPC so UNLISTED posts work for anyone holding the
 * link while staying out of the public feed. Readable signed-out; voting and
 * commenting require an account (enforced server-side).
 */

import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { Badge } from "@/components/game/Badge";
import { SharedTranscript } from "@/components/community/SharedTranscript";
import { SharedVerdictCard } from "@/components/community/SharedVerdictCard";
import { VoteWidget } from "@/components/community/VoteWidget";
import { CommentsSection } from "@/components/community/CommentsSection";
import { VOTING_ENABLED } from "@/lib/community/config";
import { ReportButton } from "@/components/community/ReportButton";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatRelativeDate } from "@/lib/utils/format";
import type { SharedComment, SharedMatchRecord } from "@/lib/community/types";
import { encodeSharePayload, type SharePayload } from "@/lib/share/shareLink";
import { signSharePayload } from "@/lib/share/signing";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const POST_ID_PATTERN = /^[A-Za-z0-9_-]{8,24}$/;

async function fetchPost(id: string): Promise<SharedMatchRecord | null> {
  if (!POST_ID_PATTERN.test(id)) return null;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_shared_match", { p_id: id });
  if (error) {
    console.error("[m] get_shared_match failed:", error.message);
    return null;
  }
  const row = (Array.isArray(data) ? data[0] : data) as SharedMatchRecord | undefined;
  return row ?? null;
}

function fighterNames(post: SharedMatchRecord, d: Dictionary): { a: string; b: string } {
  return {
    a: post.snapshot.fighters.a.name ?? d.community.match.fighterA,
    b: post.snapshot.fighters.b.name ?? d.community.match.fighterB,
  };
}

const clamp = (s: string, n: number): string => {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

async function originFromHeaders(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const d = await getServerDictionary();
  const post = await fetchPost(id);
  if (!post) {
    return { title: d.community.match.notFoundTitle, robots: { index: false } };
  }

  const names = fighterNames(post, d);
  const verdict = post.snapshot.verdict;
  // Reuse the existing OG image renderer: a shared match unfurls exactly like
  // a stateless share link, built from the already-sanitized snapshot.
  const payload: SharePayload = {
    t: clamp(post.topic, 140),
    a: clamp(names.a, 40),
    b: clamp(names.b, 40),
    w: verdict?.winner,
    sa: verdict?.scoreModelA,
    sb: verdict?.scoreModelB,
    wa: verdict?.winnerArgument ? clamp(verdict.winnerArgument, 180) : undefined,
    s: verdict?.summary ? clamp(verdict.summary.replace(/\*\*/g, ""), 300) : undefined,
  };
  // A published match is a trusted, server-stored record, so the server signs its
  // share payload too (critical #2) — its unfurl is "verified", not flagged.
  const sig = await signSharePayload(payload);
  if (sig) payload.g = sig;
  const code = encodeSharePayload(payload);
  const origin = await originFromHeaders();
  const ogUrl = `${origin}/api/og?d=${code}`;
  const title = `${names.a} vs ${names.b} — ${clamp(post.topic, 80)}`;
  const description = payload.s ?? clamp(post.topic, 200);

  return {
    title,
    description,
    // Unlisted posts are link-only by design — keep crawlers out.
    robots: post.visibility === "unlisted" ? { index: false } : undefined,
    openGraph: {
      title,
      description,
      url: `${origin}/m/${post.id}`,
      type: "website",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogUrl] },
  };
}

export default async function SharedMatchPage({ params }: { params: Params }) {
  const { id } = await params;
  const d = await getServerDictionary();
  const t = d.community.match;
  const post = await fetchPost(id);

  if (!post) {
    return (
      <GameShell>
        <GamePanel className="mx-auto max-w-md text-center">
          <p className="font-heading text-xl font-extrabold">{t.notFoundTitle}</p>
          <p className="mt-2 text-sm text-ink/60">{t.notFoundBody}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/community">
              <ArcadeButton variant="neutral-white">{t.backToCommunity}</ArcadeButton>
            </Link>
            <Link href="/setup">
              <ArcadeButton variant="primary-green">{t.runYourOwn}</ArcadeButton>
            </Link>
          </div>
        </GamePanel>
      </GameShell>
    );
  }

  const supabase = await getSupabaseServerClient();
  const [commentsRes, authorRes] = await Promise.all([
    supabase!.rpc("get_shared_comments", { p_post_id: post.id }),
    supabase!.from("profiles").select("username, avatar").eq("user_id", post.owner_id).maybeSingle(),
  ]);
  const comments = (commentsRes.data ?? []) as SharedComment[];
  if (commentsRes.error) {
    console.error("[m] get_shared_comments failed:", commentsRes.error.message);
  }
  const author = authorRes.data ?? { username: null, avatar: null };

  const names = fighterNames(post, d);
  const snapshot = post.snapshot;

  return (
    <GameShell>
      {/* Header */}
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {post.include_verdict ? (
            <Badge color="purple" size="sm">{d.community.feed.verdictBadge}</Badge>
          ) : (
            <Badge color="green" size="sm">{d.community.feed.crowdBadge}</Badge>
          )}
          {!post.show_models ? (
            <Badge color="yellow" size="sm">{d.community.feed.mysteryBadge}</Badge>
          ) : null}
          {post.deep_debate ? <Badge color="blue" size="sm">{t.deepBadge}</Badge> : null}
          <Badge color="white" size="sm">{t.rounds(post.round_count)}</Badge>
          {post.visibility === "unlisted" ? (
            <Badge color="ink" size="sm">{d.community.myShared.unlistedBadge}</Badge>
          ) : null}
        </div>
        <h1 className="mt-3 font-display text-3xl tracking-tight sm:text-5xl">
          {post.topic}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-ink/55">
          <span className="font-heading font-extrabold text-ink/80">
            {names.a} <span className="text-ink/40">vs</span> {names.b}
          </span>
          <span aria-hidden className="text-ink/30">·</span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden>{author.avatar ?? "🥊"}</span>
            {t.sharedBy(author.username ?? d.community.anonymous)}
          </span>
          <span aria-hidden className="text-ink/30">·</span>
          <time dateTime={post.created_at}>{formatRelativeDate(post.created_at)}</time>
        </p>
      </div>

      <div className="space-y-5">
        {/* Transcript */}
        <GamePanel title={t.transcriptTitle} padding="md">
          <SharedTranscript snapshot={snapshot} />
        </GamePanel>

        {/* AI verdict (if the sharer included it) */}
        {snapshot.verdict ? (
          <SharedVerdictCard snapshot={snapshot} />
        ) : (
          <GamePanel className="text-center">
            <p className="font-heading text-lg font-extrabold">{t.noVerdictTitle}</p>
            <p className="mt-1 text-sm text-ink/60">{t.noVerdictBody}</p>
          </GamePanel>
        )}

        {/* Crowd vote — hidden while VOTING_ENABLED is off (owner decision). */}
        {VOTING_ENABLED ? (
          <VoteWidget
            postId={post.id}
            initialTally={{ a: post.vote_a, b: post.vote_b, tie: post.vote_tie, total: post.vote_count }}
            nameA={names.a}
            nameB={names.b}
            aiWinner={post.include_verdict ? (snapshot.verdict?.winner ?? null) : null}
          />
        ) : null}

        {/* Comments */}
        <CommentsSection
          postId={post.id}
          initialComments={comments}
          postOwnerId={post.owner_id}
        />
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link href="/community">
          <ArcadeButton variant="neutral-white">{t.backToCommunity}</ArcadeButton>
        </Link>
        <Link href="/setup">
          <ArcadeButton variant="primary-green">{t.runYourOwn}</ArcadeButton>
        </Link>
      </div>

      {/* Report this match for review (P0-8) */}
      <div className="mt-3 flex justify-center">
        <ReportButton postId={post.id} />
      </div>
    </GameShell>
  );
}
