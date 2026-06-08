/** Auth — login page + the header auth button. */
export const auth = {
  /** Login page (src/app/login/page.tsx). */
  login: {
    loading: "Loading…",
    linkError: "That sign-in link didn't work — please try again.",
    notSetUpTitle: "Sign-in isn't set up yet",
    notSetUpBody: "Accounts arrive soon. You can keep running debates without one.",
    title: "Sign in",
    subtitle:
      "Save your matches, history and stats. Optional — debates work without an account.",
    sentTitle: "📬 Check your inbox",
    sentBefore: "We sent a magic sign-in link to ",
    sentAfter: ".",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    sending: "Sending…",
    magicLinkCta: "✉️ Email me a magic link",
    or: "or",
    redirecting: "Redirecting…",
    googleCta: "🔵 Continue with Google",
  },
  /** Header auth button + account menu (src/components/game/AuthButton.tsx). */
  button: {
    signIn: "Sign in",
    accountFallback: "Account",
    accountAriaLabel: (email: string) => `Account: ${email}`,
    profile: "👤 Profile",
    signOut: "⏏ Sign out",
  },
};
