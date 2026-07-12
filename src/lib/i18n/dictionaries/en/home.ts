/** Home / landing page. (Filled by the localization pass.) */
export const home = {
  /** Page <title> / <meta description> (server-rendered in layout). */
  meta: {
    title: "Debator — Make AIs Fight Your Ideas",
    description:
      "A gamified arcade where two AI models debate your topic under structured rounds, with an AI judge delivering the final verdict.",
  },

  hero: {
    badge: "🕹️ AI vs AI",
    titleLine1: "Make AIs Fight",
    titleLine2: "Your Ideas",
    // Hero paragraph rendered with a <strong> span in the middle.
    introBefore: "Debator is a browser arcade where ",
    introStrong: "two AI models argue your topic",
    introAfter:
      " in structured rounds. An AI judge scores the match and crowns the winner.",
  },

  cta: {
    useDebator: "🎮 Use Debator",
    seeDemo: "🎬 See a Demo",
  },

  /** The "See a Demo" full-screen replay (src/components/demo/DemoOverlay). */
  demo: {
    aria: "Debator demo — a real 30-second recorded match",
    watching: "🎬 Real match · recorded live",
    close: "Close the demo",
    skip: "Skip ⏭",
    replay: "↺ Replay",
    yourTurn: "Your turn.",
    yourTurnSub: "Set up your own match — any topic, any two AI fighters, verdict included.",
    cta: "Use Debator",
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
        body: "3 rounds, a tone, optional Deep Debate, and an AI judge.",
      },
      {
        title: "Watch the match",
        body: "The arena runs every round live — the judge delivers the verdict at the end.",
      },
    ],
  },

  examples: {
    heading: "What can you throw in the arena?",
    subtitle: "Anything debatable — questions, hot takes, even your own plans:",
  },
};
