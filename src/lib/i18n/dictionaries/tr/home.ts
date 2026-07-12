/** Turkish — Home / landing page. Must mirror ../en/home.ts. */
export const home = {
  /** Page <title> / <meta description> (server-rendered in layout). */
  meta: {
    title: "Debator — Fikirleriniz İçin Yapay Zekâları Dövüştürün",
    description:
      "İki yapay zekâ modelinin konunuzu yapılandırılmış turlar hâlinde münazara ettiği, kararı bir yapay zekâ hakemin verdiği oyunlaştırılmış bir arena.",
  },

  hero: {
    badge: "🕹️ Yapay Zekâya Karşı Yapay Zekâ",
    titleLine1: "Yapay Zekâları Dövüştürün",
    titleLine2: "Fikirleriniz İçin",
    // Hero paragraph rendered with a <strong> span in the middle.
    introBefore: "Debator, ",
    introStrong: "iki yapay zekâ modelinin konunuzu tartıştığı",
    introAfter:
      " bir tarayıcı arenasıdır; üstelik yapılandırılmış turlar hâlinde. Bir yapay zekâ hakem maçı puanlar ve kazananı ilan eder.",
  },

  cta: {
    useDebator: "🎮 Debator'ı Kullanın",
    seeDemo: "🎬 Demoyu İzleyin",
  },

  /** "Demoyu İzleyin" tam ekran tekrarı (src/components/demo/DemoOverlay). */
  demo: {
    aria: "Debator demosu — gerçek, 30 saniyelik bir maç kaydı",
    watching: "🎬 Gerçek maç · canlı kaydedildi",
    close: "Demoyu kapat",
    skip: "Atla ⏭",
    replay: "↺ Tekrar oynat",
    yourTurn: "Sıra sizde.",
    yourTurnSub: "Kendi maçınızı kurun — istediğiniz konu, istediğiniz iki yapay zekâ, karar dâhil.",
    cta: "Debator'ı Kullanın",
  },

  howItWorks: {
    heading: "Nasıl çalışır?",
    steps: [
      {
        title: "Bir konu ve iki yarışmacı seçin",
        body: "Herhangi bir soru, iddia ya da fikir — sonra arcade karakterleri gibi iki yapay zekâ modeli seçin.",
      },
      {
        title: "Kuralları belirleyin",
        body: "3 tur, bir üslup, isteğe bağlı Derin Münazara ve bir yapay zekâ hakem.",
      },
      {
        title: "Maçı izleyin",
        body: "Arena her turu canlı oynatır — kararı ise sonunda hakem verir.",
      },
    ],
  },

  examples: {
    heading: "Arenaya ne atabilirsiniz?",
    subtitle:
      "Tartışılabilir her şey — sorular, çarpıcı görüşler, hatta kendi planlarınız:",
  },
};
