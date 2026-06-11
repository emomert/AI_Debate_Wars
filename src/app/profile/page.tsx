/**
 * Profile (docs/19 Phase 3) — the signed-in user's match history + headline
 * stats. Server component: reads the user + their matches via the cookie-backed
 * Supabase client (RLS returns only their rows). Degrades to a friendly notice
 * when auth is off or signed out.
 */

import Link from "next/link";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { Badge } from "@/components/game/Badge";
import { ReopenButton } from "@/components/profile/ReopenButton";
import { DeleteMatchButton } from "@/components/profile/DeleteMatchButton";
import { DeleteAllButton } from "@/components/profile/DeleteAllButton";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { UnpublishButton } from "@/components/profile/UnpublishButton";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  MATCH_SUMMARY_COLUMNS,
  computeStats,
  type MatchSummary,
} from "@/lib/supabase/matches";
import {
  SHARED_MATCH_SUMMARY_COLUMNS,
  type SharedMatchSummary,
} from "@/lib/community/types";
import { formatCost } from "@/lib/utils/format";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

function Notice({ title, body, cta }: { title: string; body: string; cta?: React.ReactNode }) {
  return (
    <GameShell>
      <GamePanel className="mx-auto max-w-md text-center">
        <p className="font-heading text-xl font-extrabold">{title}</p>
        <p className="mt-2 text-sm text-ink/60">{body}</p>
        {cta ? <div className="mt-5 flex justify-center">{cta}</div> : null}
      </GamePanel>
    </GameShell>
  );
}

function winnerLabel(m: MatchSummary, d: Dictionary): string {
  if (m.winner === "modelA") return d.profile.winner.won(m.model_a);
  if (m.winner === "modelB") return d.profile.winner.won(m.model_b);
  if (m.winner === "tie") return d.profile.winner.draw;
  if (m.winner === "not_applicable") return d.profile.winner.discussion; // judged, no winner concept
  return d.profile.winner.noVerdict; // no judge ran
}

export default async function ProfilePage() {
  const d = await getServerDictionary();
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return <Notice title={d.profile.notices.noAccountsTitle} body={d.profile.notices.noAccountsBody} />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <Notice
        title={d.profile.notices.signedOutTitle}
        body={d.profile.notices.signedOutBody}
        cta={
          <Link href="/login">
            <ArcadeButton variant="primary-green">{d.profile.notices.signIn}</ArcadeButton>
          </Link>
        }
      />
    );
  }

  const [{ data, error }, sharedRes] = await Promise.all([
    supabase
      .from("matches")
      .select(MATCH_SUMMARY_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("shared_matches")
      .select(SHARED_MATCH_SUMMARY_COLUMNS)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  // Distinguish a real load failure (e.g. the migration hasn't been run) from a
  // genuinely empty history, so a misconfigured setup isn't shown as "all good".
  if (error) {
    console.error("[profile] failed to load matches:", error.message);
    return (
      <Notice
        title={d.profile.notices.loadErrorTitle}
        body={d.profile.notices.loadErrorBody}
      />
    );
  }
  const matches = (data ?? []) as MatchSummary[];
  // Shared-matches load failure shouldn't take the whole profile down — the
  // section degrades to its empty state (and the error is logged).
  if (sharedRes.error) {
    console.error("[profile] failed to load shared matches:", sharedRes.error.message);
  }
  const shared = (sharedRes.data ?? []) as SharedMatchSummary[];
  const stats = computeStats(matches);
  const recent = matches.slice(0, 40);
  const topWins = Object.entries(stats.winsByModel).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <GameShell>
      <div className="mb-5">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{d.profile.heading}</h1>
        <p className="mt-1 text-sm text-ink/60">{user.email}</p>
      </div>

      {/* Stats — only completed matches are ever saved, so `total` is the
          completed count. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={d.profile.stats.completed} value={String(stats.total)} accent />
        <Stat label={d.profile.stats.totalSpent} value={formatCost(stats.totalCost)} />
        <Stat label={d.profile.stats.roundsFought} value={String(stats.totalRounds)} />
        <Stat label={d.profile.stats.fightersTried} value={String(stats.uniqueFighters)} />
      </div>
      <div className="mt-2">
        <Stat label={d.profile.stats.mostUsedFighter} value={stats.topFighter ?? "—"} />
      </div>

      {/* Public identity: handle + avatar shown across the community. */}
      <ProfileEditor userId={user.id} />

      {/* Shared matches: posts published to the community hub. */}
      <GamePanel title={d.community.myShared.title(shared.length)} className="mt-5">
        {shared.length === 0 ? (
          <p className="text-sm text-ink/55">{d.community.myShared.empty}</p>
        ) : (
          <ul className="space-y-2">
            {shared.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-card border-3 border-ink bg-surface p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-extrabold">{p.topic}</p>
                  <p className="mt-0.5 truncate text-xs text-ink/55">
                    {p.show_models && p.model_a && p.model_b
                      ? d.community.feed.vs(p.model_a, p.model_b)
                      : d.community.feed.mysteryVs}
                    {" · "}
                    {d.community.myShared.votes(p.vote_count)}
                    {" · "}
                    {d.community.myShared.comments(p.comment_count)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge color={p.visibility === "public" ? "green" : "ink"} size="sm">
                    {p.visibility === "public"
                      ? d.community.myShared.publicBadge
                      : d.community.myShared.unlistedBadge}
                  </Badge>
                  <Badge color="white" size="sm">{p.created_at.slice(0, 10)}</Badge>
                  <Link href={`/m/${p.id}`}>
                    <ArcadeButton size="sm" variant="neutral-white">
                      {d.community.myShared.view}
                    </ArcadeButton>
                  </Link>
                  <UnpublishButton postId={p.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </GamePanel>

      {topWins.length > 0 ? (
        <GamePanel title={d.profile.winsByFighter} className="mt-5">
          <ul className="flex flex-wrap gap-2">
            {topWins.map(([name, wins]) => (
              <li key={name}>
                <Badge color="purple">{name} · {wins}</Badge>
              </li>
            ))}
          </ul>
        </GamePanel>
      ) : null}

      {/* History */}
      <GamePanel
        title={
          stats.total > recent.length
            ? d.profile.history.recentTitle(recent.length, stats.total)
            : d.profile.history.historyTitle(stats.total)
        }
        className="mt-5"
      >
        {recent.length === 0 ? (
          <div className="rounded-card border-3 border-dashed border-ink/40 bg-paper p-6 text-center text-sm text-ink/60">
            {d.profile.history.empty}
            <div className="mt-4 flex justify-center">
              <Link href="/setup">
                <ArcadeButton variant="primary-green">{d.profile.history.setUpMatch}</ArcadeButton>
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {recent.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-2 rounded-card border-3 border-ink bg-surface p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-extrabold">{m.topic}</p>
                  <p className="mt-0.5 truncate text-xs text-ink/55">
                    {d.profile.history.subLine(
                      d.profile.history.vs(m.model_a, m.model_b),
                      winnerLabel(m, d),
                      m.round_count,
                      formatCost(Number(m.total_cost)),
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {m.deep_debate ? <Badge color="purple" size="sm">{d.profile.history.deepBadge}</Badge> : null}
                  <Badge color="white" size="sm">{m.created_at.slice(0, 10)}</Badge>
                  <ReopenButton matchId={m.id} />
                  <DeleteMatchButton matchId={m.id} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {recent.length > 0 ? (
          <div className="mt-3 flex justify-end border-t-3 border-dashed border-ink/15 pt-3">
            <DeleteAllButton userId={user.id} total={stats.total} />
          </div>
        ) : null}
      </GamePanel>
    </GameShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={
        "rounded-card border-3 border-ink p-3 text-center " +
        (accent ? "bg-arcade-green text-night" : "bg-surface")
      }
    >
      <p className={"text-[10px] font-bold uppercase tracking-wide " + (accent ? "text-night/60" : "text-ink/50")}>
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-base font-bold" title={value}>
        {value}
      </p>
    </div>
  );
}
