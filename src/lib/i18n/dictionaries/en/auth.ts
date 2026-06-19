/** Auth — login page, welcome onboarding, password reset, header auth button. */
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
    modeSignIn: "Sign in",
    modeSignUp: "Create account",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••",
    passwordHint: "At least 6 characters.",
    signInCta: "🕹️ Sign in",
    signUpCta: "🕹️ Create account",
    signingIn: "Signing in…",
    creatingAccount: "Creating account…",
    forgotCta: "Forgot password?",
    needEmailForReset: "Enter your email above first, then tap “Forgot password?” again.",
    sentTitle: "📬 Check your inbox",
    sentBefore: "We sent a magic sign-in link to ",
    sentAfter: ".",
    confirmTitle: "📬 Confirm your email",
    confirmBefore: "We sent a confirmation link to ",
    confirmAfter: ". Click it to activate your account.",
    resetTitle: "📬 Password reset sent",
    resetBefore: "We sent a password-reset link to ",
    resetAfter: ".",
    sending: "Sending…",
    magicLinkCta: "✉️ Email me a magic link",
    or: "or",
    redirecting: "Redirecting…",
    googleCta: "Continue with Google",
    githubCta: "Continue with GitHub",
    // Signup consent + age gate (P0-7)
    consentBefore: "I'm 13 or older and I agree to the ",
    consentTerms: "Terms",
    consentAnd: " and ",
    consentPrivacy: "Privacy Policy",
    consentAfter: ".",
    consentNote:
      "By creating an account you confirm you're 13 or older and agree to our Terms and Privacy Policy.",
    dataNote:
      "Some fighters run on models hosted outside your country (including DeepSeek in China); see the Privacy Policy for how data is handled.",
  },
  /** First-sign-in onboarding (src/app/welcome/page.tsx). */
  welcome: {
    title: "🎉 Create your fighter card",
    subtitle:
      "Pick a handle and an avatar — that's how you'll appear on shared matches, votes and comments. You can change both any time on your profile.",
    skip: "Skip for now",
  },
  /** Set-new-password page (src/app/reset-password/page.tsx). */
  reset: {
    title: "Set a new password",
    subtitle: "Choose a new password for your account.",
    newLabel: "New password",
    confirmLabel: "Repeat new password",
    mismatch: "The passwords don't match.",
    tooShort: "The password must be at least 6 characters.",
    save: "💾 Save new password",
    saving: "Saving…",
    expiredTitle: "This reset link has expired",
    expiredBody: "Request a fresh password-reset link from the sign-in page.",
    goLogin: "Go to sign-in",
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
