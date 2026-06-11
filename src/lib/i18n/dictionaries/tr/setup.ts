/** Turkish — Setup screen + selectors. Must mirror ../en/setup.ts. */
export const setup = {
  // Page heading + section panel titles
  heading: "Maçınızı Kurun",
  subheading: "Yarışmacılarınızı seçin ve kuralları belirleyin. Gerisini arena halleder.",
  sections: {
    topic: "1 · Konu",
    deepDebate: "2 · Derin Münazara",
    fighters: "3 · Yarışmacılarınızı Seçin",
    rules: "4 · Maç Kuralları",
    judge: "5 · Hakem",
  },
  swapFighters: "A ve B yarışmacılarını yer değiştir",
  fighterA: "Yarışmacı A",
  fighterB: "Yarışmacı B",
  backToHome: "← Ana sayfaya dön",

  // Match Rules sub-section labels + lock badges
  rules: {
    rounds: "Tur",
    tone: "Üslup",
    maxLength: "En fazla yanıt uzunluğu",
    pacing: "Tempo",
    voice: "Yarışmacı sesleri",
    recommended: "Önerilen",
    lockRounds: "🔒 Derin Münazara'da 3",
    lockStandard: "🔒 Standart",
    lockAuto: "🔒 Otomatik",
    deepLengthNote:
      "Derin Münazara yapılandırılmış, daha uzun bir format kullanır — uzunluk sizin için ayarlanır ve turlar daha uzun sürer.",
  },

  // Start CTA (mobile + summary card)
  start: "Maçı Başlatın",

  // TopicInput
  topic: {
    label: "🎤 Konunuz",
    placeholder: "örn. Üniversiteler yapay zekâ araçlarını yasaklamalı mı?",
    quickExamples: "Hızlı örnekler",
    // AI topic checker
    check: "✨ Konumu geliştir",
    checking: "Kontrol ediliyor…",
    checkError: "Konu yardımcısına ulaşılamadı — lütfen tekrar deneyin.",
    verdictStrong: "Güçlü konu",
    verdictWeak: "Daha keskin olabilir",
    verdictUnclear: "Daha fazla odak gerek",
    suggestionsLabel: "Bunlardan birini deneyin:",
    useSuggestionAria: (s: string) => `Bu konuyu kullan: ${s}`,
    dismiss: "Kapat",
  },

  // RoundSelector option labels/blurbs, keyed by round count
  rounds: {
    3: { label: "Hızlı Maç", blurb: "Hızlı ve vurucu" },
    5: { label: "Dereceli Maç", blurb: "Daha fazla karşılıklı atışma" },
    7: { label: "Şampiyona", blurb: "Tam turnuva" },
  } as Record<number, { label: string; blurb: string }>,

  // ToneSelector option labels (keyed by id) + custom input
  tones: {
    serious: { label: "Ciddi" },
    aggressive: { label: "Agresif" },
    casual: { label: "Rahat" },
    custom: { label: "Özel" },
    // Gizli sürpriz ton (Agresif'e art arda 5 tıklama).
    unhinged: { label: "Çıldırmış" },
  } as Record<string, { label: string }>,
  // VoiceToggle seçenek etiketleri/açıklamaları (arena HUD 🔊 çipiyle eşitlenir)
  voice: {
    off: { label: "Kapalı", blurb: "Turları kendiniz okuyun" },
    on: { label: "Ses açık", blurb: "Turlar sesli okunur — arenada istediğiniz an değiştirin" },
  },

  toneCustom: {
    describe: "Üslubu tarif edin (her iki yarışmacıya uygulanır)",
    placeholder: "örn. nüktedan duruşma avukatı, sakin profesör, spor spikeri…",
    fallbackLabel: "Özel",
    perFighter: "Her yarışmacıya farklı bir üslup ver",
    fighterTone: (name: string) => `${name} üslubu`,
    perFighterShort: "Özel (yarışmacıya göre)",
  },

  // ResponseLengthSelector option labels/blurbs (keyed by id)
  lengths: {
    short: { label: "Kısa", blurb: "100–160 kelime" },
    medium: { label: "Orta", blurb: "180–300 kelime" },
    long: { label: "Uzun", blurb: "350–600 kelime" },
  } as Record<string, { label: string; blurb: string }>,

  // PaceSelector option labels/blurbs (keyed by id)
  paces: {
    manual: { label: "Normal", blurb: "Her turu açmak için tıklayın" },
    auto: { label: "Hızlı", blurb: "Her turu otomatik oynatır" },
  } as Record<string, { label: string; blurb: string }>,

  // DeepDebateToggle
  deep: {
    title: "🌐 Derin Münazara — gerçek web araştırması",
    subtitle: "Yarışmacılar canlı web'de arama yapar, kaynaklarını alıntılayıp gösterir.",
    enable: "Derin Münazara'yı etkinleştir",
    benefitSearch: "✅ Her turda canlı web araması",
    benefitCited: "✅ Alıntılanan ve kaynak gösterilen referanslar (açılır liste içinde)",
    benefitSlower: "⏱ Daha uzun turlar — her biri yaklaşık 30–90 sn",
    benefitFixed: "🔒 Sabit format: 3 tur · standart üslup · otomatik uzunluk",
    benefitFees: "💰 Arama ücretleri (varsa) her turun maliyet rozetinde görünür.",
    needsKey: "⚠️ Sunucunun bu yarışmacılar için bir web arama anahtarına ihtiyacı var",
  },

  // JudgeSelector
  judge: {
    enableTitle: "⚖️ Hakem dahil edilsin mi?",
    enableSubtitle: "Tüm turlar bittiğinde hakem nihai kararı verir.",
    enable: "Hakem modunu etkinleştir",
    typeLabel: "Hakem türü",
    disabledNote: "Hakem seçilmedi. Münazara son turdan sonra sona erecek.",
    lessNeutral: "Daha az tarafsız",
    warnParticipated:
      "⚠️ Bu hakem münazaraya katıldı, bu yüzden karar daha az tarafsız olabilir.",
    warnThirdFighting:
      "⚠️ Bu hakem aynı zamanda maçta yarışıyor, bu yüzden karar daha az tarafsız olabilir.",
    judgeModelLabel: "Hakem modeli",
    autoPickPrefix: "Hakem:",
    autoNeutralNote: "Otomatik seçilir — her zaman iki yarışmacınızdan biri olmayan tarafsız bir model.",
    autoResolving: "Maç başladığında tarafsız bir model otomatik olarak seçilir.",
    blindTitle: "🙈 Kör değerlendirme",
    blindNote:
      "Hakem hangi modelin hangi tarafı yazdığını asla görmez — iki yarışmacıyı isimsiz olarak puanlar ve kimin kim olduğunu yalnızca karardan sonra açıklarız.",
    // Judge mode option labels/blurbs (keyed by id)
    modes: {
      auto: { label: "Otomatik Hakem", blurb: "Tarafsız üçüncü model kazananı seçer" },
      thirdModel: { label: "Hakem Seçin", blurb: "Tarafsız bir üçüncü model seçin" },
      modelA: { label: "Model A Hakemlik Eder", blurb: "Daha az tarafsız — A maçtaydı" },
      modelB: { label: "Model B Hakemlik Eder", blurb: "Daha az tarafsız — B maçtaydı" },
    } as Record<string, { label: string; blurb: string }>,
  },

  // ModelSelector
  models: {
    freeModels: "🌐 Diğer markalar",
    freeBrands: "Diğer markalar",
    ready: "hazır",
    freeVia: "OpenRouter üzerinden sunulur · ",
    needsOpenRouterKey: "OPENROUTER_API_KEY gerektirir",
    zeroCost: "çalıştırması $0",
    picked: "Seçildi",
    pickedWith: (name: string) => `Seçildi: ${name}`,
    modelsCount: (n: number) => `${n} model`,
    debateFit: "Münazara becerisi",
    debateFitHelp:
      "Bu modelin yapılandırılmış bir münazarada ne kadar iyi olduğuna dair 0–100 puanımız — akıl yürütme, karşı argüman ve konuya sadık kalma. Yüksek = daha zorlu bir rakip.",
    recommendedHeading: "Önerilen",
    showAll: (n: number) => `${n} modelin tümünü göster ▾`,
    showFewer: "Daha az göster ▴",
    needsWebSearchKey: "Derin Münazara için sunucunun web arama anahtarı gerekir",
    alsoPicked: "Diğer yarışmacı için de seçildi",
    needsApiKey: "Çalışması için bir API anahtarı gerekir",
  },

  // SetupSummaryCard
  summary: {
    title: "🎮 Maç Kartı",
    topic: "Konu",
    fighterA: "Yarışmacı A",
    fighterB: "Yarışmacı B",
    badgeDebate: "⚔️ Münazara",
    badgeDiscussion: "🧠 Tartışma",
    roundLine: (count: number, label: string) => `${count} · ${label}`,
    deepTemplate: "🔒 Derin şablon",
    deepDebate: "🌐 Derin Münazara",
    fast: "⚡ Hızlı",
    normal: "🚶 Normal",
    judgeOn: "⚖️ Hakem açık",
    judgeOff: "Hakem yok",
    start: "▶ Maçı Başlatın",
    footnote: "Canlı modeller · OpenRouter markaları tek bir ortak anahtarla çalışır",
  },
};
