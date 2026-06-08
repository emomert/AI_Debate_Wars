/** Turkish — Profile page. Must mirror ../en/profile.ts. */
export const profile = {
  notices: {
    noAccountsTitle: "Hesaplar henüz hazır değil",
    noAccountsBody: "Maç geçmişi yakında geliyor — münazaralar hesap olmadan da çalışır.",
    signedOutTitle: "Profilinizi görmek için giriş yapın",
    signedOutBody: "Kaydettiğiniz maçlar, geçmişiniz ve istatistikleriniz giriş yaptığınızda burada görünür.",
    signIn: "Giriş yapın",
    loadErrorTitle: "Geçmişiniz yüklenemedi",
    loadErrorBody: "Kaydettiğiniz maçlara şu anda ulaşamadık. Lütfen birazdan tekrar deneyin.",
  },
  heading: "Arenanız",
  stats: {
    matches: "Maçlar",
    totalSpent: "Toplam harcama",
    debates: "Münazaralar",
    deepDebates: "Derin Münazaralar",
    mostUsedFighter: "En çok kullanılan yarışmacı",
  },
  winsByFighter: "🏆 Yarışmacıya göre galibiyetler",
  history: {
    recentTitle: (shown: number, total: number) => `📜 Son maçlar (${total} maçtan ${shown} tanesi)`,
    historyTitle: (total: number) => `📜 Maç geçmişi (${total})`,
    empty: "Henüz maç yok. Bir münazara başlatın, burada görünsün.",
    setUpMatch: "⚙️ Maç kurun",
    deepBadge: "🌐 Derin",
    subLine: (vsLine: string, verdict: string, rounds: number, cost: string) =>
      `${vsLine} · ${verdict} · ${rounds} tur · ${cost}`,
    vs: (a: string, b: string) => `${a} vs ${b}`,
  },
  winner: {
    won: (name: string) => `${name} kazandı`,
    draw: "Berabere",
    discussion: "Tartışma",
    noVerdict: "Karar yok",
  },
  reopen: {
    opening: "Açılıyor…",
    view: "Görüntüle",
  },
};
