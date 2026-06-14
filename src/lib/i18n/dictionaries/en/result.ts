/** Result / verdict screen + share panel + share landing page. */
export const result = {
  // result/page.tsx — empty state + header + actions
  page: {
    empty: {
      loading: "Loading results…",
      title: "No finished match yet",
      body: "Run a debate first and your verdict and cost summary will show up here.",
      setup: "⚙️ Set up a match",
      home: "⌂ Home",
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
      home: "⌂ Home",
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

  // VerdictCard
  verdict: {
    badge: "🏆 VERDICT",
    judge: (name: string) => `⚖️ Judge: ${name}`,
    takesIt: (name: string) => `${name} takes it`,
    draw: "It's a draw",
    discussionComplete: "Discussion complete",
    winningArgument: "💥 Winning argument: ",
    whyThis: "⚖️ Why this verdict",
    strongest: (name: string) => `${name} strongest`,
    weakest: (name: string) => `${name} weakest`,
  },

  // FinalSummaryCard
  summary: {
    title: "📊 Match Summary",
    topic: "Topic",
    debate: "⚔️ Debate",
    discussion: "🧠 Discussion",
    tone: (tone: string) => `Tone: ${tone}`,
    messages: (count: number) => `${count} messages`,
    judged: "⚖️ Judged",
    noJudge: "No judge",
    totalCost: "Total cost",
    totalTokens: "Total tokens",
    inputTokens: "Input tokens",
    outputTokens: "Output tokens",
    judge: "⚖️ Judge",
    cheaperLessPre: (cheaper: string) => `${cheaper} cost `,
    cheaperLessPost: (pricier: string) => ` less than ${pricier}.`,
    estimatedPrefix: "Estimated · ",
    pricingNote: "Pricing is configurable in",
  },

  // RejudgePanel
  rejudge: {
    secondOpinionTitle: "⚖️ Want a second opinion?",
    addJudgeTitle: "⚖️ Add a judge after the fact",
    secondOpinionBody: "Hand the same transcript to a different judge for a fresh verdict.",
    addJudgeBody: "The match ran without a judge — pick one now to score the finished debate.",
    close: "▴ Close",
    changeJudge: "🔁 Change the judge",
    pickJudge: "⚖️ Pick a judge",
    newJudge: "New judge",
    fighterWarning: "⚠️ This judge fought in the match, so the verdict may be less neutral.",
    deliberating: "⚖️ The judge is deliberating…",
    runVerdict: "🏆 Run the new verdict",
    billingNote: "Runs one fresh judge turn — billed like any verdict. The previous verdict stays counted in the match cost.",
  },

  // SharePanel
  share: {
    title: "📣 Share the Match",
    blurb: "Share the verdict as an image — download it, copy it, or post it. Links carry a short recap to the arena.",
    previewAlt: "Verdict card preview",
    renderError: "Couldn't render the image here — you can still copy the recap or share a link below.",
    drawing: "🎨 Drawing your verdict card…",
    shareImage: "📤 Share image",
    download: "📥 Download",
    copied: "✅ Copied!",
    copyImage: "🖼️ Copy image",
    post: "Post",
    whatsapp: "WhatsApp",
    reddit: "Reddit",
    linkedin: "LinkedIn",
    linkCopied: "✅ Link copied",
    copyLink: "🔗 Copy link",
    copyRecap: "📋 Copy recap",
    tip: "Tip: on phones, “Share image” posts the picture straight to any app. On desktop, download or copy it, then attach it to your post.",
    // text/recap builders (SharePanel)
    beat: (winner: string, loser: string) => `${winner} beat ${loser}`,
    drawHeadline: (a: string, b: string) => `${a} vs ${b} ended in a draw`,
    versus: (a: string, b: string) => `${a} vs ${b}`,
    shareText: (headline: string, topic: string) => `${headline} debating “${topic}” on Debator 🏟️`,
    nativeTitle: "Debator verdict",
    recap: {
      header: (headline: string) => `🏟️ Debator — ${headline}`,
      topic: (topic: string) => `Topic: ${topic}`,
      mode: (mode: string, rounds: number) => `Mode: ${mode} · ${rounds} rounds`,
      fighters: (a: string, b: string) => `Fighters: ${a} (A) vs ${b} (B)`,
      verdict: (summary: string) => `Verdict: ${summary}`,
      noJudge: "No judge — ended after the final round.",
      winningArgument: (arg: string) => `Winning argument: ${arg}`,
      totalCost: (cost: string) => `Total cost: ${cost}`,
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
    winningArgument: "💥 Winning argument: ",
    topic: "Topic",
    missingTitle: "Debator",
    missingBody: "This share link is missing or invalid — but you can start your own match.",
    runOwn: "⚙️ Run your own debate",
    home: "⌂ Home",
  },
};
