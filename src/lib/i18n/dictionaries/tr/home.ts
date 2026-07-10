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
    trySample: "🎲 Örnek Deneyin",
    // Explainer line with two <strong> spans.
    noteUseStrong: "Debator'ı Kullanın",
    noteMiddle: " kendi maçınızı kurar · ",
    noteSampleStrong: "Örnek Deneyin",
    noteAfter:
      " ise rastgele bir demo maç başlatır — her seferinde yeni konu, yeni yarışmacılar ve yeni kurallar.",
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
        body: "3 / 5 / 7 tur, bir üslup, isteğe bağlı Derin Münazara ve bir yapay zekâ hakem.",
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
