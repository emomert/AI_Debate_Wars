/** Live debate arena (HUD, controls, timeline, cards, thinking/waiting lines, errors). */
export const debate = {
  // EmptyArena
  empty: {
    titleReady: "No match in the arena yet",
    titleLoading: "Loading the arena…",
    bodyReady: "Set up a topic and two fighters to start a debate.",
    bodyLoading: "Hang tight while we set the stage.",
    setUpMatch: "⚙️ Set up a match",
  },

  // Screen-reader announcements (DebateArena live region)
  announce: {
    researching: (name: string, round: number, total: number) =>
      `${name} is researching the web. Round ${round} of ${total}.`,
    thinking: (name: string, round: number, total: number) =>
      `${name} is thinking. Round ${round} of ${total}.`,
    responding: (name: string, round: number, total: number) =>
      `${name} is responding. Round ${round} of ${total}.`,
    fighterFallback: "A fighter",
    judging: "The judge is deliberating.",
    awaitingVerdict: "Rounds complete. Reveal the verdict when ready.",
    awaitingNext: "Ready for the next turn. Press the button to continue.",
    stopped: "Match stopped.",
    error: "A problem interrupted the match.",
    verdictReady: "Final verdict ready.",
    complete: "Debate complete.",
  },

  // The big "ROUND N" transition flash
  roundFlash: (n: number) => `ROUND ${n}`,

  // Topic bar
  topic: {
    nowDebating: "Now debating",
    tone: (value: string) => `Tone: ${value}`,
    customTone: "custom",
    deepDebate: "🌐 Deep Debate",
  },

  // Multi-battle tab bar (only shown when a match runs 2–3 battles at once)
  battles: {
    tab: (n: number) => `Battle ${n}`,
    tabAria: (n: number) => `View battle ${n}`,
    vs: "vs",
    allBattles: "All",
    finishedCount: (done: number, total: number) => `${done}/${total} done`,
  },

  // Panels under the timeline
  noJudge: "No judge this round — the debate ended after the final round.",
  stoppedPanel: {
    title: "Match stopped",
    body: "You pulled the fighters out of the arena. You can rematch or view what happened so far.",
  },
  awaiting: {
    verdictTitle: "🏆 The rounds are done",
    moveTitle: "🎮 Your move",
    verdictBody: "Reveal the judge's verdict when you're ready.",
    moveBody:
      "Reveal the next turn when you're ready — or flip to ⚡ Fast in the bar above to auto-play.",
    revealVerdict: "🏆 Reveal the Verdict",
    nextTurn: "▶ Next Turn",
  },
  errorPanel: {
    retryTurn: "↻ Retry turn",
    newSetup: "⚙️ New Setup",
  },

  // Error copy, keyed by AppErrorCode (replaces friendlyMessage on this screen)
  errors: {
    MISSING_API_KEY: {
      title: "The arena has no power source",
      body: "A server-side API key is missing or rejected. Fighters need OPENAI_API_KEY, DEEPSEEK_API_KEY, or OPENROUTER_API_KEY; Deep Debate also needs a valid BRAVE_SEARCH_API_KEY for web search.",
    },
    PROVIDER_TIMEOUT: {
      title: "The fighter froze mid-round",
      body: "The model took too long to respond. Try again or switch models.",
    },
    RATE_LIMITED: {
      title: "The arena is cooling down",
      body: "The provider is rate-limiting requests. Wait a moment and try again.",
    },
    INSUFFICIENT_CREDITS: {
      title: "This fighter is out of coins",
      body: "The provider account is out of credits for this model. Add credits, or pick an open-weight model in setup — they bill $0.",
    },
    INVALID_MODEL: {
      title: "That fighter isn't in the roster",
      body: "The selected model isn't available. Pick another model in setup.",
    },
    TOKEN_LIMIT_EXCEEDED: {
      title: "That turn hit the token ceiling",
      body: "Try a shorter max response length and run it again.",
    },
    INVALID_SESSION: {
      title: "Something about this match looks off",
      body: "The match data was rejected. Head back to setup and start a fresh match.",
    },
    INVALID_REQUEST: {
      title: "Something about this match looks off",
      body: "The match data was rejected. Head back to setup and start a fresh match.",
    },
    TOO_MANY_REQUESTS: {
      title: "Whoa — slow down, champ",
      body: "You're starting matches faster than the arena can run them. Wait a few seconds and try again.",
    },
    DAILY_LIMIT_REACHED: {
      title: "The arena hit today's limit",
      body: "Debator caps how much it can spend per day to keep the lights on. The limit's reached for now — come back tomorrow, or pick open-weight models (they bill $0 and don't count against it).",
    },
    CONTENT_BLOCKED: {
      title: "That topic can't enter the arena",
      body: "This topic tripped our safety filter, so the match can't start. Try rephrasing it or pick a different debate.",
    },
    PROVIDER_ERROR: {
      title: "The arena lights flickered",
      body: "The model didn't respond cleanly. Try again or switch models.",
    },
    // Community-route codes — never produced during a debate, but the map
    // covers every AppErrorCode so this screen can render any error.
    AUTH_REQUIRED: {
      title: "Sign in to enter the arena",
      body: "This move needs an account — sign in and try again.",
    },
    NOT_FOUND: {
      title: "That match left the arena",
      body: "This shared match doesn't exist anymore — it may have been unpublished.",
    },
    UNKNOWN_ERROR: {
      title: "The arena lights flickered",
      body: "The model didn't respond cleanly. Try again or switch models.",
    },
  },

  // DebateHUD phase labels + bits
  hud: {
    phase: {
      thinking: "Thinking…",
      streaming: "Speaking",
      judging: "Judge entering",
      awaiting: "Your move",
      done: "Complete",
      stopped: "Stopped",
      error: "Error",
    },
    paceLabel: (pace: "auto" | "manual") =>
      `Pacing: ${pace === "auto" ? "Fast" : "Normal"}. Click to switch.`,
    paceFast: "⚡ Fast",
    paceNormal: "🚶 Normal",
    totalCost: "Total cost so far",
    msgSuffix: "msg",
  },

  // Fighter voices (HUD toggle + per-message play button)
  voice: {
    hudOn: "🔊 Voice",
    hudOff: "🔇 Voice",
    toggleLabel: (on: boolean) =>
      `Fighter voices: ${on ? "on" : "off"}. Click to switch.`,
    play: "🔊 Play",
    stop: "⏹ Stop",
    costLabel: "Voice synthesis cost this match",
    skip: "⏭ Skip",
    skipLabel: "Skip — show the full answer now and stop the voice",
  },

  // DebateControls buttons
  controls: {
    stop: "Stop",
    revealVerdict: "🏆 Reveal the Verdict",
    nextTurn: "▶ Next Turn",
    stopMatch: "Stop Match",
    newSetup: "⚙️ New Setup",
    retryTurn: "Retry Turn",
    rematch: "🔁 Rematch",
    seeResults: "📊 See Results",
  },

  // DebateTimeline
  timeline: {
    warmingUpTitle: "The arena is warming up…",
    warmingUpBody: "The first fighter is about to step up.",
    judgeTitle: "Judge",
    judgeSubtitle: "Neutral arbiter",
    theJudge: "The Judge",
  },

  // DebateMessageCard badges/caption
  message: {
    pro: "PRO",
    against: "AGAINST",
    judge: "⚖️ Judge",
    writing: (line: string) => `✍️ ${line}…`,
  },

  // ThinkingBubble
  thinking: {
    deepSuffix: " (this can take a while)",
    line: (message: string) => `${message}…`,
  },

  // RoundCounter
  round: {
    counter: (current: number, total: number) => `ROUND ${current} / ${total}`,
    debate: "⚔️ Debate",
    discussion: "🧠 Discussion",
  },

  // AIModelCard status labels + displayed roles
  card: {
    status: {
      idle: "Ready",
      thinking: "Thinking…",
      speaking: "Speaking",
      finished: "Done",
      error: "Error",
    },
    pro: "PRO",
    against: "AGAINST",
  },
  // Displayed fighter roles (the English ones still flow to prompts via MODE_OPTIONS)
  roles: {
    debate: { a: "Pro side", b: "Against side" },
    discussion: { a: "Supportive Strategist", b: "Critical Evaluator" },
  },

  // CostBadge
  cost: {
    calculating: "calculating…",
    searchFee: "Includes web-search fee",
    cachedTitle: (amount: string) =>
      `Saved ${amount} — some input was served from the prompt cache`,
    est: "~est",
    input: "Input",
    cachedInput: "♻️ Cached input",
    output: "Output",
    inputCost: "Input cost",
    outputCost: "Output cost",
    webSearch: "🔎 Web search",
    latency: "Latency",
    total: "Total",
  },

  // SourcesList
  sources: {
    label: "Sources",
    attribution: "Results via Brave Search",
  },

  // CitationViewer
  citation: {
    sourceBadge: "📚 Source",
    close: "Close",
    openSource: "Open source ↗",
    ariaSource: (index: number) => `Source ${index}`,
  },

  // Rotating waiting / writing lines (consumed via useRotatingLine)
  fighterLines: [
    "{name} is cooking up a hot take",
    "{name} is sharpening its arguments",
    "{name} is rehearsing the mic drop",
    "{name} is loading spicy opinions",
    "{name} is cracking its knuckles",
    "{name} is summoning a counterargument",
    "{name} is buffering brilliance",
    "{name} is choosing violence (politely)",
    "{name} is drafting a devastating rebuttal",
    "{name} is overthinking this, honestly",
    "{name} is preparing to disagree confidently",
    "{name} is consulting the vibes",
    "{name} is pacing dramatically",
    "{name} is rummaging for a comeback",
    "{name} is warming up the debate muscles",
    "{name} is sharpening its rhetorical knives",
    "{name} is googling nothing — it just knows",
    "{name} is rehearsing in the mirror",
    "{name} is doing breathing exercises",
    "{name} is calculating the perfect zinger",
    "{name} is locating its inner lawyer",
    "{name} is brewing a strong argument",
    "{name} is connecting suspicious dots",
    "{name} is reading between your lines",
    "{name} is preparing receipts",
    "{name} is loading the big words",
    "{name} is steelmanning, then demolishing",
    "{name} is whispering to its training data",
    "{name} is rolling up its sleeves",
    "{name} is plotting a clean takedown",
    "{name} is consulting imaginary experts",
    "{name} is rehearsing a confident “actually…”",
    "{name} is stacking premises",
    "{name} is sniffing out a logical fallacy",
    "{name} is polishing a one-liner",
    "{name} is doing mental gymnastics (gold medal)",
    "{name} is assembling an airtight case",
    "{name} is summoning ancient wisdom",
    "{name} is preparing to win, obviously",
    "{name} is loading 200% confidence",
    "{name} is cross-referencing the universe",
    "{name} is gathering its thoughts (all of them)",
    "{name} is preparing a strategic pause",
    "{name} is warming up the sarcasm",
    "{name} is finding the weak spot",
    "{name} is building a rhetorical trap",
    "{name} is rehearsing the closing line first",
    "{name} is consulting the rulebook it ignores",
    "{name} is loading counterexamples",
    "{name} is quietly judging the other side",
    "{name} is calibrating the spice level",
    "{name} is summoning debate-club flashbacks",
    "{name} is preparing to be insufferably correct",
    "{name} is drawing a tiny mental diagram",
    "{name} is rehearsing dramatic emphasis",
    "{name} is collecting its strongest takes",
    "{name} is bracing for impact",
    "{name} is loading the “respectfully, no”",
    "{name} is searching its soul (and its weights)",
    "{name} is preparing a surgical rebuttal",
    "{name} is warming up the hot-takes oven",
    "{name} is lining up dominoes to knock down",
    "{name} is rehearsing its villain monologue",
    "{name} is consulting the court of vibes",
    "{name} is sketching the perfect analogy",
    "{name} is loading uncomfortable truths",
    "{name} is pre-gaming the rebuttal",
    "{name} is double-checking it's right (it is)",
    "{name} is preparing to gently obliterate",
    "{name} is gathering momentum",
    "{name} is finding the cleverest angle",
    "{name} is rehearsing the “let me explain”",
    "{name} is loading premium-grade logic",
    "{name} is putting on its thinking crown",
    "{name} is assembling a counterstrike",
    "{name} is queueing up the facts",
    "{name} is preparing to flip the script",
    "{name} is warming up for round-winning words",
    "{name} is doing the math on this argument",
    "{name} is sharpening the closing blow",
    "{name} is loading a confident smirk",
    "{name} is preparing to say “well, actually”",
    "{name} is marshalling the evidence",
    "{name} is rehearsing its strongest point twice",
    "{name} is getting dangerously articulate",
  ] as string[],

  researchLines: [
    "🔎 {name} is digging through the archives",
    "🔎 {name} is interrogating the internet",
    "🔎 {name} is fact-checking its gut feeling",
    "🔎 {name} is speed-reading the web",
    "🔎 {name} is chasing down citations",
    "🔎 {name} is raiding the library",
    "🔎 {name} is following the footnotes",
    "🔎 {name} is cross-examining sources",
    "🔎 {name} is hunting for receipts",
    "🔎 {name} is opening 47 browser tabs",
    "🔎 {name} is reading the fine print",
    "🔎 {name} is consulting the primary sources",
    "🔎 {name} is triangulating the facts",
    "🔎 {name} is separating signal from noise",
    "🔎 {name} is checking who said what",
    "🔎 {name} is pulling up the studies",
    "🔎 {name} is verifying before vibing",
    "🔎 {name} is sniffing out the real numbers",
    "🔎 {name} is cross-referencing the universe",
    "🔎 {name} is digging for the source behind the claim",
    "🔎 {name} is grilling the search results",
    "🔎 {name} is collecting receipts to cite",
    "🔎 {name} is weighing the evidence",
    "🔎 {name} is double-checking the date on that",
    "🔎 {name} is connecting suspicious dots",
    "🔎 {name} is building an evidence-backed case",
    "🔎 {name} is loading citations, not vibes",
    "🔎 {name} is doing actual homework",
    "🔎 {name} is hunting for a smoking gun",
    "🔎 {name} is reading past the headline",
  ] as string[],

  judgeLines: [
    "⚖️ The judge is weighing the evidence",
    "⚖️ The judge is polishing the gavel",
    "⚖️ The judge is re-reading the spicy bits",
    "⚖️ The judge is consulting the rulebook",
    "⚖️ The judge is tallying the points",
    "⚖️ The judge is deliberating dramatically",
    "⚖️ The judge is squinting at the transcript",
    "⚖️ The judge is doing the math",
  ] as string[],

  writingLines: [
    "{name} is typing furiously",
    "{name} is putting it into words",
    "{name} is on a roll",
    "{name} is wording things carefully",
    "{name} is making its case",
    "{name} is hammering the keys",
    "{name} is mid-monologue",
    "{name} is laying it all out",
  ] as string[],
};
