/** App shell — header nav + the "How to play" help modal. */
export const shell = {
  homeAria: "Debator — home",
  skipToContent: "Skip to content",
  primaryNav: "Primary",
  techReport: "Tech Report",
  techReportAria: "Technical report",
  help: {
    open: "How to play",
    title: "How to Play",
    rulesBadge: "Arena Rules",
    steps: [
      { emoji: "📝", title: "Drop a topic", body: "Any question, claim, or idea you want stress-tested." },
      { emoji: "🔍", title: "Go deep (optional)", body: "Flip on Deep Debate to let eligible fighters research with live web sources." },
      { emoji: "🤖", title: "Choose two fighters", body: "Select Model A and Model B like arcade characters." },
      { emoji: "🎚️", title: "Set the rules", body: "3, 5 or 7 rounds, a tone, and an optional judge." },
      { emoji: "🏆", title: "Watch & judge", body: "The arena runs the rounds and reveals a final verdict." },
    ],
    note: "The arena controls the rounds — the models only speak when it's their turn. No endless back-and-forth.",
    gotIt: "Got it",
  },
  controls: {
    soundMute: "Mute sound",
    soundEnable: "Enable sound",
    musicOff: "Turn music off",
    musicOn: "Turn music on",
    motionReduce: "Reduce motion",
    motionAllow: "Allow motion",
  },
};
