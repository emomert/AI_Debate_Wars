/** Turkish — live debate arena. Must mirror ../en/debate.ts. */
export const debate = {
  // EmptyArena
  empty: {
    titleReady: "Arena'da henüz bir maç yok",
    titleLoading: "Arena yükleniyor…",
    bodyReady: "Bir münazara başlatmak için bir konu ve iki yarışmacı belirleyin.",
    bodyLoading: "Sahneyi hazırlarken biraz bekleyin.",
    setUpMatch: "⚙️ Maç kurun",
  },

  // Screen-reader announcements (DebateArena live region)
  announce: {
    researching: (name: string, round: number, total: number) =>
      `${name} web'de araştırma yapıyor. Tur ${round} / ${total}.`,
    thinking: (name: string, round: number, total: number) =>
      `${name} düşünüyor. Tur ${round} / ${total}.`,
    responding: (name: string, round: number, total: number) =>
      `${name} yanıt veriyor. Tur ${round} / ${total}.`,
    fighterFallback: "Bir yarışmacı",
    judging: "Hakem karar veriyor.",
    awaitingVerdict: "Turlar tamamlandı. Hazır olduğunuzda kararı gösterin.",
    awaitingNext: "Sonraki tura hazır. Devam etmek için düğmeye basın.",
    stopped: "Maç durduruldu.",
    error: "Bir sorun maçı kesintiye uğrattı.",
    verdictReady: "Nihai karar hazır.",
    complete: "Münazara tamamlandı.",
  },

  // The big "ROUND N" transition flash
  roundFlash: (n: number) => `TUR ${n}`,

  // Topic bar
  topic: {
    nowDebating: "Şimdi münazara ediliyor",
    tone: (value: string) => `Üslup: ${value}`,
    customTone: "özel",
    deepDebate: "🌐 Derin Münazara",
  },

  // Çoklu dövüş sekme çubuğu (yalnızca bir maç aynı anda 2–3 dövüş yürütünce)
  battles: {
    tab: (n: number) => `Dövüş ${n}`,
    tabAria: (n: number) => `Dövüş ${n}'i görüntüle`,
    vs: "vs",
    allBattles: "Tümü",
    finishedCount: (done: number, total: number) => `${done}/${total} bitti`,
  },

  // Panels under the timeline
  noJudge: "Bu turda hakem yok — münazara son turun ardından sona erdi.",
  stoppedPanel: {
    title: "Maç durduruldu",
    body: "Yarışmacıları arenadan çektiniz. Yeniden maç yapabilir ya da şimdiye kadar olanları görebilirsiniz.",
  },
  awaiting: {
    verdictTitle: "🏆 Turlar tamamlandı",
    moveTitle: "🎮 Sıra sizde",
    verdictBody: "Hazır olduğunuzda hakemin kararını gösterin.",
    moveBody:
      "Hazır olduğunuzda sonraki turu gösterin — ya da otomatik oynatmak için yukarıdaki çubuktan ⚡ Hızlı moduna geçin.",
    revealVerdict: "🏆 Kararı Gösterin",
    nextTurn: "▶ Sonraki Tur",
  },
  errorPanel: {
    retryTurn: "↻ Turu yeniden dene",
    newSetup: "⚙️ Yeni Kurulum",
  },

  // Error copy, keyed by AppErrorCode (replaces friendlyMessage on this screen)
  errors: {
    MISSING_API_KEY: {
      title: "Bu yarışmacının köşesi çevrimdışı",
      body: "Bu maç şu anda başlayamıyor — arena tam olarak çalışmıyor. Farklı bir yarışmacı deneyin ya da biraz sonra tekrar bakın.",
    },
    PROVIDER_TIMEOUT: {
      title: "Yarışmacı tur ortasında dondu",
      body: "Modelin yanıt vermesi çok uzun sürdü. Tekrar deneyin ya da modelleri değiştirin.",
    },
    RATE_LIMITED: {
      title: "Arena soğuma molasında",
      body: "Sağlayıcı istekleri hız sınırına takıyor. Bir an bekleyip tekrar deneyin.",
    },
    INSUFFICIENT_CREDITS: {
      title: "Bu yarışmacının jetonu bitti",
      body: "Sağlayıcı hesabının bu model için kredisi kalmadı. Kredi ekleyin ya da kurulumda $0 faturalandırılan açık ağırlıklı bir model seçin.",
    },
    INVALID_MODEL: {
      title: "Bu yarışmacı kadroda yok",
      body: "Seçilen model kullanılamıyor. Kurulumda başka bir model seçin.",
    },
    TOKEN_LIMIT_EXCEEDED: {
      title: "Bu tur token tavanına çarptı",
      body: "Daha kısa bir maksimum yanıt uzunluğu deneyip tekrar çalıştırın.",
    },
    INVALID_SESSION: {
      title: "Bu maçta bir şeyler ters görünüyor",
      body: "Maç verisi reddedildi. Kuruluma dönüp yeni bir maç başlatın.",
    },
    INVALID_REQUEST: {
      title: "Bu maçta bir şeyler ters görünüyor",
      body: "Maç verisi reddedildi. Kuruluma dönüp yeni bir maç başlatın.",
    },
    TOO_MANY_REQUESTS: {
      title: "Yavaş olun, şampiyon",
      body: "Maçları arenanın yetişebileceğinden daha hızlı başlatıyorsunuz. Birkaç saniye bekleyip tekrar deneyin.",
    },
    DAILY_LIMIT_REACHED: {
      title: "Arena bugünkü sınırına ulaştı",
      body: "Debator, ışıkları açık tutmak için günlük harcamasını sınırlar. Şimdilik sınıra ulaşıldı — yarın tekrar gelin ya da bu sınıra dahil olmayan, $0 faturalandırılan açık ağırlıklı modelleri seçin.",
    },
    CONTENT_BLOCKED: {
      title: "Bu konu arenaya giremez",
      body: "Bu konu güvenlik filtremize takıldı, bu yüzden maç başlayamıyor. Konuyu yeniden ifade edin ya da farklı bir münazara seçin.",
    },
    PROVIDER_ERROR: {
      title: "Arena ışıkları titredi",
      body: "Model düzgün bir yanıt vermedi. Tekrar deneyin ya da modelleri değiştirin.",
    },
    // Topluluk rotalarının kodları — münazara sırasında üretilmez, ancak bu
    // harita her AppErrorCode'u kapsadığı için ekran her hatayı gösterebilir.
    AUTH_REQUIRED: {
      title: "Arenaya girmek için giriş yapın",
      body: "Bu hamle bir hesap gerektiriyor — giriş yapıp tekrar deneyin.",
    },
    NOT_FOUND: {
      title: "Bu maç arenadan ayrılmış",
      body: "Bu paylaşılan maç artık yok — yayından kaldırılmış olabilir.",
    },
    UNKNOWN_ERROR: {
      title: "Arena ışıkları titredi",
      body: "Model düzgün bir yanıt vermedi. Tekrar deneyin ya da modelleri değiştirin.",
    },
  },

  // DebateHUD phase labels + bits
  hud: {
    phase: {
      thinking: "Düşünüyor…",
      streaming: "Konuşuyor",
      judging: "Hakem geliyor",
      awaiting: "Sıra sizde",
      done: "Tamamlandı",
      stopped: "Durduruldu",
      error: "Hata",
    },
    paceLabel: (pace: "auto" | "manual") =>
      `Tempo: ${pace === "auto" ? "Hızlı" : "Normal"}. Değiştirmek için tıklayın.`,
    paceFast: "⚡ Hızlı",
    paceNormal: "🚶 Normal",
    totalCost: "Şimdiye kadarki toplam maliyet",
    msgSuffix: "mesaj",
  },

  // Yarışmacı sesleri (HUD anahtarı + mesaj başına oynat düğmesi)
  voice: {
    hudOn: "🔊 Ses",
    hudOff: "🔇 Ses",
    toggleLabel: (on: boolean) =>
      `Yarışmacı sesleri: ${on ? "açık" : "kapalı"}. Değiştirmek için tıklayın.`,
    play: "🔊 Oynat",
    stop: "⏹ Durdur",
    costLabel: "Bu maçtaki ses sentezi maliyeti",
    skip: "⏭ Atla",
    skipLabel: "Atla — tüm yanıtı şimdi göster ve sesi durdur",
  },

  // DebateControls buttons
  controls: {
    stop: "Durdur",
    revealVerdict: "🏆 Kararı Gösterin",
    nextTurn: "▶ Sonraki Tur",
    stopMatch: "Maçı Durdur",
    newSetup: "⚙️ Yeni Kurulum",
    retryTurn: "Turu Yeniden Dene",
    rematch: "🔁 Rövanş",
    seeResults: "📊 Sonuçları Gör",
  },

  // DebateTimeline
  timeline: {
    warmingUpTitle: "Arena ısınıyor…",
    warmingUpBody: "İlk yarışmacı sahneye çıkmak üzere.",
    judgeTitle: "Hakem",
    judgeSubtitle: "Tarafsız hakem",
    theJudge: "Hakem",
  },

  // DebateMessageCard badges/caption
  message: {
    pro: "LEHTE",
    against: "ALEYHTE",
    judge: "⚖️ Hakem",
    writing: (line: string) => `✍️ ${line}…`,
  },

  // ThinkingBubble
  thinking: {
    deepSuffix: " (bu biraz sürebilir)",
    line: (message: string) => `${message}…`,
  },

  // RoundCounter
  round: {
    counter: (current: number, total: number) => `TUR ${current} / ${total}`,
    debate: "⚔️ Münazara",
    discussion: "🧠 Tartışma",
  },

  // AIModelCard status labels + displayed roles
  card: {
    status: {
      idle: "Hazır",
      thinking: "Düşünüyor…",
      speaking: "Konuşuyor",
      finished: "Bitti",
      error: "Hata",
    },
    pro: "LEHTE",
    against: "ALEYHTE",
  },
  // Displayed fighter roles (the English ones still flow to prompts via MODE_OPTIONS)
  roles: {
    debate: { a: "Lehte taraf", b: "Aleyhte taraf" },
    discussion: { a: "Destekleyici Stratejist", b: "Eleştirel Değerlendirici" },
  },

  // CostBadge
  cost: {
    calculating: "hesaplanıyor…",
    searchFee: "Web araması ücreti dahildir",
    cachedTitle: (amount: string) =>
      `${amount} tasarruf edildi — girdinin bir kısmı istem önbelleğinden sunuldu`,
    est: "~tahmini",
    input: "Girdi",
    cachedInput: "♻️ Önbellekli girdi",
    output: "Çıktı",
    inputCost: "Girdi maliyeti",
    outputCost: "Çıktı maliyeti",
    webSearch: "🔎 Web araması",
    latency: "Gecikme",
    total: "Toplam",
  },

  // SourcesList
  sources: {
    label: "Kaynaklar",
    attribution: "Sonuçlar Brave Search ile",
  },

  // CitationViewer
  citation: {
    sourceBadge: "📚 Kaynak",
    close: "Kapat",
    openSource: "Kaynağı aç ↗",
    ariaSource: (index: number) => `Kaynak ${index}`,
  },

  // Rotating waiting / writing lines (consumed via useRotatingLine)
  fighterLines: [
    "{name} ateşli bir görüş pişiriyor",
    "{name} argümanlarını biliyor",
    "{name} mikrofon bırakma anını prova ediyor",
    "{name} keskin görüşler yüklüyor",
    "{name} parmaklarını çıtlatıyor",
    "{name} bir karşı argüman çağırıyor",
    "{name} zekâyı tamponluyor",
    "{name} (kibarca) şiddeti seçiyor",
    "{name} yıkıcı bir cevap taslağı hazırlıyor",
    "{name} bunu fazla düşünüyor, açıkçası",
    "{name} kendinden emin şekilde itiraz etmeye hazırlanıyor",
    "{name} havaya danışıyor",
    "{name} dramatik şekilde volta atıyor",
    "{name} bir karşılık arıyor",
    "{name} münazara kaslarını ısıtıyor",
    "{name} retorik bıçaklarını biliyor",
    "{name} hiçbir şey aramıyor — zaten biliyor",
    "{name} aynanın karşısında prova yapıyor",
    "{name} nefes egzersizleri yapıyor",
    "{name} kusursuz iğnelemeyi hesaplıyor",
    "{name} içindeki avukatı arıyor",
    "{name} güçlü bir argüman demliyor",
    "{name} şüpheli noktaları birleştiriyor",
    "{name} satır aralarınızı okuyor",
    "{name} kanıtları hazırlıyor",
    "{name} ağır kelimeleri yüklüyor",
    "{name} önce güçlendirip sonra yıkıyor",
    "{name} eğitim verisine fısıldıyor",
    "{name} kollarını sıvıyor",
    "{name} temiz bir devirme planlıyor",
    "{name} hayalî uzmanlara danışıyor",
    "{name} kendinden emin bir “aslında…” prova ediyor",
    "{name} öncülleri üst üste diziyor",
    "{name} bir mantık hatası kokusu alıyor",
    "{name} bir tek cümlelik vuruşu cilalıyor",
    "{name} zihinsel jimnastik yapıyor (altın madalya)",
    "{name} su sızdırmaz bir savunma kuruyor",
    "{name} kadim bilgeliği çağırıyor",
    "{name} kazanmaya hazırlanıyor, tabii ki",
    "{name} %200 özgüven yüklüyor",
    "{name} evrenle çapraz kontrol yapıyor",
    "{name} düşüncelerini topluyor (hepsini)",
    "{name} stratejik bir duraklama hazırlıyor",
    "{name} alaycılığı ısıtıyor",
    "{name} zayıf noktayı buluyor",
    "{name} retorik bir tuzak kuruyor",
    "{name} önce kapanış cümlesini prova ediyor",
    "{name} görmezden geldiği kural kitabına danışıyor",
    "{name} karşı örnekleri yüklüyor",
    "{name} sessizce karşı tarafı yargılıyor",
    "{name} acı seviyesini ayarlıyor",
    "{name} münazara kulübü anılarını çağırıyor",
    "{name} dayanılmaz derecede haklı olmaya hazırlanıyor",
    "{name} küçük bir zihinsel diyagram çiziyor",
    "{name} dramatik vurguyu prova ediyor",
    "{name} en güçlü görüşlerini topluyor",
    "{name} darbeye hazırlanıyor",
    "{name} “saygıyla, hayır”ı yüklüyor",
    "{name} ruhunu (ve ağırlıklarını) arıyor",
    "{name} cerrahi bir cevap hazırlıyor",
    "{name} ateşli görüş fırınını ısıtıyor",
    "{name} devireceği dominoları diziyor",
    "{name} kötü adam monoloğunu prova ediyor",
    "{name} hava mahkemesine danışıyor",
    "{name} kusursuz analojiyi çiziyor",
    "{name} rahatsız edici gerçekleri yüklüyor",
    "{name} cevap öncesi ısınıyor",
    "{name} haklı olduğunu yeniden kontrol ediyor (öyle)",
    "{name} nazikçe yok etmeye hazırlanıyor",
    "{name} ivme topluyor",
    "{name} en zekice açıyı buluyor",
    "{name} “açıklayayım”ı prova ediyor",
    "{name} birinci sınıf mantık yüklüyor",
    "{name} düşünce tacını takıyor",
    "{name} bir karşı saldırı kuruyor",
    "{name} gerçekleri sıraya diziyor",
    "{name} senaryoyu tersine çevirmeye hazırlanıyor",
    "{name} tur kazandıracak sözler için ısınıyor",
    "{name} bu argümanın hesabını yapıyor",
    "{name} kapanış darbesini biliyor",
    "{name} kendinden emin bir gülümseme yüklüyor",
    "{name} “şey, aslında” demeye hazırlanıyor",
    "{name} kanıtları derliyor",
    "{name} en güçlü noktasını iki kez prova ediyor",
    "{name} tehlikeli derecede güzel konuşmaya başlıyor",
  ] as string[],

  researchLines: [
    "🔎 {name} arşivleri karıştırıyor",
    "🔎 {name} interneti sorguya çekiyor",
    "🔎 {name} içgüdüsünü doğruluyor",
    "🔎 {name} web'i hızla tarıyor",
    "🔎 {name} kaynakların peşine düşüyor",
    "🔎 {name} kütüphaneyi yağmalıyor",
    "🔎 {name} dipnotları takip ediyor",
    "🔎 {name} kaynakları çapraz sorguluyor",
    "🔎 {name} kanıt avına çıkıyor",
    "🔎 {name} 47 tarayıcı sekmesi açıyor",
    "🔎 {name} ince yazıları okuyor",
    "🔎 {name} birincil kaynaklara danışıyor",
    "🔎 {name} gerçekleri çapraz doğruluyor",
    "🔎 {name} sinyali gürültüden ayırıyor",
    "🔎 {name} kim ne demiş diye bakıyor",
    "🔎 {name} araştırmaları açıyor",
    "🔎 {name} havaya kapılmadan önce doğruluyor",
    "🔎 {name} gerçek rakamların kokusunu alıyor",
    "🔎 {name} evrenle çapraz kontrol yapıyor",
    "🔎 {name} iddianın ardındaki kaynağı arıyor",
    "🔎 {name} arama sonuçlarını sorguya çekiyor",
    "🔎 {name} alıntılayacak kanıtlar topluyor",
    "🔎 {name} kanıtları tartıyor",
    "🔎 {name} ondaki tarihi yeniden kontrol ediyor",
    "🔎 {name} şüpheli noktaları birleştiriyor",
    "🔎 {name} kanıta dayalı bir savunma kuruyor",
    "🔎 {name} havayı değil, alıntıları yüklüyor",
    "🔎 {name} gerçekten ödev yapıyor",
    "🔎 {name} kesin bir delil avına çıkıyor",
    "🔎 {name} başlığın ötesini okuyor",
  ] as string[],

  judgeLines: [
    "⚖️ Hakem kanıtları tartıyor",
    "⚖️ Hakem tokmağı cilalıyor",
    "⚖️ Hakem keskin kısımları yeniden okuyor",
    "⚖️ Hakem kural kitabına danışıyor",
    "⚖️ Hakem puanları topluyor",
    "⚖️ Hakem dramatik şekilde müzakere ediyor",
    "⚖️ Hakem tutanağa gözlerini kısarak bakıyor",
    "⚖️ Hakem hesabı yapıyor",
  ] as string[],

  writingLines: [
    "{name} hızla yazıyor",
    "{name} kelimelere döküyor",
    "{name} formda",
    "{name} sözcüklerini özenle seçiyor",
    "{name} savunmasını yapıyor",
    "{name} tuşlara yükleniyor",
    "{name} monoloğunun ortasında",
    "{name} her şeyi açıkça ortaya koyuyor",
  ] as string[],
};
