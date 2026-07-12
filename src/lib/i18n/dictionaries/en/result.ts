/** Result / verdict screen + share panel + share landing page. */
export const result = {
  // result/page.tsx — empty state + header + actions
  page: {
    empty: {
      loading: "Loading results…",
      title: "No finished match yet",
      body: "Run a debate first and your verdict and cost summary will show up here.",
      setup: "⚙️ Set up a match",
      home: "🏠 Home",
    },
    matchComplete: "✅ Match Complete",
    heading: "The Dust Settles",
    stoppedEarly: "Match was stopped early",
    noJudge: {
      title: "No judge this round",
      ended: "The debate ended after the final round — but you can still bring in a judge below.",
      stopped: "The match was stopped before the final round, so there is nothing to judge yet.",
    },
    sources: {
      title: (count: number) => `📚 Sources used (${count})`,
      blurb: "Every live source the fighters cited across this Deep Debate, de-duplicated.",
      label: "All sources",
    },
    actions: {
      backToArena: "↩ Back to arena",
      newSetup: "⚙️ New Setup",
      rematch: "🔁 Rematch",
      home: "🏠 Home",
    },
  },

  // Multi-battle switcher (only shown when a match has 2–3 battles)
  battles: {
    tab: (n: number) => `Battle ${n}`,
    tabAria: (n: number) => `View battle ${n} results`,
    vs: "vs",
    overviewTitle: "🗂️ All battles",
    viewing: (n: number, total: number) => `Viewing battle ${n} of ${total}`,
    winnerA: "A wins",
    winnerB: "B wins",
    tie: "Draw",
    inProgress: "In progress",
  },

  // VerdictCard (the merged verdict + share card)
  verdict: {
    badge: "🏆 VERDICT",
    judge: (name: string) => `⚖️ Judge: ${name}`,
    takesIt: (name: string) => `${name} takes it`,
    draw: "It's a draw",
    discussionComplete: "Discussion complete",
    winningArgument: "💥 Winning argument: ",
    whyThis: "⚖️ Why this verdict",
    sideFor: "Pro",
    sideAgainst: "Against",
    sideA: "A",
    sideB: "B",
    changeJudge: "🔁 Change the judge",
  },

  // RejudgeSection (inside VerdictCard) + the standalone add-a-judge panel
  rejudge: {
    addJudgeTitle: "⚖️ Add a judge after the fact",
    secondOpinionBody: "Hand the same transcript to a different judge for a fresh verdict.",
    addJudgeBody: "The match ran without a judge — pick one now to score the finished debate.",
    close: "▴ Close",
    pickJudge: "⚖️ Pick a judge",
    newJudge: "New judge",
    fighterWarning: "⚠️ This judge fought in the match, so the verdict may be less neutral.",
    deliberating: "⚖️ The judge is deliberating…",
    runVerdict: "🏆 Run the new verdict",
    billingNote: "Runs one fresh judge turn — it costs the judge's coin price (minimum 1 coin). The previous verdict stays on record.",
  },

  // Share row inside the VerdictCard
  share: {
    copied: "✅ Copied!",
    copyImage: "🖼️ Copy image",
    post: "Share on X",
    instagram: "Share on Instagram (caption is copied first)",
    reddit: "Share on Reddit",
    linkCopied: "✅ Link copied!",
    shareMatch: "📄 Share match",
    sharing: "⏳ Creating link…",
    shareMatchTitle:
      "Creates an unlisted page with the full debate + verdict and copies its link",
    matchCopied: "✅ Match copied!",
    // text builders
    beat: (winner: string, loser: string) => `${winner} beat ${loser}`,
    drawHeadline: (a: string, b: string) => `${a} vs ${b} ended in a draw`,
    versus: (a: string, b: string) => `${a} vs ${b}`,
    shareText: (headline: string, topic: string) => `${headline} debating “${topic}” on Debator 🏟️`,
    // Full-match plain-text share (lib/share/matchText.ts)
    matchText: {
      header: (headline: string) => `🏟️ Debator — ${headline}`,
      topic: (topic: string) => `Topic: ${topic}`,
      sides: (a: string, b: string) => `Pro: ${a}  vs  Against: ${b}`,
      fighters: (a: string, b: string) => `Fighters: ${a} vs ${b}`,
      turnHeading: (name: string, roundLabel?: string) =>
        `— ${roundLabel ? `${roundLabel} · ` : ""}${name} —`,
      verdictHeading: (judgeName: string) =>
        judgeName ? `⚖️ VERDICT — Judge: ${judgeName}` : "⚖️ VERDICT",
      noJudge: "No judge — the match ended after the final round.",
      winnerLine: (name: string) => `Winner: ${name}`,
      drawLine: "Winner: Draw",
      scoreLine: (a: number, b: number) => `Score: ${a}–${b}`,
    },
  },

  // MatchSaver
  saver: {
    saved: "✓ Saved to your profile",
    signIn: "Sign in",
    signInNudge: "to save this match to your history.",
    saving: "Saving…",
    retry: "↻ Couldn't save — retry",
    save: "💾 Save to my history",
  },

  // src/app/s/page.tsx — public share landing
  sharePage: {
    metaTitleSuffix: " · Debator",
    metaTitleFallback: "Debator — AI vs AI",
    metaDescription: (topic: string) => `“${topic}” — settled in the arena.`,
    metaDescriptionFallback: "Make AIs fight your ideas.",
    verdictBadge: "🏆 VERDICT",
    aiVsAi: "AI vs AI",
    verified: "✓ Verified",
    unverifiedBadge: "⚠ Unverified",
    unverifiedNote:
      "This share couldn't be verified as a genuine Debator result — its scores or text may have been altered. Run your own match to see the real thing.",
    winningArgument: "💥 Winning argument: ",
    topic: "Topic",
    missingTitle: "Debator",
    missingBody: "This share link is missing or invalid — but you can start your own match.",
    runOwn: "⚙️ Run your own debate",
    home: "🏠 Home",
  },
};
