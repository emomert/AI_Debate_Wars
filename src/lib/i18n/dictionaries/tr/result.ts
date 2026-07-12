/** Turkish — Result / verdict screen + share. Must mirror ../en/result.ts. */
export const result = {
  // result/page.tsx — empty state + header + actions
  page: {
    empty: {
      loading: "Sonuçlar yükleniyor…",
      title: "Henüz tamamlanmış maç yok",
      body: "Önce bir münazara çalıştırın; kararınız ve maliyet özetiniz burada görünecek.",
      setup: "⚙️ Maç kurun",
      home: "🏠 Ana sayfa",
    },
    matchComplete: "✅ Maç Tamamlandı",
    heading: "Toz Duman Dağılıyor",
    stoppedEarly: "Maç erken durduruldu",
    noJudge: {
      title: "Bu turda hakem yok",
      ended: "Münazara son turdan sonra sona erdi — ama yine de aşağıdan bir hakem getirebilirsiniz.",
      stopped: "Maç son turdan önce durduruldu, bu yüzden henüz değerlendirilecek bir şey yok.",
    },
    sources: {
      title: (count: number) => `📚 Kullanılan kaynaklar (${count})`,
      blurb: "Yarışmacıların bu Derin Münazara boyunca alıntıladığı tüm canlı kaynaklar, tekrarlar ayıklanmış halde.",
      label: "Tüm kaynaklar",
    },
    actions: {
      backToArena: "↩ Arenaya dön",
      newSetup: "⚙️ Yeni Kurulum",
      rematch: "🔁 Rövanş",
      home: "🏠 Ana sayfa",
    },
  },

  // Çoklu dövüş seçici (yalnızca bir maçta 2–3 dövüş olduğunda görünür)
  battles: {
    tab: (n: number) => `Dövüş ${n}`,
    tabAria: (n: number) => `Dövüş ${n} sonuçlarını görüntüle`,
    vs: "vs",
    overviewTitle: "🗂️ Tüm dövüşler",
    viewing: (n: number, total: number) => `${total} dövüşten ${n}. görüntüleniyor`,
    winnerA: "A kazandı",
    winnerB: "B kazandı",
    tie: "Berabere",
    inProgress: "Devam ediyor",
  },

  // VerdictCard (birleşik karar + paylaşım kartı)
  verdict: {
    badge: "🏆 KARAR",
    judge: (name: string) => `⚖️ Hakem: ${name}`,
    takesIt: (name: string) => `${name} kazandı`,
    draw: "Berabere",
    discussionComplete: "Tartışma tamamlandı",
    winningArgument: "💥 Kazanan argüman: ",
    whyThis: "⚖️ Neden bu karar",
    sideFor: "Savunan",
    sideAgainst: "Karşı",
    sideA: "A",
    sideB: "B",
    changeJudge: "🔁 Hakemi değiştir",
  },

  // RejudgeSection (VerdictCard içinde) + bağımsız hakem-ekle paneli
  rejudge: {
    addJudgeTitle: "⚖️ Sonradan hakem ekleyin",
    secondOpinionBody: "Aynı dökümü farklı bir hakeme verip yepyeni bir karar alın.",
    addJudgeBody: "Maç hakemsiz oynandı — tamamlanmış münazarayı puanlamak için şimdi bir hakem seçin.",
    close: "▴ Kapat",
    pickJudge: "⚖️ Hakem seçin",
    newJudge: "Yeni hakem",
    fighterWarning: "⚠️ Bu hakem maçta yarıştığı için karar daha az tarafsız olabilir.",
    deliberating: "⚖️ Hakem değerlendiriyor…",
    runVerdict: "🏆 Yeni kararı çalıştırın",
    billingNote: "Yeni bir hakem turu çalıştırır — hakemin jeton fiyatına mal olur (en az 1 jeton). Önceki karar kayıtta kalır.",
  },

  // VerdictCard içindeki paylaşım satırı
  share: {
    copied: "✅ Kopyalandı!",
    copyImage: "🖼️ Görseli kopyala",
    post: "X'te paylaş",
    instagram: "Instagram'da paylaş (önce başlık kopyalanır)",
    reddit: "Reddit'te paylaş",
    linkCopied: "✅ Bağlantı kopyalandı!",
    shareMatch: "📄 Maçı paylaş",
    sharing: "⏳ Bağlantı oluşturuluyor…",
    shareMatchTitle:
      "Münazaranın tamamı + kararla birlikte liste dışı bir sayfa oluşturur ve bağlantısını kopyalar",
    matchCopied: "✅ Maç kopyalandı!",
    // metin oluşturucular
    beat: (winner: string, loser: string) => `${winner}, ${loser} rakibini yendi`,
    drawHeadline: (a: string, b: string) => `${a} ile ${b} berabere kaldı`,
    versus: (a: string, b: string) => `${a} vs ${b}`,
    shareText: (headline: string, topic: string) => `${headline} — Debator'da “${topic}” münazarası 🏟️`,
    // Tam maç düz-metin paylaşımı (lib/share/matchText.ts)
    matchText: {
      header: (headline: string) => `🏟️ Debator — ${headline}`,
      topic: (topic: string) => `Konu: ${topic}`,
      sides: (a: string, b: string) => `Savunan: ${a}  vs  Karşı: ${b}`,
      fighters: (a: string, b: string) => `Yarışmacılar: ${a} vs ${b}`,
      turnHeading: (name: string, roundLabel?: string) =>
        `— ${roundLabel ? `${roundLabel} · ` : ""}${name} —`,
      verdictHeading: (judgeName: string) =>
        judgeName ? `⚖️ KARAR — Hakem: ${judgeName}` : "⚖️ KARAR",
      noJudge: "Hakem yok — maç son turdan sonra sona erdi.",
      winnerLine: (name: string) => `Kazanan: ${name}`,
      drawLine: "Kazanan: Berabere",
      scoreLine: (a: number, b: number) => `Skor: ${a}–${b}`,
    },
  },

  // MatchSaver
  saver: {
    saved: "✓ Profilinize kaydedildi",
    signIn: "Giriş yapın",
    signInNudge: "bu maçı geçmişinize kaydetmek için.",
    saving: "Kaydediliyor…",
    retry: "↻ Kaydedilemedi — tekrar deneyin",
    save: "💾 Geçmişime kaydet",
  },

  // src/app/s/page.tsx — public share landing
  sharePage: {
    metaTitleSuffix: " · Debator",
    metaTitleFallback: "Debator — AI vs AI",
    metaDescription: (topic: string) => `“${topic}” — arenada karara bağlandı.`,
    metaDescriptionFallback: "Yapay zekâları fikirlerinizle dövüştürün.",
    verdictBadge: "🏆 KARAR",
    aiVsAi: "AI vs AI",
    verified: "✓ Doğrulandı",
    unverifiedBadge: "⚠ Doğrulanmadı",
    unverifiedNote:
      "Bu paylaşım gerçek bir Debator sonucu olarak doğrulanamadı — puanları veya metni değiştirilmiş olabilir. Gerçeğini görmek için kendi maçınızı çalıştırın.",
    winningArgument: "💥 Kazanan argüman: ",
    topic: "Konu",
    missingTitle: "Debator",
    missingBody: "Bu paylaşım bağlantısı eksik veya geçersiz — ama kendi maçınızı başlatabilirsiniz.",
    runOwn: "⚙️ Kendi münazaranızı çalıştırın",
    home: "🏠 Ana sayfa",
  },
};
