/**
 * Static display metadata for the Setup screen selectors and Home samples.
 * These are pure data (no provider logic) and drive the arcade UI copy.
 */

import type { Locale } from "@/lib/i18n/config";
import type {
  DebateMode,
  DebatePace,
  DebateTone,
  JudgeMode,
  ResponseLength,
  RoundCount,
} from "@/lib/debate/debateTypes";

export interface ModeOption {
  id: DebateMode;
  title: string;
  tagline: string;
  description: string;
  modelARole: string;
  modelBRole: string;
  emoji: string;
}

export const MODE_OPTIONS: ModeOption[] = [
  {
    id: "debate",
    title: "Debate Mode",
    tagline: "Two sides enter. One stays standing.",
    description: "Two models take opposing stances and argue to win.",
    modelARole: "Pro side",
    modelBRole: "Against side",
    emoji: "⚔️",
  },
  {
    id: "discussion",
    title: "Discussion Mode",
    tagline: "Build it up, then stress-test it.",
    description: "Two models take complementary roles to improve your idea.",
    modelARole: "Supportive Strategist",
    modelBRole: "Critical Evaluator",
    emoji: "🧠",
  },
];

export interface RoundOption {
  count: RoundCount;
  label: string;
  blurb: string;
  /** Surfaced with a "Recommended" badge in the picker. */
  recommended?: boolean;
}

export const ROUND_OPTIONS: RoundOption[] = [
  { count: 3, label: "Quick Match", blurb: "Fast & punchy", recommended: true },
  { count: 5, label: "Ranked Match", blurb: "More back-and-forth" },
  // 7 avoids the word "Deep" so it never reads as the separate Deep Debate mode.
  { count: 7, label: "Championship", blurb: "Full tournament" },
];

export interface ToneOption {
  id: DebateTone;
  label: string;
  emoji: string;
}

export const TONE_OPTIONS: ToneOption[] = [
  { id: "serious", label: "Serious", emoji: "🎯" },
  { id: "aggressive", label: "Aggressive", emoji: "🔥" },
  { id: "casual", label: "Casual", emoji: "😎" },
  { id: "custom", label: "Custom", emoji: "✏️" },
];

export const CUSTOM_TONE_MAX_LENGTH = 80;

export interface PaceOption {
  id: DebatePace;
  label: string;
  blurb: string;
  emoji: string;
}

export const PACE_OPTIONS: PaceOption[] = [
  { id: "manual", label: "Normal", blurb: "Click to reveal each turn", emoji: "🚶" },
  { id: "auto", label: "Fast", blurb: "Auto-plays every turn", emoji: "⚡" },
];

export interface LengthOption {
  id: ResponseLength;
  label: string;
  blurb: string;
  /** Surfaced with a "Recommended" badge in the picker. */
  recommended?: boolean;
}

export const LENGTH_OPTIONS: LengthOption[] = [
  { id: "short", label: "Short", blurb: "100–160 words", recommended: true },
  { id: "medium", label: "Medium", blurb: "180–300 words" },
  { id: "long", label: "Long", blurb: "350–600 words" },
];

export interface JudgeModeOption {
  id: JudgeMode;
  label: string;
  blurb: string;
  warns?: boolean;
}

// Only the two NEUTRAL judge options are offered. The "Model A / Model B
// judges" modes still exist in the JudgeMode type (for backward-compat with
// matches saved before this change) but are no longer selectable in the UI.
export const JUDGE_MODE_OPTIONS: JudgeModeOption[] = [
  { id: "auto", label: "Auto Judge", blurb: "Neutral third model picks a winner" },
  { id: "thirdModel", label: "Pick a Judge", blurb: "Choose a neutral third model" },
];

/**
 * A LARGE library of example debate topics (Home + Setup). Each is a sharp,
 * clearly two-sided claim or question that drops straight into a great debate.
 * Deliberately spans the spectrum — politics, economics, tech, ethics, science,
 * culture and philosophy — and includes genuinely controversial, serious and
 * challenging motions (the arena always argues BOTH sides, neutrally). A
 * shuffled subset is surfaced on each visit (see pickSampleTopics) so the
 * examples feel fresh every time.
 */
export const SAMPLE_TOPICS: string[] = [
  // ── Politics & governance ────────────────────────────────────────────────
  "Voting should be mandatory.",
  "The voting age should be lowered to 16.",
  "Term limits should apply to every elected official.",
  "Political donations from corporations should be banned.",
  "Government mass surveillance is never justified.",
  "Direct democracy is better than representative democracy.",
  "The two-party system has failed.",
  "Monarchies should be abolished.",
  "A world government would be safer than nation-states.",
  "Nationalism does more harm than good.",
  "Public-sector workers should not be allowed to strike.",
  "Mandatory military service builds better citizens.",
  // ── Economics ────────────────────────────────────────────────────────────
  "Billionaires should not exist.",
  "A universal basic income should replace most welfare programs.",
  "A four-day work week should be the national standard.",
  "Rent control does more harm than good.",
  "The minimum wage should be a living wage.",
  "Inheritance above a high threshold should be taxed at 100%.",
  "Student debt should be forgiven.",
  "Capitalism is incompatible with a sustainable planet.",
  "Globalization has hurt more people than it has helped.",
  "Tariffs protect domestic jobs.",
  "Cryptocurrency will replace traditional banking.",
  "Economic growth should no longer be a national priority.",
  "The richest 1% pay too little in tax.",
  "Free markets solve problems better than governments.",
  // ── Tech & AI ────────────────────────────────────────────────────────────
  "AI will create more jobs than it destroys.",
  "Artificial general intelligence is an existential risk to humanity.",
  "Social media has done more harm than good.",
  "Companies should pay people for their personal data.",
  "Encryption backdoors make everyone less safe.",
  "Self-driving cars should be liable for their own accidents.",
  "Universities should ban AI writing tools.",
  "Internet access is a basic human right.",
  "Algorithms should never make life-or-death decisions.",
  "Big Tech monopolies should be broken up.",
  "Social media should be banned for under-16s.",
  // ── Society & ethics ─────────────────────────────────────────────────────
  "Capital punishment should be abolished.",
  "Recreational drugs should be legalized and regulated.",
  "Sex work should be fully decriminalized.",
  "Gun ownership should be tightly restricted.",
  "Immigration makes host countries stronger.",
  "Wealthy nations should accept unlimited climate refugees.",
  "Reparations should be paid for historical injustices.",
  "Eating meat is morally indefensible.",
  "Zoos should be abolished.",
  "Animal testing is never justified.",
  "Hate speech should still be protected as free speech.",
  "Censorship is sometimes justified in a free society.",
  "Privacy matters more than security.",
  "Prisons should focus on rehabilitation, not punishment.",
  "Cancel culture has gone too far.",
  "Gambling should be banned.",
  // ── Science, health & climate ────────────────────────────────────────────
  "Nuclear energy is essential to fighting climate change.",
  "Humans will live on Mars within 50 years.",
  "Gene-editing human embryos should be allowed.",
  "Vaccination should be mandatory.",
  "Organ donation should be opt-out by default.",
  "Space exploration is a waste of money.",
  "Lab-grown meat is the future of food.",
  "The climate crisis justifies limiting some individual freedoms.",
  "We should actively pursue radical life extension.",
  "Mental-health days should be a legal right.",
  // ── Education ─────────────────────────────────────────────────────────────
  "Standardized testing should be abolished.",
  "College is no longer worth the cost.",
  "Homework does more harm than good.",
  "Schools should teach financial literacy over calculus.",
  "Grades should be abolished.",
  // ── Philosophy & the genuinely hard ones ─────────────────────────────────
  "Free will is an illusion.",
  "Objective morality does not exist.",
  "It is sometimes ethical to lie.",
  "The ends can justify the means.",
  "We owe distant strangers as much as our own family.",
  "Humans are no more valuable than other animals.",
  "Immortality would be a curse, not a blessing.",
  "Humanity would be better off without organized religion.",
  "A just society would have no private property.",
  "Forgiveness is not always the right choice.",
  "War is sometimes the moral choice.",
  "It can be wrong to have children in an age of climate crisis.",
  // ── Culture, work & fun (lighter, still two-sided) ───────────────────────
  "Remote work beats working from an office.",
  "Money can buy happiness.",
  "The book is always better than the movie.",
  "Tipping culture should be abolished.",
  "Professional athletes are overpaid.",
  "Video games are a legitimate art form.",
  "Reality TV is harmful to society.",
  "Social-media influencers are a net negative for society.",
  "Pineapple belongs on pizza.",
  "A hot dog is a sandwich.",
  "Cereal is a soup.",
  "Tabs are better than spaces.",
  "Batman would beat Iron Man in a fair fight.",
  "The 9-to-5 workday is obsolete.",
  "Self-checkout is worse for everyone.",
  "Audiobooks count as reading.",
  "Working from a laptop in a café is overrated.",
  "Nostalgia is holding pop culture back.",
];

/** Turkish sample topics (shown on Home + Setup when the UI is in Turkish). */
export const SAMPLE_TOPICS_TR: string[] = [
  // Siyaset & yönetim
  "Oy vermek zorunlu olmalı.",
  "Oy verme yaşı 16'ya indirilmeli.",
  "Tüm seçilmiş görevlilere görev süresi sınırı getirilmeli.",
  "Şirketlerin siyasi bağışları yasaklanmalı.",
  "Devletin kitlesel gözetimi asla meşru değildir.",
  "Doğrudan demokrasi, temsili demokrasiden daha iyidir.",
  "Milliyetçilik faydadan çok zarar getirir.",
  "Zorunlu askerlik daha iyi vatandaşlar yetiştirir.",
  // Ekonomi
  "Milyarderler var olmamalı.",
  "Vatandaşlık temel geliri çoğu sosyal yardımın yerini almalı.",
  "Haftada 4 günlük çalışma ulusal standart olmalı.",
  "Asgari ücret geçinmeye yeten bir ücret olmalı.",
  "Kira kontrolü yarardan çok zarar verir.",
  "Öğrenci borçları silinmeli.",
  "Kapitalizm sürdürülebilir bir gezegenle bağdaşmaz.",
  "Küreselleşme, yarar sağladığından çok insana zarar verdi.",
  "Kripto para geleneksel bankacılığın yerini alacak.",
  "Ekonomik büyüme artık ulusal bir öncelik olmamalı.",
  "En zengin %1 çok az vergi ödüyor.",
  // Teknoloji & yapay zekâ
  "Yapay zekâ yok ettiğinden daha fazla iş yaratacak.",
  "Genel yapay zekâ insanlık için varoluşsal bir risktir.",
  "Sosyal medya faydadan çok zarar getirdi.",
  "Sosyal medya 16 yaş altına yasaklanmalı.",
  "Üniversiteler yapay zekâ yazım araçlarını yasaklamalı.",
  "Şirketler kişisel verileri için insanlara ödeme yapmalı.",
  "İnternet erişimi temel bir insan hakkıdır.",
  "Algoritmalar asla ölüm-kalım kararları vermemeli.",
  "Büyük teknoloji tekelleri parçalanmalı.",
  // Toplum & etik
  "İdam cezası kaldırılmalı.",
  "Uyuşturucular yasallaştırılıp denetlenmeli.",
  "Göç, ev sahibi ülkeleri güçlendirir.",
  "Mahremiyet güvenlikten daha önemlidir.",
  "Et yemek ahlaken savunulamaz.",
  "Hayvanlar üzerinde deney asla haklı değildir.",
  "Hayvanat bahçeleri kapatılmalı.",
  "Cezaevleri cezalandırmaya değil, rehabilitasyona odaklanmalı.",
  "Nefret söylemi bile ifade özgürlüğü olarak korunmalı.",
  "Kumar yasaklanmalı.",
  // Bilim, sağlık & iklim
  "Nükleer enerji iklim kriziyle mücadele için şarttır.",
  "İnsanlar 50 yıl içinde Mars'ta yaşayacak.",
  "Aşı zorunlu olmalı.",
  "Organ bağışı varsayılan olarak 'çıkışlı' olmalı.",
  "Laboratuvar eti geleceğin gıdasıdır.",
  "İklim krizi bazı bireysel özgürlüklerin kısıtlanmasını haklı kılar.",
  "Uzay araştırmaları para israfıdır.",
  // Eğitim
  "Standart sınavlar kaldırılmalı.",
  "Üniversite artık maliyetine değmiyor.",
  "Ödev yarardan çok zarar verir.",
  "Okullar matematik yerine finansal okuryazarlık öğretmeli.",
  "Notlar kaldırılmalı.",
  // Felsefe & en zorlular
  "Özgür irade bir yanılsamadır.",
  "Nesnel ahlak diye bir şey yoktur.",
  "Bazen yalan söylemek etiktir.",
  "Amaçlar bazen araçları meşru kılar.",
  "İnsanlık örgütlü dinler olmadan daha iyi olurdu.",
  "Ölümsüzlük bir lütuf değil, bir lanet olurdu.",
  // Kültür, iş & eğlence
  "Uzaktan çalışma, ofiste çalışmaktan daha iyidir.",
  "Para mutluluğu satın alabilir.",
  "Kitap her zaman filminden daha iyidir.",
  "Bahşiş kültürü kaldırılmalı.",
  "Video oyunları meşru bir sanat biçimidir.",
  "Ananas pizzanın üzerine yakışır.",
  "Sosis sandviç bir tür sandviçtir.",
  "Sekme (tab) boşluktan daha iyidir.",
];

/** Full sample-topic library for the active UI locale. */
export function getSampleTopics(locale: Locale): string[] {
  return locale === "tr" ? SAMPLE_TOPICS_TR : SAMPLE_TOPICS;
}

/**
 * A freshly-shuffled subset of the topic library for the active locale, so the
 * examples feel different on each visit. Uses Math.random — call it from a
 * client effect (not during SSR render) to avoid a hydration mismatch.
 */
export function pickSampleTopics(locale: Locale, count: number): string[] {
  const all = [...getSampleTopics(locale)];
  // Fisher–Yates shuffle, then take `count` (capped at the library size).
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, Math.min(count, all.length));
}

export const TOPIC_MIN_LENGTH = 8;
export const TOPIC_MAX_LENGTH = 280;
