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
      { emoji: "🎚️", title: "Set the rules", body: "Pick a tone and response length — every match runs 3 rounds with an AI judge." },
      { emoji: "🏆", title: "Watch & judge", body: "The arena runs the rounds and reveals a final verdict." },
    ],
    note: "The arena controls the rounds — the models only speak when it's their turn. No endless back-and-forth.",
    gotIt: "Got it",
  },
  controls: {
    audioMute: "Mute sound & music",
    audioEnable: "Turn sound & music on",
    motionReduce: "Reduce motion",
    motionAllow: "Allow motion",
  },
};
