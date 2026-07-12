/** Türkçe — Jeton ekonomisi arayüzü. ../en/coins.ts ile aynı anahtarlar. */
export const coins = {
  balance: (n: number) => `🪙 ${n}`,
  balanceLabel: "Jeton bakiyeniz — paketleri ve fiyatları görün",
  dailySuffix: (n: number) => `+${n} bugün`,

  coinChip: (n: number) => `🪙 ${n}`,
  premiumTag: "★",
  premiumHint: "Premium yarışmacı — satın alınmış jeton kullanır",
  matchCost: (n: number) => `🪙 Bu maç: ${n} jeton`,

  gateNote: "Dövüşmek için kaydolun — günlük ücretsiz jetonlar dahil.",

  pricing: {
    title: "Jetonlar ve Fiyatlandırma",
    subtitle: "Her yarışmacının bir jeton fiyatı var. Bir maç, iki yarışmacının toplamına mal olur — hakem her zaman ücretsizdir.",
    freeTitle: "🎁 Her gün ücretsiz",
    freeBody: (daily: number, maxBand: number) =>
      `Giriş yapan oyuncular her gün ${daily} ücretsiz jeton alır. Bu jetonlar ${maxBand} jetona kadar fiyatlanan her yarışmacıda geçer — kadronun çoğunu kapsar. Kullanılmayan günlük jetonlar devretmez; UTC gece yarısında yenilenir.`,
    packsTitle: "Jeton paketleri",
    comingSoon: "Ödemeler çok yakında",
    notifyNote: "Paketler belirlendi — ödeme sayfası kısa süre içinde açılıyor.",
    popular: "En popüler",
    bestValue: "En avantajlı",
    perCoin: (cents: string) => `${cents}¢ / jeton`,
    packHeading: (coins: number) => `${coins} jeton`,
    examplesIntro: "Bununla neler yapılır:",
    exampleQuick: (n: number) => `≈ ${n} hızlı maç (iki 1 jetonluk yarışmacı)`,
    examplePremium: (n: number) => `≈ ${n} premium karşılaşma (örn. Sonnet 5 vs Kimi)`,
    exampleFlagship: (n: number) => `≈ ${n} amiral gemisi dövüşü (örn. sahnede GPT-5.5)`,
    rulesTitle: "Jetonlar nasıl çalışır?",
    rules: [
      "Bir maç, Yarışmacı A + Yarışmacı B jetonlarına mal olur — fiyat her yarışmacı kartında yazar.",
      "Uzun yanıt uzunluğu yarışmacı toplamını ikiye katlar; Derin Münazara sabit 2 jeton ekler.",
      "Hakem (ve yeniden hakemlik) her zaman ücretsizdir.",
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

  popup: {
    title: "🪙 Arenayı jetonlar çalıştırır",
    body: (daily: number) =>
      `Her gün ${daily} ücretsiz jeton alırsınız — birkaç maça yeter. Büyük yarışmacılar daha çok jetona mal olur; paketler ağır topların kilidini açar.`,
    seePricing: "Jetonları ve fiyatları gör",
    dismiss: "Dövüşelim ▶",
  },
};
