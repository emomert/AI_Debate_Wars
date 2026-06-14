/** Turkish — Result / verdict screen + share. Must mirror ../en/result.ts. */
export const result = {
  // result/page.tsx — empty state + header + actions
  page: {
    empty: {
      loading: "Sonuçlar yükleniyor…",
      title: "Henüz tamamlanmış maç yok",
      body: "Önce bir münazara çalıştırın; kararınız ve maliyet özetiniz burada görünecek.",
      setup: "⚙️ Maç kurun",
      home: "⌂ Ana sayfa",
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
      home: "⌂ Ana sayfa",
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

  // VerdictCard
  verdict: {
    badge: "🏆 KARAR",
    judge: (name: string) => `⚖️ Hakem: ${name}`,
    takesIt: (name: string) => `${name} kazandı`,
    draw: "Berabere",
    discussionComplete: "Tartışma tamamlandı",
    winningArgument: "💥 Kazanan argüman: ",
    whyThis: "⚖️ Neden bu karar",
    strongest: (name: string) => `${name} en güçlü`,
    weakest: (name: string) => `${name} en zayıf`,
  },

  // FinalSummaryCard
  summary: {
    title: "📊 Maç Özeti",
    topic: "Konu",
    debate: "⚔️ Münazara",
    discussion: "🧠 Tartışma",
    tone: (tone: string) => `Üslup: ${tone}`,
    messages: (count: number) => `${count} mesaj`,
    judged: "⚖️ Değerlendirildi",
    noJudge: "Hakem yok",
    totalCost: "Toplam maliyet",
    totalTokens: "Toplam token",
    inputTokens: "Girdi tokenları",
    outputTokens: "Çıktı tokenları",
    judge: "⚖️ Hakem",
    cheaperLessPre: (cheaper: string) => `${cheaper}, `,
    cheaperLessPost: (pricier: string) => ` ${pricier} yarışmacısından daha ucuza geldi.`,
    estimatedPrefix: "Tahmini · ",
    pricingNote: "Fiyatlandırma şuradan yapılandırılabilir:",
  },

  // RejudgePanel
  rejudge: {
    secondOpinionTitle: "⚖️ İkinci bir görüş ister misiniz?",
    addJudgeTitle: "⚖️ Sonradan hakem ekleyin",
    secondOpinionBody: "Aynı dökümü farklı bir hakeme verip yepyeni bir karar alın.",
    addJudgeBody: "Maç hakemsiz oynandı — tamamlanmış münazarayı puanlamak için şimdi bir hakem seçin.",
    close: "▴ Kapat",
    changeJudge: "🔁 Hakemi değiştir",
    pickJudge: "⚖️ Hakem seçin",
    newJudge: "Yeni hakem",
    fighterWarning: "⚠️ Bu hakem maçta yarıştığı için karar daha az tarafsız olabilir.",
    deliberating: "⚖️ Hakem değerlendiriyor…",
    runVerdict: "🏆 Yeni kararı çalıştırın",
    billingNote: "Yeni bir hakem turu çalıştırır — her karar gibi ücretlendirilir. Önceki karar maç maliyetine dahil kalır.",
  },

  // SharePanel
  share: {
    title: "📣 Maçı Paylaşın",
    blurb: "Kararı bir görsel olarak paylaşın — indirin, kopyalayın veya paylaşın. Bağlantılar arenaya kısa bir özet taşır.",
    previewAlt: "Karar kartı önizlemesi",
    renderError: "Görsel burada oluşturulamadı — yine de aşağıdan özeti kopyalayabilir veya bir bağlantı paylaşabilirsiniz.",
    drawing: "🎨 Karar kartınız çiziliyor…",
    shareImage: "📤 Görseli paylaşın",
    download: "📥 İndir",
    copied: "✅ Kopyalandı!",
    copyImage: "🖼️ Görseli kopyala",
    post: "Paylaş",
    whatsapp: "WhatsApp",
    reddit: "Reddit",
    linkedin: "LinkedIn",
    linkCopied: "✅ Bağlantı kopyalandı",
    copyLink: "🔗 Bağlantıyı kopyala",
    copyRecap: "📋 Özeti kopyala",
    tip: "İpucu: Telefonlarda “Görseli paylaşın” resmi doğrudan herhangi bir uygulamaya gönderir. Masaüstünde indirin veya kopyalayın, ardından paylaşımınıza ekleyin.",
    // text/recap builders (SharePanel)
    beat: (winner: string, loser: string) => `${winner}, ${loser} rakibini yendi`,
    drawHeadline: (a: string, b: string) => `${a} ile ${b} berabere kaldı`,
    versus: (a: string, b: string) => `${a} vs ${b}`,
    shareText: (headline: string, topic: string) => `${headline} — Debator'da “${topic}” münazarası 🏟️`,
    nativeTitle: "Debator kararı",
    recap: {
      header: (headline: string) => `🏟️ Debator — ${headline}`,
      topic: (topic: string) => `Konu: ${topic}`,
      mode: (mode: string, rounds: number) => `Mod: ${mode} · ${rounds} tur`,
      fighters: (a: string, b: string) => `Yarışmacılar: ${a} (A) vs ${b} (B)`,
      verdict: (summary: string) => `Karar: ${summary}`,
      noJudge: "Hakem yok — son turdan sonra sona erdi.",
      winningArgument: (arg: string) => `Kazanan argüman: ${arg}`,
      totalCost: (cost: string) => `Toplam maliyet: ${cost}`,
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
    winningArgument: "💥 Kazanan argüman: ",
    topic: "Konu",
    missingTitle: "Debator",
    missingBody: "Bu paylaşım bağlantısı eksik veya geçersiz — ama kendi maçınızı başlatabilirsiniz.",
    runOwn: "⚙️ Kendi münazaranızı çalıştırın",
    home: "⌂ Ana sayfa",
  },
};
