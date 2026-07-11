/** Turkish — Technical report page. Must mirror ../en/report.ts. */
export const report = {
  title: "Teknik Rapor",
  toolbar: {
    print: "🖨️ Raporu Kaydet / Yazdır",
    home: "🏠 Ana sayfa",
  },
  intro: {
    lead: "Debator perde arkasında nasıl çalışıyor — maçlarınızı yürüten kodun ta kendisinden canlı olarak. Aşağıdaki istemler ",
    actual1: "gerçek",
    mid1: " istem oluşturucu tarafından üretilir, yarışmacı kadrosu ",
    actual2: "gerçek",
    mid2: " kataloğdur ve fiyatlar ",
    actual3: "gerçek",
    tail: " fiyatlandırma tablosudur. Bu sayfadaki hiçbir şey eskiyebilecek bir ekran görüntüsü değildir.",
  },

  // Yapışkan bölüm gezinmesi (scrollspy çipleri).
  nav: {
    aria: "Rapor bölümleri",
    offer: "Sunduklarımız",
    control: "Kontrol",
    providers: "Sağlayıcılar",
    roster: "Kadro",
    prompts: "İstemler",
    pipeline: "Derin Münazara",
    turnDemo: "Tur örneği",
    cost: "Maliyet",
    stack: "Teknoloji",
  },
  copyLink: {
    title: "Bu bölüme doğrudan bağlantıyı kopyala",
    copied: "Bağlantı kopyalandı",
  },

  // 1 · Sunduklarımız
  offer: {
    title: "1 · Sunduklarımız",
    debate: {
      heading: "🥊 Münazara Modu",
      body: "İki yapay zekâ modeli, konunuzun karşıt taraflarını 3–7 sabit tur boyunca savunur — açılışlar, karşı argümanlar, kapanışlar. Yarışmacıları, üslubu, tempoyu ve uzunluğu siz seçersiniz.",
    },
    judge: {
      heading: "⚖️ Yapay Zekâ Hakem",
      body: "İsteğe bağlı üçüncü bir model, biten maçı kör değerlendirir — özet, en güçlü ve en zayıf argümanlar, yarışmacı başına puanlar ve net bir kazanan. Uygulama tarafsız bir hakemi otomatik seçer veya siz birini seçersiniz.",
    },
    deep: {
      heading: "🌐 Derin Münazara",
      body: "Her tur canlı bir web aramasına dayanır. Yarışmacılar gerçek kaynakları [n] işaretleriyle alıntılar ve kaynak gösterir; bunlar açılır kapanır bir kaynak listesinde görüntülenir. Sabit biçim: 3 tur, standart üslup, otomatik uzunluk.",
    },
    footer:
      "Tur başına token kullanımı, gecikme ve dürüst bir anlık maliyet her zaman ekranda — arcade görünüm arayüzdür, maliyet şeffaflığı ise verdiğimiz sözdür.",
  },

  // 2 · Maçı kim kontrol eder (etkileşimli akış diyagramı)
  control: {
    title: "2 · Maçı uygulama kontrol eder — asla modeller değil",
    hint: "O aşamada gerçekte ne olduğunu okumak için bir adıma tıklayın.",
    step1: {
      node: "Doğrula",
      title: "Kurulum iki kez doğrulanır",
      body: "Başlat düğmesi istemci tarafı doğrulamaya bağlıdır; sunucu ise her isteği bağımsız olarak yeniden doğrular (konu uzunluğu, enum değerleri, yarışmacı kimlikleri, tur üst sınırları, Derin Münazara limitleri) — sahte bir istek, arayüzün izin verdiğinden fazlasını satın alamaz.",
    },
    gate: {
      node: "Limitler",
      title: "Hız limitleri ve harcama tavanları, herhangi bir model çağrılmadan önce çalışır",
      body: "Ücretli her rota önce IP başına hız limitlerini ve küresel ile IP başına günlük harcama tavanlarını kontrol eder. Sağlayıcıya yalnızca bu kapıdan geçen istek ulaşır — limit arka ucu erişilemezse kontrol açık kalır ve ürün çalışmaya devam eder.",
    },
    step2: {
      node: "Planla",
      title: "Kimse konuşmadan önce sabit bir tur planı oluşturulur",
      body: (rounds: number, fighterTurns: number, judge: boolean) =>
        `Orkestratör, yapılandırmanızı en baştan eksiksiz bir tur listesine dönüştürür — kimin, hangi turda, hangi görevle konuşacağı. ${rounds} turla bu ${fighterTurns} yarışmacı turu${
          judge ? " artı bir hakem turu" : ""
        } eder. Modeller tur ekleyemez, atlayamaz veya sıralarını değiştiremez.`,
    },
    step3: {
      node: "Tek tur",
      title: "Tek bir API çağrısı tam olarak bir tur üretir",
      bodyPre: "Tarayıcı, oturum ve bir sonraki tur kimliğiyle ",
      bodyPost:
        " çağrısını yapar. Sunucu bunun gerçekten bir sonraki bekleyen tur olduğunu kontrol eder, istemleri oluşturur, sağlayıcıyı bir kez çağırır, maliyeti hesaplar ve tek bir mesaj döndürür. Döngü yok, ajan özerkliği yok.",
    },
    step4: {
      node: "Temellendir",
      title: "Derin Münazara, istem oluşturmadan önce arama yapar",
      body: "Derin turlarda sunucu, önce konunuz üzerinde bir web araması (Brave) yapar ve numaralandırılmış sonuçları, modelin izin verilen tek kanıtı olarak isteme enjekte eder. Gerçek bir kaynağa karşılık gelmeyen atıf işaretleri kaldırılır; modelin hiç alıntılamadığı kaynaklar iddia edilmez.",
    },
    step5: {
      node: "Hakem",
      title: "Hakem bir kez, en sonda çalışır",
      bodyPre: "Her tur tamamlandığında, ",
      bodyPost:
        " hakem modelinden katı bir JSON ister — özet, en güçlü/en zayıf argümanlar, puanlar, kazanan. Hakemi uygulama seçer (otomatik modda asla yarışmacılardan biri olmaz).",
    },
  },

  // 3 · Sağlayıcılar
  providers: {
    title: "3 · Sağlayıcılar ve verileriniz nereye gidiyor",
    colBackend: "Arka uç",
    colUsedFor: "Kullanım amacı",
    colKey: "Sunucu tarafı anahtar",
    colNotes: "Notlar",
    openaiUsed: "GPT-4o → GPT-5.5 yarışmacıları ve hakemleri",
    openaiNotes: "Chat Completions API, akış destekli",
    deepseekUsed: "DeepSeek V4 yarışmacıları ve hakemleri",
    deepseekNotes: "OpenAI uyumlu uç nokta",
    openrouterUsed: "Kendi markaları altında açık ağırlıklı yarışmacılar (Qwen, Llama, Kimi, …)",
    openrouterNotes: "$0 token maliyeti; hızlı turlar için gizli akıl yürütme sınırlandırılmıştır",
    braveUsed: "Derin Münazara web araştırması (tüm yarışmacılar)",
    braveNotes: "Sorgu olarak yalnızca münazara konusu gönderilir — asla transkript değil",
    securityNote:
      "🔒 Tüm anahtarlar yalnızca sunucuda yaşar (Vercel ortam değişkenleri). Tarayıcı yalnızca kendi API rotalarımızla konuşur; hiçbir anahtar veya sağlayıcı çağrısı istemci tarafında çalışmaz. (İstem şablonları bilinçli olarak herkese açıktır — onları 5. bölümde canlı olarak okuyorsunuz.) Takılıp çıkarılabilir bir arama kayıt defteri, arama motorunun (ve sorgu başına ücretinin) kodla değil yapılandırmayla değiştirilebileceği anlamına gelir.",
  },

  // 4 · Model kadrosu (etkileşimli yarışmacı kartları)
  roster: {
    title: "4 · Yarışmacı kadrosu (canlı katalog)",
    via: "üzerinden:",
    filterAll: "Tüm markalar",
    sortRating: "En yüksek puan",
    sortCatalog: "Katalog sırası",
    count: (n: number) => `${n} yarışmacı`,
    ratingTitle: "Münazara puanı",
    tapHint: "Tüm ayrıntılar ve gerçek token fiyatları için bir yarışmacıya tıklayın.",
    detailFamily: "Aile",
    detailBackend: "Arka uç",
    detailMaxOut: "Maks. çıktı",
    detailStreaming: "Akış",
    yes: "Evet",
    no: "Hayır",
    detailPricing: "Fiyat / 1M token",
    detailInput: "girdi",
    detailCached: "önbellekli",
    detailOutput: "çıktı",
    footerPre:
      "Puanlar, münazaraya uygunluk skorumuzdur (0–100). OpenAI listesi canlı ",
    footerPost: " uç noktasına karşı doğrulanır; OpenRouter kadrosu ise kataloglarının bir anlık görüntüsüdür.",
  },

  // 5 · İstem alanı
  playground: {
    title: "5 · İstemler — tam olarak ne gönderiyoruz",
    sticker: "CANLI",
    intro1: "Bu alan, sunucunun kullandığı istem oluşturucunun aynısını çağırır. Bir ayarı değiştirin ve istemin değişmesini izleyin — bu fark, ayarınızın modelin talimatlarına ",
    introEm: "tam olarak",
    intro2: " ne yaptığıdır.",
    knobTopic: "Konu — “Konu veya fikir:” satırı olur (ve Derin Münazara arama sorgusu)",
    knobToneLocked: "Üslup — Derin Münazara'da Ciddi'ye kilitli",
    knobTone: "Üslup — “Üslup:” talimat satırını yeniden yazar",
    knobCustomTone: "Özel üslup (temizlenir + 80 karakterle sınırlanır, koruyucu bir cümleye sarılır)",
    knobRoundsLocked: "Turlar — Derin Münazara'da 3'e kilitli",
    knobRounds: "Turlar — tur planının uzunluğunu ve her turun görevini belirler",
    roundsLabel: (n: number) => `${n} tur`,
    knobLengthLocked: "Uzunluk — sabit Derin şablonuyla değiştirilir (≈350–600 kelime, 1500 token)",
    knobLength: "Uzunluk — “Maksimum uzunluk:” satırını + sağlayıcının token üst sınırını belirler",
    lengthLabel: (id: string, tokens: number) => `${id} · ${tokens} token`,
    knobDeep: "Derin Münazara — araştırma ekini iliştirir + numaralandırılmış web kaynaklarını enjekte eder",
    deepOff: "Kapalı",
    deepOn: "🌐 Açık",
    timelineLabel:
      "Maç zaman çizelgesi — kimse konuşmadan önce oluşturulan deterministik tur planı. İstemini önizlemek için bir tura tıklayın",
    timelineJudge: "⚖️ Karar",
    timelineRound: (n: number) => `Tur ${n}`,
    copy: "📋 Kopyala",
    copied: "✓ Kopyalandı",
    tokensApprox: (n: number) => `≈ ${n} token`,
    systemLabel: (deep: boolean) =>
      `Sistem istemi — münazara modu${deep ? " + Derin Münazara eki" : ""}`,
    turnLabel: (round: number, roundLabel: string, model: string, deep: boolean) =>
      `Tur istemi — tur ${round} (“${roundLabel}”), ${model}${
        deep ? " — enjekte edilmiş web kaynaklarıyla" : ""
      }`,
    note: "Gerçek bir maçta “Önceki mesajlar” bölümü gerçek transkriptle dolar ve Derin turlarda yukarıdaki örnek kaynaklar, istek anında canlı Brave sonuçlarıyla değiştirilir. Yarışmacılar, modelin özel bir sıcaklık değerini kabul ettiği yerlerde 0.8 sıcaklık ister; akıl yürütme tarzı modeller (“-chat” olmayan GPT-5.x, o-serisi) bunu yok sayar ve sağlayıcı varsayılanıyla çalışır.",
    hideJudge: "▴ Gizle",
    showJudge: "▾ Göster",
    judgeToggleTail: " — hakem istemini",
    judgeLabel: "Hakem istemi — her sağlayıcının aynı şekilde ayrıştırması için katı JSON sözleşmesi",
  },

  // 6 · Derin Münazara hattı (etkileşimli akış diyagramı)
  pipeline: {
    title: "6 · Derin Münazara, adım adım",
    hint: "Ne yaptığını görmek için bir aşamaya tıklayın.",
    step1: {
      title: "Ara",
      body: "Sunucu, arama motorunu (Brave) konunuzla sorgular ve en iyi sonuçları numaralandırılmış kaynaklara dönüştürür: başlık, URL, alıntı. Motor, sonuç sayısı ve sorgu başına ücret kod değil, yapılandırmadır.",
    },
    step2: {
      title: "Sırala",
      body: "20 sonuçluk bir havuz, model görmeden önce yeniden sıralanır: akademik ve kurumsal kaynaklar (dergiler, .edu/.gov/.ac alan adları, resmi istatistikler) en üste yükselir, topluluk içeriği ve ansiklopediler (Wikipedia, Reddit, …) en dibe iner. Akademik kapsamı olmayan konular, motorun kendi sıralamasını sorunsuzca korur.",
    },
    step3: {
      title: "Temellendir",
      bodyPre: "Kaynaklar, modelin kanıt tabanı olarak tur istemine enjekte edilir; açıkça ",
      bodyEm: "güvenilmez veri, asla talimat değil",
      bodyPost: " olarak işaretlenir. Model, metin içinde [1], [2] şeklinde atıf yapmak zorundadır ve kaynak uyduramaz.",
    },
    step4: {
      title: "Doğrula",
      body: "Üretimden sonra sunucu, gerçek bir kaynağa karşılık gelmeyen her [n] işaretini kaldırır, ardından iliştirilmiş kaynak listesini yalnızca modelin gerçekten alıntıladıklarına daraltır — böylece bir karttaki \"Kaynaklar · 4\" her zaman gerçekten alıntılanmış dört sayfa demektir.",
    },
    step5: {
      title: "Açıkla",
      body: "Metin içindeki bir [n] çipine tıklamak, o kaynağın başlığını, alan adını, alıntısını ve dışa açılan bir bağlantısını içeren bir açılır pencere açar. Her kart ayrıca açılır kapanır bir kaynak listesi gösterir ve sonuç sayfası, maçtaki tüm alıntılanan kaynakları tekilleştirilmiş tek bir listede birleştirir.",
    },
  },

  // 7 · Gerçek bir tur
  turnDemo: {
    title: "7 · Gerçek bir Derin Münazara turu (gerçek bileşenle oluşturulmuştur)",
    intro:
      "Bu, gerçek bir geliştirme test turunun verileriyle canlı mesaj kartı bileşenidir (GPT-4o Mini, Derin Münazara açık, 5 kaynaktan 4'ü alıntılanmış — maliyet dökümüne ve atıf çiplerine dikkat edin):",
    cardSubtitle: "Hazırcevap · Lehte",
    cardRoundLabel: "Tur 1 · Açılış Argümanları",
    cardContent:
      "Sosyal medya platformlarında kullanıcı yaşını doğrulamak, giderek dijitalleşen bir dünyada çocukları korumak için **elzemdir** [1]. Araştırmalar, sosyal medya doğası gereği zararlı olmasa da kullanımının çocukların ruh sağlığına ve çevrim içi güvenliğine yönelik sorunları derinleştirebileceğini gösteriyor [2].\n\nFarklı yargı bölgelerindeki düzenleyiciler aynı sonuçta birleşiyor: beyan edilen doğum tarihleri bir koruma sağlamaz [3]. Gizliliği koruyan doğrulama — cihaz üzerinde tahmin, güvenilir sağlayıcılardan tokenlar — güvenlik ile anonimlik arasındaki ödünleşimin kader değil mühendislik olduğunu gösteriyor [4].",
  },

  // 8 · Maliyet modeli
  cost: {
    title: "8 · Maliyet modeli",
    intro:
      "Her mesaj kendi faturasını taşır: sağlayıcının bildirdiği token kullanımı × aşağıdaki model başına fiyat (yalnızca bir sağlayıcı kullanım bildirmediğinde metin uzunluğundan tahmin edilir — ~ ile işaretlenir). Sağlayıcının istem önbelleğinden sunulan girdi, indirimli ",
    introCached: "önbellekli",
    introTail:
      " oranıyla faturalandırılır, dolayısıyla rakam gerçek faturadır. Fiyatlar, asla arayüz kodunda değil, yapılandırılabilir tek bir tabloda yaşar.",
    colModel: "Model",
    colInput: "$ / 1M girdi",
    colCached: "$ / 1M önbellekli",
    colOutput: "$ / 1M çıktı",
    explorer: {
      filterPlaceholder: "Modele veya markaya göre filtrele…",
      count: (shown: number, total: number) => `${total} modelden ${shown} tanesi`,
      barNote: "Çubuklar, çıktı fiyatını logaritmik ölçekte karşılaştırır.",
      empty: "Bu filtreyle eşleşen model yok.",
      sortHint: "Sıralamak için bir fiyat sütununa tıklayın; katalog sırası için model sütununa tıklayın.",
    },
    note1: (input: string, output: string) =>
      `· Katalogdaki her model gerçek kullanımı faturalandırır; listede olmayan modeller 1M başına $${input}/$${output} değerine düşer.`,
    note2: (search: string) =>
      `· Derin Münazara aramaları uygulamanın arama motorunda çalışır (sorgu ücreti arena tarafından karşılanır); hibrit modda OpenRouter yerel araması tur başına ~$${search} ekler.`,
    note3:
      "· Standart, önbellekli ve çıktı oranları sağlayıcıların resmi sayfaları ve OpenRouter'ın canlı model listesine karşı doğrulanmıştır (Temmuz 2026). OpenRouter modelleri önbellek oranı listelemez (üst sağlayıcı önbellek faturalandırması değişkendir), bu yüzden maliyetleri hafifçe yüksek tahmin edilir. gpt-5.3-chat-latest'in yayınlanmış bir oranı yoktur ve en yakın doğrulanmış komşusunun fiyatıyla fiyatlandırılır (önbellek indirimi varsayılmaz).",
    note4:
      "· Önbellek farkında: sağlayıcı önbellek isabetli girdi tokenları bildirdiğinde (maliyet rozetinde bir ♻️), bunlar yukarıdaki önbellekli oranla faturalandırılır — yani maliyet, abartılı bir tahmin değil, gerçek faturadır.",
    note5: (price: string) =>
      `· İsteğe bağlı yarışmacı sesleri: varsayılan olarak ücretsiz tarayıcı konuşması; sunucu motoru (OpenAI konuşması) 1M karakter başına ≈$${price} faturalandırır — tamamen seslendirilmiş bir maç yaklaşık 13¢ — arena HUD'ında 🔊 satırı olarak gösterilir ve aynı günlük harcama tavanlarına sayılır.`,
    estimator: {
      title: "🎮 Bir maçın maliyetini tahmin et",
      intro:
        "Aynı fiyatlandırma tablosundan hesaplanan kaba bir üst sınır tahmini — gerçek maçlar, genellikle daha düşük olan sağlayıcı bildirimli kullanımı faturalandırır.",
      fighterA: "Yarışmacı A",
      fighterB: "Yarışmacı B",
      rounds: "Turlar",
      roundsLocked: "Turlar — Derin Münazara'da 3'e kilitli",
      length: "Yanıt uzunluğu",
      lengthLocked: "Uzunluk — sabit Derin şablonu (1500 token)",
      deep: "Derin Münazara",
      judgeKnob: "Yapay Zekâ Hakem",
      on: "Açık",
      off: "Kapalı",
      total: "Tahmini maç toplamı",
      turnsLine: (n: number) => `${n} yarışmacı turu`,
      judgeLine: (name: string) => `Hakem · ${name}`,
      disclaimer:
        "Tur başına token üst sınırının ~%70'inin kullanıldığını ve transkriptin her tur büyüdüğünü varsayar. Önbellek indirimleri gerçek faturaları daha da düşürür.",
    },
  },

  // 9 · Teknoloji yığını ve yapılandırma
  stack: {
    title: "9 · Teknoloji yığını ve yapılandırma",
    stackHeading: "Teknoloji yığını",
    stackItems: [
      "· Next.js 15 App Router + TypeScript (katı), Vercel'de yayında",
      "· Tailwind CSS tema belirteçleri — tek bir palet tüm arcade arayüzü yönetir",
      "· Framer Motion mikro animasyonlar; WebAudio synth ses efektleri + dosya geçersiz kılmaları",
      "· Katmanlı sunucu kodu: rotalar → orkestratör → istem oluşturucu → sağlayıcı kayıt defteri → fiyatlandırma",
      "· Tur başına son tarih bütçesi, her çağrıyı platformun 60 sn sınırı içinde tutar",
    ],
    configHeading: "Sunucu yapılandırması",
    badgeCore: "çekirdek",
    badgeOptional: "isteğe bağlı",
    configBackends: "model arka uçları",
    configBraveSearch: "Derin Münazara web araması",
    configSearchProvider: "arama motoru kimliği (varsayılan: brave)",
    configSearchCost: "HUD'da gösterilen sorgu başına ücret (varsayılan 0)",
    configDeepMode: "\"hybrid\", OpenRouter yarışmacılarını yerel :online aramasına yönlendirir",
    configSupabase: "oturum açma, maç geçmişi, topluluk merkezi — uygulama onsuz da tamamen çalışır",
    configLimits: "IP başına hız limitleri + küresel/IP başına günlük harcama tavanları (açık kalır)",
    configFooter:
      "Ölçeklendirme kolları ortam değişkenleridir — ücretli arama katmanları, alternatif motorlar ve arama yönlendirmesi bir dağıtım değil, bir panel değişikliği gerektirir.",
  },

  footer: "Canlı kod tabanından üretilmiştir · ",
  footerBadge: "Arcade arayüzü, ciddi zekâ",
};
