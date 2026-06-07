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
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  MATCH_SUMMARY_COLUMNS,
  computeStats,
  type MatchSummary,
} from "@/lib/supabase/matches";
import { formatCost } from "@/lib/utils/format";

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

function winnerLabel(m: MatchSummary): string {
  if (m.winner === "modelA") return `${m.model_a} won`;
  if (m.winner === "modelB") return `${m.model_b} won`;
  if (m.winner === "tie") return "Draw";
  if (m.winner === "not_applicable") return "Discussion"; // judged, no winner concept
  return "No verdict"; // no judge ran
}

export default async function ProfilePage() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return <Notice title="Accounts aren't set up yet" body="Match history arrives soon — debates work without an account." />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <Notice
        title="Sign in to see your profile"
        body="Your saved matches, history and stats live here once you sign in."
        cta={
          <Link href="/login">
            <ArcadeButton variant="primary-green">Sign in</ArcadeButton>
          </Link>
        }
      />
    );
  }

  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_SUMMARY_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(500);
  // Distinguish a real load failure (e.g. the migration hasn't been run) from a
  // genuinely empty history, so a misconfigured setup isn't shown as "all good".
  if (error) {
    console.error("[profile] failed to load matches:", error.message);
    return (
      <Notice
        title="Couldn't load your history"
        body="We couldn't reach your saved matches right now. Please try again in a moment."
      />
    );
  }
  const matches = (data ?? []) as MatchSummary[];
  const stats = computeStats(matches);
  const recent = matches.slice(0, 40);
  const topWins = Object.entries(stats.winsByModel).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <GameShell>
      <div className="mb-5">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Your Arena</h1>
        <p className="mt-1 text-sm text-ink/60">{user.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Matches" value={String(stats.total)} accent />
        <Stat label="Total spent" value={formatCost(stats.totalCost)} />
        <Stat label="Debates" value={String(stats.debates)} />
        <Stat label="Discussions" value={String(stats.discussions)} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Deep Debates" value={String(stats.deep)} />
        <Stat label="Most used" value={stats.topFighter ?? "—"} />
      </div>

      {topWins.length > 0 ? (
        <GamePanel title="🏆 Wins by fighter" className="mt-5">
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
            ? `📜 Recent matches (${recent.length} of ${stats.total})`
            : `📜 Match history (${stats.total})`
        }
        className="mt-5"
      >
        {recent.length === 0 ? (
          <div className="rounded-card border-3 border-dashed border-ink/40 bg-paper p-6 text-center text-sm text-ink/60">
            No matches yet. Run a debate and it&apos;ll show up here.
            <div className="mt-4 flex justify-center">
              <Link href="/setup">
                <ArcadeButton variant="primary-green">⚙️ Set up a match</ArcadeButton>
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
                    {m.model_a} vs {m.model_b} · {winnerLabel(m)} · {m.round_count} rounds ·{" "}
                    {formatCost(Number(m.total_cost))}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {m.deep_debate ? <Badge color="purple" size="sm">🌐 Deep</Badge> : null}
                  <Badge color="white" size="sm">{m.created_at.slice(0, 10)}</Badge>
                  <ReopenButton matchId={m.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
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
