/** Turkish — Legal. Must mirror ../en/legal.ts (formal "siz"). */
export const legal = {
  about: "Hakkında",
  terms: "Kullanım Şartları",
  privacy: "Gizlilik",
  contact: "İletişim",
  disclaimer: "Yapay zekâ üretimi içerik — hatalı veya yanlı olabilir. Profesyonel tavsiye değildir.",
  lastUpdated: "Son güncelleme",
  backHome: "← Ana sayfaya dön",
  identity: {
    operatedBy: "İşleten",
    governedBy: "Şu yargı yetkisinin yasalarına tabidir:",
    contact: "İletişim",
  },
  contactPage: {
    title: "İletişim",
    intro:
      "Sorular, veri talepleri (erişim, dışa aktarma veya silme) ya da içerik bildirimleri için ekibe aşağıdaki adresten ulaşın.",
    reachUs: "Bize ulaşın:",
    operatedBy: "Debator'ı işleten:",
  },
  aboutPage: {
    title: "Debator Hakkında",
    intro:
      "Debator, iki yapay zekâ modelinin konunuzu yapılandırılmış turlar halinde münazara ettiği; maliyetlerin görünür olduğu ve isteğe bağlı bir hakemin bulunduğu arcade tarzı bir arenadır.",
    sections: [
      { heading: "Arcade arayüzü, ciddi zekâ", body: "Görünüm eğlenceli bir tarayıcı mini oyunu; çıktı ise düşünceli ve yapılandırılmış kalır. Kimin konuşacağına, hangi turda olunduğuna, ne zaman biteceğine ve bir hakemin görünüp görünmeyeceğine modeller değil, uygulama karar verir." },
      { heading: "Bir maç nasıl işler", body: "Bir konu ve iki yarışmacı seçin, tur sayısını ve üslubu belirleyin, isterseniz bir hakem ekleyin. Her tur, katı bir istemle teker teker üretilir; böylece münazaralar asla sonsuza dek sürmez. Derin Münazara, kaynak gösterilen canlı web araştırması ekler." },
      { heading: "Modeller ve maliyet", body: "Yarışmacılar OpenAI, DeepSeek ve OpenRouter üzerinden sunulan açık ağırlıklı modellerden gelir. Her tur, token'larını ve tahmini maliyetini gösterir; toplam tutar her zaman ekrandadır." },
    ],
  },
  termsPage: {
    title: "Kullanım Şartları",
    intro:
      'Debator\'ı ("uygulama") kullanarak bu şartları kabul etmiş olursunuz. Kabul etmiyorsanız lütfen kullanmayın.',
    sections: [
      { heading: "1. Debator nedir", body: "Debator, üçüncü taraf yapay zekâ modelleri arasında yapılandırılmış münazaralar düzenleyen bir eğlence ve eğitim aracıdır. Olduğu gibi, kişisel kullanımınız için sunulur." },
      { heading: "2. Yapay zekâ üretimi içerik", body: "Tüm münazara turları ve kararlar üçüncü taraf yapay zekâ modelleri tarafından üretilir. Hatalı, yanlı, rahatsız edici veya uydurma olabilir ve görüşlerimizi yansıtmaz. Buradaki hiçbir şey profesyonel, hukuki, tıbbi, finansal ya da başka bir uzman tavsiyesi değildir — önemli her şeyi bağımsız olarak doğrulayın." },
      { heading: "3. Kabul edilebilir kullanım", body: "Debator'ı yasaları çiğnemek, zararlı veya saldırgan içerik üretmek, hizmeti aşırı yüklemek ya da hizmete saldırmak, tersine mühendislik yapmak veya erişimi yeniden satmak için kullanmayın. Hizmeti korumak için kullanımı sınırlayabilir, askıya alabilir ya da engelleyebiliriz." },
      { heading: "4. Sizin içeriğiniz", body: "Girdiğiniz konulardan siz sorumlusunuz. Konular, yanıt üretmek için üçüncü taraf yapay zekâ sağlayıcılarına (ve Derin Münazara'da bir web arama sağlayıcısına) gönderilir — onlarla paylaşmak istemeyeceğiniz gizli veya kişisel bilgileri girmeyin." },
      { heading: "5. Erişilebilirlik ve sınırlar", body: "Hizmet her an değişebilir, duraklayabilir veya sona erebilir ve maliyetleri denetlemek için kullanım sınırlandırılır. Kesintisiz çalışma, doğruluk ya da herhangi bir özelliğin çalışmaya devam edeceği garanti edilmez." },
      { heading: "6. Garanti vermeme ve sorumluluk", body: 'Debator hiçbir garanti olmaksızın "olduğu gibi" sunulur. Yasaların izin verdiği azami ölçüde, uygulamayı kullanmanızdan veya yapay zekâ çıktısına güvenmenizden doğan zararlardan sorumlu değiliz.' },
      { heading: "7. Geçerli hukuk", body: "Bu şartlar, kanunlar ihtilafı kurallarına bakılmaksızın, aşağıda belirtilen yargı yetkisinin yasalarına tabidir." },
      { heading: "8. Değişiklikler", body: "Bu şartları güncelleyebiliriz; değişiklikten sonra kullanmaya devam etmeniz kabul ettiğiniz anlamına gelir." },
      { heading: "9. İletişim", body: "Bu şartlarla ilgili sorularınız mı var? Aşağıda gösterilen iletişim adresinden bize ulaşın." },
    ],
  },
  privacyPage: {
    title: "Gizlilik Politikası",
    intro:
      "Bu politika, Debator'ın neleri topladığını ve bunları nasıl kullandığını açıklar. Mümkün olduğunca az veri toplamayı hedefliyoruz.",
    sections: [
      { heading: "1. Neleri topluyoruz", body: "Giriş yaparsanız: e-posta adresiniz ve kaydettiğiniz maç geçmişiniz (konular, seçilen modeller, kararlar ve kullanım/maliyet meta verileri). Giriş yapmazsanız münazaralar hesapsız çalışır ve bir profile kaydedilmez." },
      { heading: "2. Konular ve alt işleyiciler", body: "Gönderdiğiniz konular, münazarayı üreten yapay zekâ sağlayıcılarına — OpenAI, DeepSeek ve OpenRouter — ve Derin Münazara için Brave web arama API'sine gönderilir. Hesabınız varsa e-postanız ve kaydedilen maçlarınız, veritabanı ve barındırma sağlayıcılarımız Supabase ve Vercel'de saklanır. Bu sağlayıcıların her biri verileri kendi gizlilik politikasına göre işler ve bazıları ülkenizin dışında bulunur (örneğin Çin'deki DeepSeek)." },
      { heading: "3. Çerezler", body: "Yalnızca uygulamayı çalıştırmak için gereken çerezleri kullanırız: giriş yaptığınızda bir oturum (kimlik doğrulama) çerezi ve dil tercihinizi hatırlayan küçük bir çerez. Google ile ya da kimlik doğrulama sağlayıcımız (Supabase) ile giriş yapmak, oturum açma akışının bir parçası olarak kendi çerezlerini de ayarlayabilir. Reklam veya siteler arası takip çerezi kullanmayız." },
      { heading: "4. Kullanım verileri", body: "Hizmeti işletmek, kötüye kullanımı önlemek ve harcama sınırlarını uygulamak için istek başına kullanım ve maliyet meta verilerini (token, maliyet, zamanlama ve IP tabanlı kaba bir sayaç) kaydederiz." },
      { heading: "5. Saklama ve silme", body: "Kaydedilen maçlar, siz silene kadar saklanır. Profilinizden maçları tek tek silebilir, tüm verilerinizi JSON olarak dışa aktarabilir ve hesabınızı ve ona bağlı her şeyi kalıcı olarak silebilirsiniz. Ayrıca aşağıda gösterilen iletişim adresinden bize ulaşabilirsiniz." },
      { heading: "6. Haklarınız", body: "Verilerinize erişim, dışa aktarma veya silme talep edebilirsiniz. Yaşadığınız yere bağlı olarak GDPR veya KVKK gibi yasalar kapsamında ek haklarınız olabilir; bunları kullanmak için aşağıdaki adresten bize ulaşın." },
      { heading: "7. Değişiklikler ve iletişim", body: "Bu politikayı güncelleyebiliriz; önemli değişiklikler burada belirtilir. Sorularınız için aşağıda gösterilen iletişim adresinden bize ulaşın." },
    ],
  },
};
