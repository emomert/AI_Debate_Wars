/** Türkçe — Jeton ekonomisi arayüzü. ../en/coins.ts ile aynı anahtarlar. */
export const coins = {
  balance: (n: number) => `🪙 ${n}`,
  balanceLabel: "Jeton bakiyeniz — paketleri ve fiyatları görün",

  coinChip: (n: number) => `🪙 ${n}`,
  premiumTag: "★",
  premiumHint: "Premium yarışmacı — satın alınmış jeton kullanır",
  totalCostLabel: "Toplam maliyet",
  totalCostValue: (n: number) => `🪙 ${n} jeton`,

  gate: {
    title: "Önce kaydolun",
    body: (daily: number) =>
      `Maçlar için bir hesap gerekir — kaydolmak saniyeler sürer ve her gün ${daily} ücretsiz jetonla gelir.`,
    cta: "Ücretsiz kaydolun",
    later: "Şimdi değil",
  },

  /** ClaimDailyButton (docs/23_COINS.md; migration 0014) — günlük ödenek artık
   *  talep edilmesi gerekiyor: her zaman hesaplanır, asla otomatik yüklenmez —
   *  her gün talep düğmesine basmanız gerekir, aksi halde o günün jetonları
   *  hiç kullanılamaz. */
  claim: {
    cta: (n: number) => `🎁 ${n} ücretsiz jeton talep et`,
    chipCta: (n: number) => `🎁 ${n} talep et`,
    busy: "Talep ediliyor…",
    claimed: "✅ Talep edildi! Daha fazlası için yarın tekrar gelin.",
    claimedShort: "✅ Talep edildi",
    error: "Şu anda talep edilemedi — birazdan tekrar deneyin.",
    errorShort: "Tekrar dene",
    rateLimited: "Çok fazla deneme — bir saat sonra tekrar deneyin.",
    rateLimitedShort: "Sonra deneyin",
  },

  pricing: {
    title: "Jetonlar ve Fiyatlandırma",
    freeTitle: "🎁 Her gün ücretsiz",
    freeBody: (daily: number, maxBand: number) =>
      `Giriş yapan oyuncular her gün ${daily} ücretsiz jeton talep edebilir — jetonları toplamak için her gün talep düğmesine basın (bir günü atlarsanız o günün jetonları devretmeden kaybolur). Talep edilen jetonlar ${maxBand} jetona kadar fiyatlanan her yarışmacıda geçer — kadronun çoğunu kapsar.`,
    packsTitle: "Jeton paketleri",
    // "Ne alır" — sadece kademeler, model adı YOK (sahip 7/28).
    examplesIntro: "Bu ne alır:",
    exampleQuick: (n: number) => `≈ ${n} normal maç (2 jeton)`,
    examplePremium: (n: number) => `≈ ${n} premium karşılaşma (6 jeton)`,
    exampleFlagship: (n: number) => `≈ ${n} zirve dövüşü (13 jeton)`,
    comingSoon: "Ödemeler çok yakında",
    buy: "Hemen satın al",
    checkoutSuccess:
      "Ödeme alındı! Jetonlarınız yolda — bakiye birkaç saniye içinde güncellenir.",
    checkoutError: "Ödeme tamamlanmadı ve sizden ücret alınmadı. Lütfen tekrar deneyin.",
    checkoutUnavailable: "Ödemeler şu anda kullanılamıyor — lütfen kısa süre sonra tekrar deneyin.",
    popular: "En popüler",
    bestValue: "En avantajlı",
    perCoin: (cents: string) => `${cents}¢ / jeton`,
    packHeading: (coins: number) => `${coins} jeton`,
    rulesTitle: "Jetonlar nasıl çalışır?",
    rules: [
      "Bir maç, Yarışmacı A + Yarışmacı B jetonlarına mal olur — fiyat her yarışmacı kartında yazar.",
      "Derin Münazara sabit 2 jeton ekler.",
      "Otomatik hakem ücretsiz dahildir. Kendi hakeminizi seçmek o modelin jeton fiyatını ekler.",
      "Farklı bir hakeme geçmek o hakemin jeton fiyatına mal olur; aynı hakemi (veya Otomatik hakemi) yeniden çalıştırmak ücretsizdir.",
      "Premium yarışmacılar (8 jeton ve üzeri) satın alınmış ya da promosyon jetonu kullanır — günlük ücretsiz jetonlar 4 jetona kadar her şeyi kapsar.",
      "Satın alınan ve promosyon jetonlarının süresi asla dolmaz.",
    ],
    promoTitle: "Promosyon kodunuz mu var?",
    promoPlaceholder: "örn. LAUNCH-XXXXX",
    promoCta: "Kullan",
    promoRedeeming: "Kullanılıyor…",
    promoSignIn: "Promosyon kodu kullanmak için giriş yapın.",
    promoSuccess: (n: number) => `Bakiyenize +${n} jeton eklendi! 🎉`,
    promoErrors: {
      INVALID: "Böyle bir kod yok — yazımı kontrol edin.",
      EXPIRED: "Bu kodun süresi dolmuş.",
      EXHAUSTED: "Bu kodun kullanım hakkı tükenmiş.",
      ALREADY_USED: "Bu kodu zaten kullandınız.",
      RATE_LIMITED: "Çok fazla deneme — bir saat sonra tekrar deneyin.",
      AUTH: "Önce giriş yapın, sonra kodu kullanın.",
      UNKNOWN: "Şu anda kullanılamadı — birazdan tekrar deneyin.",
    },
  },

  /** /welcome üzerindeki isteğe bağlı promosyon sorusu (kayıttan hemen sonra). */
  welcomePromo: {
    title: "🎟️ Promosyon kodunuz var mı?",
    body: "Şimdi yazın, jetonlar doğrudan bakiyenize eklensin — ya da daha sonra Fiyatlandırma sayfasından kullanın.",
  },

};
