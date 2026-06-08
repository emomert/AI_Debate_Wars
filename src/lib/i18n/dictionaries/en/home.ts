/** Home / landing page. (Filled by the localization pass.) */
export const home = {
  /** Page <title> / <meta description> (server-rendered in layout). */
  meta: {
    title: "Debator — Make AIs Fight Your Ideas",
    description:
      "A gamified arcade where two AI models debate or discuss your topic under structured rounds, visible costs and an optional judge.",
  },

  hero: {
    badge: "🕹️ AI vs AI",
    titleLine1: "Make AIs Fight",
    titleLine2: "Your Ideas",
    // Hero paragraph rendered with a <strong> span in the middle.
    introBefore: "Debator is a browser arcade where ",
    introStrong: "two AI models argue your topic",
    introAfter:
      " in structured rounds. An optional AI judge scores the match, and every token spent is counted live.",
    badges: {
      fighters: "⚔️ Two AI fighters",
      rounds: "3 / 5 / 7 rounds",
      judge: "⚖️ Optional judge",
      cost: "💰 Live cost tracking",
    },
  },

  cta: {
    useDebator: "🎮 Use Debator",
    trySample: "🎲 Try a Sample",
    // Explainer line with two <strong> spans.
    noteUseStrong: "Use Debator",
    noteMiddle: " sets up your own match · ",
    noteSampleStrong: "Try a Sample",
    noteAfter:
      " rolls a random demo match — new topic, fighters and rules every time.",
  },

  howItWorks: {
    heading: "How it works",
    steps: [
      {
        title: "Pick a topic & two fighters",
        body: "Any question, claim or idea — then choose two AI models like arcade characters.",
      },
      {
        title: "Set the rules",
        body: "3 / 5 / 7 rounds, a tone, optional Deep Debate, and an optional AI judge.",
      },
      {
        title: "Watch the match",
        body: "The arena runs every round live — costs on screen, verdict at the end.",
      },
    ],
  },

  examples: {
    heading: "What can you throw in the arena?",
    subtitle: "Anything debatable — questions, hot takes, even your own plans:",
  },
};
