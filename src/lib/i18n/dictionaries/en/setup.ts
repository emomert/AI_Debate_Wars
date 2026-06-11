/** Setup screen + all selectors + their option labels. */
export const setup = {
  // Page heading + section panel titles
  heading: "Set Up Your Match",
  subheading: "Choose your fighters and set the rules. The arena handles the rest.",
  sections: {
    topic: "1 · Topic",
    deepDebate: "2 · Deep Debate",
    fighters: "3 · Choose Your Fighters",
    rules: "4 · Match Rules",
    judge: "5 · Judge",
  },
  swapFighters: "Swap fighters A and B",
  fighterA: "Fighter A",
  fighterB: "Fighter B",
  backToHome: "← Back to home",

  // Match Rules sub-section labels + lock badges
  rules: {
    rounds: "Rounds",
    tone: "Tone",
    maxLength: "Max response length",
    pacing: "Pacing",
    voice: "Fighter voices",
    recommended: "Recommended",
    lockRounds: "🔒 3 in Deep Debate",
    lockStandard: "🔒 Standard",
    lockAuto: "🔒 Auto",
    deepLengthNote:
      "Deep Debate uses a structured, longer format — length is set for you, and turns take longer.",
  },

  // Start CTA (mobile + summary card)
  start: "Start the Match",

  // TopicInput
  topic: {
    label: "🎤 Your Topic",
    placeholder: "e.g. Should universities ban AI tools?",
    quickExamples: "Quick examples",
    // AI topic checker
    check: "✨ Improve my topic",
    checking: "Checking…",
    checkError: "Couldn't reach the topic helper — please try again.",
    verdictStrong: "Strong topic",
    verdictWeak: "Could be sharper",
    verdictUnclear: "Needs more focus",
    suggestionsLabel: "Try one of these instead:",
    useSuggestionAria: (s: string) => `Use this topic: ${s}`,
    dismiss: "Dismiss",
  },

  // RoundSelector option labels/blurbs, keyed by round count
  rounds: {
    3: { label: "Quick Match", blurb: "Fast & punchy" },
    5: { label: "Ranked Match", blurb: "More back-and-forth" },
    7: { label: "Championship", blurb: "Full tournament" },
  } as Record<number, { label: string; blurb: string }>,

  // ToneSelector option labels (keyed by id) + custom input
  tones: {
    serious: { label: "Serious" },
    aggressive: { label: "Aggressive" },
    casual: { label: "Casual" },
    custom: { label: "Custom" },
    // Hidden easter-egg tone (5 rapid clicks on Aggressive).
    unhinged: { label: "Unhinged" },
  } as Record<string, { label: string }>,
  // VoiceToggle option labels/blurbs (synced with the arena HUD 🔊 chip)
  voice: {
    off: { label: "Off", blurb: "Read the turns yourself" },
    on: { label: "Voice on", blurb: "Turns are read aloud — switch any time in the arena" },
  },

  toneCustom: {
    describe: "Describe the tone (applies to both fighters)",
    placeholder: "e.g. witty courtroom lawyer, calm professor, sports commentator…",
    fallbackLabel: "Custom",
    perFighter: "Give each fighter a different tone",
    fighterTone: (name: string) => `${name}'s tone`,
    perFighterShort: "Custom (per fighter)",
  },

  // ResponseLengthSelector option labels/blurbs (keyed by id)
  lengths: {
    short: { label: "Short", blurb: "100–160 words" },
    medium: { label: "Medium", blurb: "180–300 words" },
    long: { label: "Long", blurb: "350–600 words" },
  } as Record<string, { label: string; blurb: string }>,

  // PaceSelector option labels/blurbs (keyed by id)
  paces: {
    manual: { label: "Normal", blurb: "Click to reveal each turn" },
    auto: { label: "Fast", blurb: "Auto-plays every turn" },
  } as Record<string, { label: string; blurb: string }>,

  // DeepDebateToggle
  deep: {
    title: "🌐 Deep Debate — real web research",
    subtitle: "Fighters search the live web, quote and cite their sources.",
    enable: "Enable Deep Debate",
    benefitSearch: "✅ Live web search every turn",
    benefitCited: "✅ Quoted & cited sources (in a collapsible list)",
    benefitSlower: "⏱ Longer turns — about 30–90s each",
    benefitFixed: "🔒 Fixed format: 3 rounds · standard tone · auto length",
    benefitFees: "💰 Search fees (if any) show up on each turn's cost badge.",
    needsKey: "⚠️ Server needs a web-search key for these fighters",
  },

  // JudgeSelector
  judge: {
    enableTitle: "⚖️ Bring in a judge?",
    enableSubtitle: "A judge delivers a final verdict once all rounds finish.",
    enable: "Enable judge mode",
    typeLabel: "Judge type",
    disabledNote: "No judge selected. The debate will end after the final round.",
    lessNeutral: "Less neutral",
    warnParticipated:
      "⚠️ This judge participated in the debate, so the verdict may be less neutral.",
    warnThirdFighting:
      "⚠️ This judge is also fighting in the match, so the verdict may be less neutral.",
    judgeModelLabel: "Judge model",
    // Auto Judge — surface which neutral model will score the match (#10)
    autoPickPrefix: "Judge:",
    autoNeutralNote: "Chosen automatically — always a neutral model that isn't one of your two fighters.",
    autoResolving: "A neutral model is chosen automatically when the match starts.",
    // Blind judging reassurance (#12)
    blindTitle: "🙈 Blind judging",
    blindNote:
      "The judge never sees which model wrote which side — it scores the two debaters anonymously, and we reveal who was who only after the verdict.",
    // Judge mode option labels/blurbs (keyed by id)
    modes: {
      auto: { label: "Auto Judge", blurb: "Neutral third model picks a winner" },
      thirdModel: { label: "Pick a Judge", blurb: "Choose a neutral third model" },
      modelA: { label: "Model A Judges", blurb: "Less neutral — A was in the fight" },
      modelB: { label: "Model B Judges", blurb: "Less neutral — B was in the fight" },
    } as Record<string, { label: string; blurb: string }>,
  },

  // ModelSelector
  models: {
    freeModels: "🌐 More brands",
    freeBrands: "More brands",
    ready: "ready",
    freeVia: "Served via OpenRouter · ",
    needsOpenRouterKey: "needs OPENROUTER_API_KEY",
    zeroCost: "$0 to run",
    picked: "Picked",
    pickedWith: (name: string) => `Picked: ${name}`,
    modelsCount: (n: number) => `${n} models`,
    debateFit: "Debate skill",
    debateFitHelp:
      "Our 0–100 rating of how well this model holds up in a structured debate — reasoning, rebuttals and staying on point. Higher = a tougher opponent.",
    showAll: (n: number) => `Show all ${n} models ▾`,
    showFewer: "Show fewer ▴",
    needsWebSearchKey: "Needs the server's web-search key for Deep Debate",
    alsoPicked: "Also picked for the other fighter",
    needsApiKey: "Needs an API key to run",
  },

  // SetupSummaryCard
  summary: {
    title: "🎮 Match Card",
    topic: "Topic",
    fighterA: "Fighter A",
    fighterB: "Fighter B",
    badgeDebate: "⚔️ Debate",
    badgeDiscussion: "🧠 Discussion",
    roundLine: (count: number, label: string) => `${count} · ${label}`,
    deepTemplate: "🔒 Deep template",
    deepDebate: "🌐 Deep Debate",
    fast: "⚡ Fast",
    normal: "🚶 Normal",
    judgeOn: "⚖️ Judge on",
    judgeOff: "No judge",
    start: "▶ Start the Match",
    footnote: "Live models · OpenRouter brands run on one shared key",
  },
};
