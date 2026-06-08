/** Turkish — Auth. Must mirror ../en/auth.ts. */
export const auth = {
  /** Login page (src/app/login/page.tsx). */
  login: {
    loading: "Yükleniyor…",
    linkError: "Bu giriş bağlantısı işe yaramadı — lütfen tekrar deneyin.",
    notSetUpTitle: "Giriş henüz ayarlanmadı",
    notSetUpBody: "Hesaplar yakında geliyor. Hesabınız olmadan da münazaralara devam edebilirsiniz.",
    title: "Giriş yapın",
    subtitle:
      "Maçlarınızı, geçmişinizi ve istatistiklerinizi kaydedin. İsteğe bağlıdır — münazaralar hesapsız da çalışır.",
    sentTitle: "📬 Gelen kutunuzu kontrol edin",
    sentBefore: "Sihirli giriş bağlantısını şu adrese gönderdik: ",
    sentAfter: ".",
    emailLabel: "E-posta",
    emailPlaceholder: "siz@ornek.com",
    sending: "Gönderiliyor…",
    magicLinkCta: "✉️ Bana sihirli bir bağlantı gönderin",
    or: "veya",
    redirecting: "Yönlendiriliyor…",
    googleCta: "🔵 Google ile devam edin",
  },
  /** Header auth button + account menu (src/components/game/AuthButton.tsx). */
  button: {
    signIn: "Giriş yapın",
    accountFallback: "Hesap",
    accountAriaLabel: (email: string) => `Hesap: ${email}`,
    profile: "👤 Profil",
    signOut: "⏏ Çıkış yapın",
  },
};
