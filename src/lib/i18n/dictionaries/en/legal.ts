/** Legal — footer links + Terms / Privacy / Contact page content. */
export const legal = {
  // Footer
  about: "About",
  terms: "Terms",
  privacy: "Privacy",
  contact: "Contact",
  disclaimer: "AI-generated content — may be inaccurate or biased. Not professional advice.",
  // Pages
  lastUpdated: "Last updated",
  backHome: "← Back to home",
  // Operator / data-controller identity, rendered on Terms + Privacy.
  identity: {
    operatedBy: "Operated by",
    governedBy: "Governed by the laws of",
    contact: "Contact",
  },
  contactPage: {
    title: "Contact",
    intro:
      "Questions, data requests (access, export, or deletion), or content reports? Reach the team at the address below.",
    reachUs: "Reach us at",
    operatedBy: "Debator is operated by",
  },
  aboutPage: {
    title: "About Debator",
    intro:
      "Debator is an arcade-style arena where two AI models debate your topic under structured rounds, with visible costs and an optional judge.",
    sections: [
      { heading: "Arcade interface, serious intelligence", body: "The look is a playful browser mini-game; the output stays thoughtful and structured. The app — never the models — controls who speaks, which round it is, when it ends, and whether a judge appears." },
      { heading: "How a match works", body: "Pick a topic and two fighters, choose the rounds and tone, and optionally bring in a judge. Each turn is generated one at a time under a strict prompt, so debates never loop forever. Deep Debate adds live web research with cited sources." },
      { heading: "Models & cost", body: "Fighters come from OpenAI, DeepSeek, and open-weight models served via OpenRouter. Every turn shows its tokens and estimated cost, and the running total is always on screen." },
    ],
  },
  termsPage: {
    title: "Terms of Service",
    intro:
      'By using Debator ("the app"), you agree to these terms. If you don\'t agree, please don\'t use it.',
    sections: [
      { heading: "1. What Debator is", body: "Debator is an entertainment and educational tool that orchestrates structured debates between third-party AI models. It is provided as-is, for your personal use." },
      { heading: "2. AI-generated content", body: "All debate turns and verdicts are produced by third-party AI models. They may be inaccurate, biased, offensive, or fabricated, and do not represent our views. Nothing here is professional, legal, medical, financial, or other expert advice — verify anything important independently." },
      { heading: "3. Acceptable use", body: "Don't use Debator to break the law, generate harmful or abusive content, overload or attack the service, reverse-engineer it, or resell access. We may rate-limit, suspend, or block usage to protect the service." },
      { heading: "4. Your content", body: "You're responsible for the topics you enter. Topics are sent to third-party AI providers (and, in Deep Debate, a web-search provider) to generate responses — don't enter anything confidential or personal you wouldn't share with them." },
      { heading: "5. Availability & limits", body: "The service may change, pause, or stop at any time, and usage is capped to control costs. We don't guarantee uptime, accuracy, or that any feature will keep working." },
      { heading: "6. No warranty & liability", body: 'Debator is provided "as is" with no warranties. To the maximum extent permitted by law, we are not liable for any damages arising from your use of the app or reliance on AI output.' },
      { heading: "7. Governing law", body: "These terms are governed by the laws of the jurisdiction named below, without regard to conflict-of-law rules." },
      { heading: "8. Changes", body: "We may update these terms; continued use after a change means you accept it." },
      { heading: "9. Contact", body: "Questions about these terms? Reach out at the contact address shown below." },
    ],
  },
  privacyPage: {
    title: "Privacy Policy",
    intro:
      "This policy explains what Debator collects and how it's used. We aim to collect as little as possible.",
    sections: [
      { heading: "1. What we collect", body: "If you sign in: your email address and your saved match history (topics, chosen models, verdicts, and usage/cost metadata). If you don't sign in, debates run without an account and aren't saved to a profile." },
      { heading: "2. Topics & sub-processors", body: "The topics you submit are sent to the AI providers that generate the debate — OpenAI, DeepSeek, and OpenRouter — and, for Deep Debate, the Brave web-search API. If you have an account, your email and saved matches are stored with our database and hosting providers, Supabase and Vercel. Each of these providers processes that data under its own privacy policy, and some are located outside your country (for example, DeepSeek in China)." },
      { heading: "3. Cookies", body: "We use only the cookies needed to run the app: a sign-in (authentication) cookie when you log in, and a small cookie that remembers your language choice. Signing in with Google, or our auth provider (Supabase), may also set their own cookies as part of the sign-in flow. We don't use advertising or cross-site tracking cookies." },
      { heading: "4. Usage data", body: "We log per-request usage and cost metadata (tokens, cost, timing, and a coarse IP-based counter) to operate the service, prevent abuse, and enforce spending limits." },
      { heading: "5. Retention & deletion", body: "Saved matches stay until you delete them. From your profile you can delete individual matches, export all your data as JSON, and permanently delete your account and everything tied to it. You can also reach us at the contact address shown below." },
      { heading: "6. Your rights", body: "You can request access to, export of, or deletion of your data. Depending on where you live, you may have additional rights under laws such as GDPR or KVKK; contact us at the address below to exercise them." },
      { heading: "7. Changes & contact", body: "We may update this policy; material changes will be noted here. Questions? Reach out at the contact address shown below." },
    ],
  },
};
