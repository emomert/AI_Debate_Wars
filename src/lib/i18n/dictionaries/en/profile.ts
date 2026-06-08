/** Profile / match history page. */
export const profile = {
  notices: {
    noAccountsTitle: "Accounts aren't set up yet",
    noAccountsBody: "Match history arrives soon — debates work without an account.",
    signedOutTitle: "Sign in to see your profile",
    signedOutBody: "Your saved matches, history and stats live here once you sign in.",
    signIn: "Sign in",
    loadErrorTitle: "Couldn't load your history",
    loadErrorBody: "We couldn't reach your saved matches right now. Please try again in a moment.",
  },
  heading: "Your Arena",
  stats: {
    matches: "Matches",
    totalSpent: "Total spent",
    debates: "Debates",
    deepDebates: "Deep Debates",
    mostUsedFighter: "Most used fighter",
  },
  winsByFighter: "🏆 Wins by fighter",
  history: {
    recentTitle: (shown: number, total: number) => `📜 Recent matches (${shown} of ${total})`,
    historyTitle: (total: number) => `📜 Match history (${total})`,
    empty: "No matches yet. Run a debate and it'll show up here.",
    setUpMatch: "⚙️ Set up a match",
    deepBadge: "🌐 Deep",
    subLine: (vsLine: string, verdict: string, rounds: number, cost: string) =>
      `${vsLine} · ${verdict} · ${rounds} rounds · ${cost}`,
    vs: (a: string, b: string) => `${a} vs ${b}`,
  },
  winner: {
    won: (name: string) => `${name} won`,
    draw: "Draw",
    discussion: "Discussion",
    noVerdict: "No verdict",
  },
  reopen: {
    opening: "Opening…",
    view: "View",
  },
  del: {
    trigger: "Delete match",
    confirm: "Delete",
    cancel: "Cancel",
    deleting: "Deleting…",
    deleteAll: "🗑 Delete all history",
    deleteAllConfirm: (n: number) => `Delete all ${n} matches? This can't be undone.`,
    deleteAllAction: "Delete all",
    deletingAll: "Deleting…",
  },
};
