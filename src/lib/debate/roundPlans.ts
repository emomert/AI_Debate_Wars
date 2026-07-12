/**
 * Deterministic round plans (docs/04_DEBATE_ENGINE.md).
 *
 * These tables ARE the debate structure. The app — never a model — decides what
 * each round is about and who speaks. Speaker order within a round is always
 * Model A then Model B. The same plans are used by the Phase 1 mock debate and,
 * later, by the real Phase 2 orchestrator.
 */

import type { Locale } from "@/lib/i18n/config";
import type {
  DebateMode,
  RoundCount,
  RoundPlanEntry,
} from "@/lib/debate/debateTypes";

const DEBATE_3: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Opening Arguments",
    modelATask: "Present the strongest case for the topic.",
    modelBTask: "Present the strongest case against the topic.",
  },
  {
    round: 2,
    label: "Rebuttals",
    // Opponent-relative wording: fighters are identity-blind (never told they
    // are "Model A/B"), so tasks must use the You/Opponent vocabulary their
    // transcript uses — the old "Model B's opening" was unmappable and made
    // some fighters answer from the WRONG side (owner-reported, deep debates).
    modelATask: "Directly respond to your opponent's opening.",
    modelBTask: "Directly respond to your opponent's opening.",
  },
  {
    round: 3,
    label: "Final Defense",
    modelATask: "Give final defense and address the strongest objection.",
    modelBTask: "Give final defense and address the strongest objection.",
  },
];

const DEBATE_5: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Opening Arguments",
    modelATask: "Present the strongest case for the topic.",
    modelBTask: "Present the strongest case against the topic.",
  },
  {
    round: 2,
    label: "Rebuttals",
    modelATask: "Challenge your opponent's core claim.",
    modelBTask: "Challenge your opponent's core claim.",
  },
  {
    round: 3,
    label: "Counter-Rebuttals",
    modelATask: "Defend your position against the rebuttal.",
    modelBTask: "Defend your position against the rebuttal.",
  },
  {
    round: 4,
    label: "Practical Examples",
    modelATask: "Use concrete examples or consequences to support your side.",
    modelBTask: "Use concrete examples or consequences to support your side.",
  },
  {
    round: 5,
    label: "Final Statements",
    modelATask: "Give final concise argument for why your side is stronger.",
    modelBTask: "Give final concise argument for why your side is stronger.",
  },
];

const DEBATE_7: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Opening Arguments",
    modelATask: "Present the strongest case for the topic.",
    modelBTask: "Present the strongest case against the topic.",
  },
  {
    round: 2,
    label: "Rebuttals",
    modelATask: "Challenge your opponent's core claim.",
    modelBTask: "Challenge your opponent's core claim.",
  },
  {
    round: 3,
    label: "Counter-Rebuttals",
    modelATask: "Defend your position against the rebuttal.",
    modelBTask: "Defend your position against the rebuttal.",
  },
  {
    round: 4,
    label: "Evidence & Examples",
    modelATask: "Provide examples, logic, or evidence.",
    modelBTask: "Provide examples, logic, or evidence.",
  },
  {
    round: 5,
    label: "Attack Strongest Point",
    modelATask: "Attack the strongest point made by the opponent.",
    modelBTask: "Attack the strongest point made by the opponent.",
  },
  {
    round: 6,
    label: "Defend Weakest Point",
    modelATask: "Acknowledge and defend your side's weakest point.",
    modelBTask: "Acknowledge and defend your side's weakest point.",
  },
  {
    round: 7,
    label: "Final Statements",
    modelATask: "Close with the strongest version of your argument.",
    modelBTask: "Close with the strongest version of your argument.",
  },
];

const DISCUSSION_3: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Build & Critique",
    modelATask: "Improve the idea and make it more practical.",
    modelBTask: "Identify major weaknesses, risks, and blind spots.",
  },
  {
    round: 2,
    label: "Solutions & Stress Test",
    modelATask: "Respond with solutions to the weaknesses.",
    modelBTask: "Stress-test those solutions.",
  },
  {
    round: 3,
    label: "Final Version & Risks",
    modelATask: "Present the improved final version.",
    modelBTask: "Present final risks and recommendations.",
  },
];

const DISCUSSION_5: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Initial Build",
    modelATask: "Improve and clarify the idea.",
    modelBTask: "Identify weaknesses and hidden assumptions.",
  },
  {
    round: 2,
    label: "Market / Context Fit",
    modelATask: "Explain why this could work in the target context.",
    modelBTask: "Challenge market fit and feasibility.",
  },
  {
    round: 3,
    label: "Execution Plan",
    modelATask: "Propose practical execution steps.",
    modelBTask: "Identify operational risks.",
  },
  {
    round: 4,
    label: "Refinement",
    modelATask: "Refine based on criticism.",
    modelBTask: "Stress-test the refined version.",
  },
  {
    round: 5,
    label: "Final Recommendation",
    modelATask: "Give the best version of the idea.",
    modelBTask: "Give final risks and must-fix issues.",
  },
];

const DISCUSSION_7: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Initial Build",
    modelATask: "Improve and clarify the idea.",
    modelBTask: "Identify weaknesses and hidden assumptions.",
  },
  {
    round: 2,
    label: "User / Audience",
    modelATask: "Define target users and value proposition.",
    modelBTask: "Challenge user need and willingness to pay.",
  },
  {
    round: 3,
    label: "Market / Context",
    modelATask: "Explain market opportunity.",
    modelBTask: "Challenge market size and competition.",
  },
  {
    round: 4,
    label: "Product / Execution",
    modelATask: "Propose MVP and execution plan.",
    modelBTask: "Identify technical and operational risks.",
  },
  {
    round: 5,
    label: "Business Model",
    modelATask: "Propose monetization and growth.",
    modelBTask: "Challenge economics and scalability.",
  },
  {
    round: 6,
    label: "Risk Response",
    modelATask: "Respond to major risks.",
    modelBTask: "Stress-test the responses.",
  },
  {
    round: 7,
    label: "Final Recommendation",
    modelATask: "Give the best version and next steps.",
    modelBTask: "Give final risks and decision recommendation.",
  },
];

// ── Turkish round plans ────────────────────────────────────────────────────
// Labels are shown in the UI (round badges) and tasks are injected into the
// prompt, so a Turkish debate gets Turkish instructions AND Turkish badges.

const DEBATE_3_TR: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Açılış Argümanları",
    modelATask: "Konu lehine en güçlü savı sun.",
    modelBTask: "Konu aleyhine en güçlü savı sun.",
  },
  {
    round: 2,
    label: "Çürütmeler",
    modelATask: "Rakibinin açılışına doğrudan yanıt ver.",
    modelBTask: "Rakibinin açılışına doğrudan yanıt ver.",
  },
  {
    round: 3,
    label: "Son Savunma",
    modelATask: "Son savunmanı yap ve en güçlü itirazı yanıtla.",
    modelBTask: "Son savunmanı yap ve en güçlü itirazı yanıtla.",
  },
];

const DEBATE_5_TR: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Açılış Argümanları",
    modelATask: "Konu lehine en güçlü savı sun.",
    modelBTask: "Konu aleyhine en güçlü savı sun.",
  },
  {
    round: 2,
    label: "Çürütmeler",
    modelATask: "Rakibinin temel iddiasına meydan oku.",
    modelBTask: "Rakibinin temel iddiasına meydan oku.",
  },
  {
    round: 3,
    label: "Karşı Çürütmeler",
    modelATask: "Konumunu çürütmeye karşı savun.",
    modelBTask: "Konumunu çürütmeye karşı savun.",
  },
  {
    round: 4,
    label: "Pratik Örnekler",
    modelATask: "Tarafını desteklemek için somut örnekler veya sonuçlar kullan.",
    modelBTask: "Tarafını desteklemek için somut örnekler veya sonuçlar kullan.",
  },
  {
    round: 5,
    label: "Son Sözler",
    modelATask: "Tarafının neden daha güçlü olduğuna dair son ve özlü savını sun.",
    modelBTask: "Tarafının neden daha güçlü olduğuna dair son ve özlü savını sun.",
  },
];

const DEBATE_7_TR: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Açılış Argümanları",
    modelATask: "Konu lehine en güçlü savı sun.",
    modelBTask: "Konu aleyhine en güçlü savı sun.",
  },
  {
    round: 2,
    label: "Çürütmeler",
    modelATask: "Rakibinin temel iddiasına meydan oku.",
    modelBTask: "Rakibinin temel iddiasına meydan oku.",
  },
  {
    round: 3,
    label: "Karşı Çürütmeler",
    modelATask: "Konumunu çürütmeye karşı savun.",
    modelBTask: "Konumunu çürütmeye karşı savun.",
  },
  {
    round: 4,
    label: "Kanıt ve Örnekler",
    modelATask: "Örnekler, mantık veya kanıt sun.",
    modelBTask: "Örnekler, mantık veya kanıt sun.",
  },
  {
    round: 5,
    label: "En Güçlü Noktaya Saldırı",
    modelATask: "Rakibin yaptığı en güçlü çıkışa saldır.",
    modelBTask: "Rakibin yaptığı en güçlü çıkışa saldır.",
  },
  {
    round: 6,
    label: "En Zayıf Noktayı Savun",
    modelATask: "Tarafının en zayıf noktasını kabul et ve savun.",
    modelBTask: "Tarafının en zayıf noktasını kabul et ve savun.",
  },
  {
    round: 7,
    label: "Son Sözler",
    modelATask: "Savını en güçlü haliyle kapat.",
    modelBTask: "Savını en güçlü haliyle kapat.",
  },
];

const DISCUSSION_3_TR: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Geliştir ve Eleştir",
    modelATask: "Fikri geliştir ve daha uygulanabilir hale getir.",
    modelBTask: "Önemli zayıflıkları, riskleri ve kör noktaları belirle.",
  },
  {
    round: 2,
    label: "Çözümler ve Stres Testi",
    modelATask: "Zayıflıklara çözümlerle yanıt ver.",
    modelBTask: "Bu çözümleri stres testine tabi tut.",
  },
  {
    round: 3,
    label: "Nihai Sürüm ve Riskler",
    modelATask: "Geliştirilmiş nihai sürümü sun.",
    modelBTask: "Son riskleri ve önerileri sun.",
  },
];

const DISCUSSION_5_TR: RoundPlanEntry[] = [
  {
    round: 1,
    label: "İlk Taslak",
    modelATask: "Fikri geliştir ve netleştir.",
    modelBTask: "Zayıflıkları ve gizli varsayımları belirle.",
  },
  {
    round: 2,
    label: "Pazar / Bağlam Uyumu",
    modelATask: "Bunun hedef bağlamda neden işe yarayabileceğini açıkla.",
    modelBTask: "Pazar uyumunu ve uygulanabilirliği sorgula.",
  },
  {
    round: 3,
    label: "Uygulama Planı",
    modelATask: "Pratik uygulama adımları öner.",
    modelBTask: "Operasyonel riskleri belirle.",
  },
  {
    round: 4,
    label: "İyileştirme",
    modelATask: "Eleştirilere göre iyileştir.",
    modelBTask: "İyileştirilmiş sürümü stres testine tabi tut.",
  },
  {
    round: 5,
    label: "Nihai Öneri",
    modelATask: "Fikrin en iyi sürümünü sun.",
    modelBTask: "Son riskleri ve mutlaka düzeltilmesi gereken sorunları sun.",
  },
];

const DISCUSSION_7_TR: RoundPlanEntry[] = [
  {
    round: 1,
    label: "İlk Taslak",
    modelATask: "Fikri geliştir ve netleştir.",
    modelBTask: "Zayıflıkları ve gizli varsayımları belirle.",
  },
  {
    round: 2,
    label: "Kullanıcı / Hedef Kitle",
    modelATask: "Hedef kullanıcıları ve değer önerisini tanımla.",
    modelBTask: "Kullanıcı ihtiyacını ve ödeme isteğini sorgula.",
  },
  {
    round: 3,
    label: "Pazar / Bağlam",
    modelATask: "Pazar fırsatını açıkla.",
    modelBTask: "Pazar büyüklüğünü ve rekabeti sorgula.",
  },
  {
    round: 4,
    label: "Ürün / Uygulama",
    modelATask: "MVP ve uygulama planı öner.",
    modelBTask: "Teknik ve operasyonel riskleri belirle.",
  },
  {
    round: 5,
    label: "İş Modeli",
    modelATask: "Gelir modeli ve büyüme öner.",
    modelBTask: "Ekonomiyi ve ölçeklenebilirliği sorgula.",
  },
  {
    round: 6,
    label: "Risk Yanıtı",
    modelATask: "Önemli risklere yanıt ver.",
    modelBTask: "Yanıtları stres testine tabi tut.",
  },
  {
    round: 7,
    label: "Nihai Öneri",
    modelATask: "En iyi sürümü ve sonraki adımları sun.",
    modelBTask: "Son riskleri ve karar önerisini sun.",
  },
];

// Blitz mode: a fixed 4-round plan, independent of the 3/5/7 round count. Turns
// are punchy (1–2 sentences) and the labels drive the stage's round title cards.
const BLITZ_4: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Opening Shot",
    modelATask: "In one or two punchy sentences, hit your strongest point FOR the topic.",
    modelBTask: "In one or two punchy sentences, hit your strongest point AGAINST the topic.",
  },
  {
    round: 2,
    label: "Cross-Fire",
    modelATask: "Attack the single weakest part of the opponent's last line. Stay sharp and short.",
    modelBTask: "Attack the single weakest part of the opponent's last line. Stay sharp and short.",
  },
  {
    round: 3,
    label: "Counter-Fire",
    modelATask: "Defend against their hit and fire back in one or two sentences.",
    modelBTask: "Defend against their hit and fire back in one or two sentences.",
  },
  {
    round: 4,
    label: "Final Blow",
    modelATask: "Land your closing one-liner. Make it stick.",
    modelBTask: "Land your closing one-liner. Make it stick.",
  },
];

const BLITZ_4_TR: RoundPlanEntry[] = [
  {
    round: 1,
    label: "Açılış Vuruşu",
    modelATask: "Bir iki vurucu cümleyle konu LEHİNE en güçlü noktanı söyle.",
    modelBTask: "Bir iki vurucu cümleyle konu ALEYHİNE en güçlü noktanı söyle.",
  },
  {
    round: 2,
    label: "Çapraz Ateş",
    modelATask: "Rakibin son sözündeki en zayıf yeri vur. Keskin ve kısa ol.",
    modelBTask: "Rakibin son sözündeki en zayıf yeri vur. Keskin ve kısa ol.",
  },
  {
    round: 3,
    label: "Karşı Ateş",
    modelATask: "Vuruşuna karşı savun ve bir iki cümleyle karşılık ver.",
    modelBTask: "Vuruşuna karşı savun ve bir iki cümleyle karşılık ver.",
  },
  {
    round: 4,
    label: "Son Darbe",
    modelATask: "Kapanış tek cümleni söyle. Akılda kalsın.",
    modelBTask: "Kapanış tek cümleni söyle. Akılda kalsın.",
  },
];

// Blitz is handled by getRoundPlan's short-circuit below, so the round-count
// table only needs debate + discussion (hence Exclude<DebateMode, "blitz">).
const PLANS: Record<
  Locale,
  Record<Exclude<DebateMode, "blitz">, Record<RoundCount, RoundPlanEntry[]>>
> = {
  en: {
    debate: { 3: DEBATE_3, 5: DEBATE_5, 7: DEBATE_7 },
    discussion: { 3: DISCUSSION_3, 5: DISCUSSION_5, 7: DISCUSSION_7 },
  },
  tr: {
    debate: { 3: DEBATE_3_TR, 5: DEBATE_5_TR, 7: DEBATE_7_TR },
    discussion: { 3: DISCUSSION_3_TR, 5: DISCUSSION_5_TR, 7: DISCUSSION_7_TR },
  },
};

export function getRoundPlan(
  mode: DebateMode,
  roundCount: RoundCount,
  language: Locale = "en",
): RoundPlanEntry[] {
  if (mode === "blitz") {
    return language === "tr" ? BLITZ_4_TR : BLITZ_4;
  }
  return (PLANS[language] ?? PLANS.en)[mode][roundCount];
}
