/**
 * Community Arena (docs/20) — the public feed of shared matches. Server
 * component: reads public posts via the cookie-backed Supabase client (RLS
 * exposes only visibility='public' rows here). Readable signed-out; voting and
 * commenting happen on the match page and require an account.
 */

import Link from "next/link";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { Badge } from "@/components/game/Badge";
import { FloatingBadge } from "@/components/game/FloatingBadge";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  SHARED_MATCH_SUMMARY_COLUMNS,
  type SharedMatchFeedRow,
} from "@/lib/community/types";
import { VOTING_ENABLED } from "@/lib/community/config";
import { getServerDictionary } from "@/lib/i18n/server";
import { formatRelativeDate } from "@/lib/utils/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SearchParams = Promise<{ sort?: string; page?: string }>;

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <GameShell>
      <GamePanel className="mx-auto max-w-md text-center">
        <p className="font-heading text-xl font-extrabold">{title}</p>
        <p className="mt-2 text-sm text-ink/60">{body}</p>
      </GamePanel>
    </GameShell>
  );
}

function FeedCard({ post, d }: { post: SharedMatchFeedRow; d: Dictionary }) {
  const t = d.community.feed;
  const author = post.author?.username ?? d.community.anonymous;
  const avatar = post.author?.avatar ?? "🥊";
  const vsLine = post.show_models && post.model_a && post.model_b
    ? t.vs(post.model_a, post.model_b)
    : t.mysteryVs;

  return (
    <li>
      <Link
        href={`/m/${post.id}`}
        className="block rounded-card border-3 border-ink bg-card p-4 shadow-hard-sm transition hover:shadow-hard focus-visible:outline-3 focus-visible:outline-offset-2 motion-safe:hover:-translate-y-0.5"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {post.include_verdict ? (
            <Badge color="purple" size="sm">{t.verdictBadge}</Badge>
          ) : (
            <Badge color="green" size="sm">{t.crowdBadge}</Badge>
          )}
          {!post.show_models ? <Badge color="yellow" size="sm">{t.mysteryBadge}</Badge> : null}
          {post.deep_debate ? <Badge color="blue" size="sm">{t.deepBadge}</Badge> : null}
          <Badge color="white" size="sm">{t.rounds(post.round_count)}</Badge>
        </div>

        <p className="mt-2 line-clamp-2 font-heading text-lg font-extrabold leading-snug">
          {post.topic}
        </p>
        <p className="mt-1 line-clamp-1 text-sm font-semibold text-ink/65">{vsLine}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/55">
          {VOTING_ENABLED ? (
            <span className="font-mono font-bold">{t.votes(post.vote_count)}</span>
          ) : null}
          <span className="font-mono font-bold">{t.comments(post.comment_count)}</span>
          <span className="ml-auto inline-flex items-center gap-1">
            <span aria-hidden>{avatar}</span>
            <span>{t.by(author)}</span>
            <span aria-hidden className="text-ink/30">·</span>
            <time dateTime={post.created_at}>{formatRelativeDate(post.created_at)}</time>
          </span>
        </div>
      </Link>
    </li>
  );
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const d = await getServerDictionary();
  const t = d.community.feed;
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return <Notice title={t.notConfiguredTitle} body={t.notConfiguredBody} />;
  }

  const params = await searchParams;
  // With voting hidden, "top" (most-voted) is meaningless — force recent.
  const sort: "recent" | "top" =
    VOTING_ENABLED && params.sort === "top" ? "top" : "recent";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("shared_matches")
    .select(`${SHARED_MATCH_SUMMARY_COLUMNS}, author:profiles(username, avatar)`)
    .eq("visibility", "public");
  query =
    sort === "top"
      ? query.order("vote_count", { ascending: false }).order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false });
  // Fetch one extra row to know whether an older page exists.
  const { data, error } = await query.range(offset, offset + PAGE_SIZE);

  if (error) {
    console.error("[community] failed to load feed:", error.message);
    return <Notice title={t.loadErrorTitle} body={t.loadErrorBody} />;
  }

  const rows = (data ?? []) as unknown as SharedMatchFeedRow[];
  const posts = rows.slice(0, PAGE_SIZE);
  const hasOlder = rows.length > PAGE_SIZE;

  const tabHref = (s: "recent" | "top") => (s === "recent" ? "/community" : "/community?sort=top");
  const pageHref = (p: number) =>
    `/community?${new URLSearchParams({
      ...(sort === "top" ? { sort: "top" } : {}),
      ...(p > 1 ? { page: String(p) } : {}),
    }).toString()}`.replace(/\?$/, "");

  return (
    <GameShell>
      <div className="mb-5 text-center">
        <div className="mb-3 flex justify-center">
          <FloatingBadge color="yellow" rotate={-3}>
            {d.community.nav}
          </FloatingBadge>
        </div>
        <h1 className="font-display text-4xl tracking-tight sm:text-6xl">{t.heading}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink/60">{t.blurb}</p>
      </div>

      {/* Sort tabs — only meaningful while voting is on ("Top" = most voted). */}
      {VOTING_ENABLED ? (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          {(["recent", "top"] as const).map((s) => (
            <Link
              key={s}
              href={tabHref(s)}
              aria-current={sort === s ? "page" : undefined}
              className={
                "rounded-btn border-3 border-ink px-3 py-1.5 font-heading text-sm font-extrabold transition " +
                (sort === s
                  ? "bg-arcade-yellow text-night shadow-hard-sm"
                  : "bg-card text-ink hover:bg-surface")
              }
            >
              {s === "recent" ? t.tabs.recent : t.tabs.top}
            </Link>
          ))}
        </div>
      ) : null}

      {posts.length === 0 ? (
        <GamePanel className="text-center">
          <p className="text-sm text-ink/60">{t.empty}</p>
          <div className="mt-4 flex justify-center">
            <Link href="/setup">
              <ArcadeButton variant="primary-green">{t.shareYours}</ArcadeButton>
            </Link>
          </div>
        </GamePanel>
      ) : (
        <>
          <ul className="space-y-3">
            {posts.map((post) => (
              <FeedCard key={post.id} post={post} d={d} />
            ))}
          </ul>

          {/* Pagination */}
          {page > 1 || hasOlder ? (
            <div className="mt-5 flex items-center justify-center gap-2">
              {page > 1 ? (
                <Link href={pageHref(page - 1)}>
                  <ArcadeButton variant="neutral-white" size="sm">{t.newer}</ArcadeButton>
                </Link>
              ) : null}
              {hasOlder ? (
                <Link href={pageHref(page + 1)}>
                  <ArcadeButton variant="neutral-white" size="sm">{t.older}</ArcadeButton>
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </GameShell>
  );
}
