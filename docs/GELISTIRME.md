# Pedigree Tool — geliştirici notları (sürüm 1.7.3)

Genetik bölümü için pedigri (soy ağacı) çizim aracı. Erciyes Üniversitesi Tıbbi
Genetik Anabilim Dalı asistan doktorlarının katkılarıyla Eren Kılınç tarafından
tasarlanmıştır. Tamamen yereldir: hiçbir ağ bağlantısı kurmaz, hiçbir veri dışarı
gönderilmez. Arayüz Türkçe ve İngilizcedir.

## Dağıtım: kurulum programı yok

Uygulama klasör / zip olarak dağıtılır; `Pedigree Tool.exe`'ye çift tıklayınca açılır.

* **Neden:** Windows 11'de *Akıllı Uygulama Denetimi* açıkken imzasız ve "tanınmayan"
  exe dosyaları (kurulum programı, kaldırıcı, electron-builder'ın simge/sürüm yazdığı
  exe) doğrudan engellenir; atlatma düğmesi yoktur. Bu yüzden `package.json`'da
  `signAndEditExecutable: false` ayarlıdır: exe, resmi Electron dosyasıyla birebir
  aynı kalır ve Windows onu tanıyıp çalıştırır. (Bedeli: exe dosyasının kendi simgesi
  Electron simgesidir; pencere ve kısayollarda EK logosu görünür.)
* **İlk açılış:** dil seçimi (Türkçe/English), bilgilendirme ve kullanım koşulları,
  "Kabul ediyorum" ve isteğe bağlı masaüstü / Başlat menüsü kısayolu. Onay
  `%APPDATA%\Pedigree Tool\settings.json`'a yazılır. Koşullar metni `app/src/terms.js`;
  metin değişirse `PT.TERMS_VERSION` artırılır ve kullanıcı bir kez daha onaylar.
* **Klasör taşınırsa** kısayollar bozulur: **Yardım → Masaüstü kısayolu oluştur**.
* **Kaldırmak:** uygulama klasörünü ve kısayolları silmek yeterli.
* İleride kod imzalama sertifikası alınırsa kurulum programına dönülebilir (NSIS
  hedefi, `signAndEditExecutable` kaldırılır).

## Geliştirme

```bash
npm install
npm start
npm test
npm run dist
```

* `npm test` saf mantığı (yerleşim, kuşak hesabı, kardeş çizgisi, bağ kaldırma, dosya göçü,
  dil sözlükleri, koşul metni, tema çözümü ve ayar doğrulaması, koyu tema renk karşıtlığı)
  Node'da denetler.
* `npm run dist` → `release/win-unpacked/` (çalışan klasör) ve
  `release/Pedigree Tool-<sürüm>-win.zip` (paylaşmak için).
* Proje **OneDrive dışında** durmalı: OneDrive, `node_modules` ve paket dosyalarını
  senkronize ederken kilitliyor ve açılışı yavaşlatıyor.
* İlk açılışta pencere birkaç saniye boş (zemin renginde) kalabilir: Electron'un
  sayfa sürecinin başlaması güvenlik taraması nedeniyle bu makinede ~3 sn sürüyor
  (boş bir sayfada da aynı); uygulama betikleri toplam ~30 ms.

## Klasörler

```
electron/main.cjs         Ana süreç: pencere, menü, Hakkında, dil, ilk açılış, kısayollar
electron/preload.cjs      Renderer'a açılan dar köprü (contextIsolation açık)
electron/settings.cjs     Görünüm ayarlarının doğrulanması (tema, çizim alanı; beyaz liste)
build/icon.png, icon.ico  EK logosu (ico, kısayol simgesi olarak pakete eklenir)
app/index.html            Betik yükleme sırası burada
app/src/theme.js          Tema çözümü; <head>'de, stil dosyasından önce yüklenir
app/src/constants.js      Ölçüler, kimlik üretimi, veri şablonları
app/src/i18n.js           Türkçe / İngilizce sözlükler, PT.t()
app/src/terms.js          İlk açılıştaki bilgilendirme ve kullanım koşulları
app/src/lib/pedigree.js   Kuşak hesabı, ata araması, ilişki yardımcıları, yeni çocuğun konumu
app/src/lib/layout.js     Otomatik yerleşim, kardeş çizgisi geometrisi (ekran + PPTX), yazı ölçüleri
app/src/lib/pptx.js       Düzenlenebilir PowerPoint çıktısı
app/src/lib/files.js      Kaydet/Aç/dil/ilk açılış soyutlaması (Electron ↔ tarayıcı)
app/src/state/            Geri al-yinele, otomatik kayıt, dosya biçimi, tercihler
app/src/ui/               Bileşenler (sembol, çizgi, etiket, paneller, ilk açılış, ayarlar, logo)
app/vendor/               React 18, ReactDOM, PptxGenJS 4.0.1 yerel kopyaları
test/                     Node birim testleri (node:test)
```

## 1.7.0'da neler değişti

* **Koyu tema:** Ayarlar'da *Sistem* (varsayılan; Windows'un açık/koyu ayarını izler ve
  Windows'ta değişince hemen değişir), *Açık* ve *Koyu*. Ayrıca **Görünüm → Tema**
  menüsünden; menü ve pencere birbirini izler. Tercih `settings.json`'a (dil ile aynı
  dosya) yazılır; açılışta pencere doğru renkte açılır, beyaz bir an parlamaz.
* **Koyu temada çizim alanı:** varsayılan olarak koyu kâğıt üzerine açık mürekkep;
  etkilenmiş = mürekkeple dolu, etkilenmemiş = kâğıt renginde (anlam korunur).
  *Her zaman beyaz* seçilirse arayüz koyu kalır ama çizim alanı beyaz kâğıt / siyah
  mürekkeptir (PowerPoint çıktısıyla aynı görünüm).
* **PowerPoint çıktısı temadan bağımsızdır:** her zaman beyaz slayt, siyah çizim.
* **Ayarlar penceresi** (üst şeritteki dişli düğmesi, **Dosya → Ayarlar…**, Ctrl+,):
  tema, koyu temada çizim alanı, dil, ızgara noktaları, kişi numaraları. Değişiklikler
  hemen uygulanır; Esc, *Kapat* ya da pencere dışına tıklamak kapatır. Açıkken çizime
  dokunan kısayollar (Delete, Ctrl+Z, Ctrl+L...) çalışmaz.
* **Dil seçimi** üst şeritten Ayarlar'a taşındı; **Dil** menüsü yerinde duruyor.
* **Izgara noktaları** kapatılabilir; **Numaralar** düğmesinin durumu artık hatırlanır.
* Arayüzün bütün renkleri `styles.css`'te CSS değişkenleridir (açık değerler 1.6.0 ile
  aynı); klavyeyle gezinirken odak halkası her iki temada görünür.

## 1.6.0'da neler değişti

* **Kaydedince "•" işareti kalkar**; geri alarak kayıtlı hâle dönülünce de kalkar. Açık
  dosyanın adı pencere başlığında görünür.
* **Kaydetme / açma hataları gösterilir** (örn. klasör yok, dosya salt okunur), sistemin
  verdiği nedenle birlikte; dosya adı ve "•" işareti başarılıymış gibi değişmez.
* **Kaybedilecek bir şey yoksa sorulmaz:** "Yeni" ve "Aç" yalnızca çizim boş değilse ve
  kaydedilmemiş değişiklik varsa (ya da çizim hiç kaydedilmemişse) onay ister. Açık bir
  dosyada değişiklik varken pencere kapatılırsa *Kaydet / Kaydetme / Vazgeç* sorulur;
  adsız çizim sorulmadan kapanır, otomatik kayıt onu bir sonraki açılışta getirir.
* **"Kaydetme" gerçekten atar:** kapatırken "Kaydetme" seçilirse değişiklikler bir
  sonraki açılışta adsız çizim olarak geri gelmez; otomatik kayıtta dosyanın son
  kaydedilmiş hâli kalır.
* **Bozuk dosya:** JSON olmayan ya da bozulmuş bir dosya açılınca motorun İngilizce
  hata iletisi yerine "Bu dosya bir pedigri dosyası değil ya da bozulmuş." yazılır.
* **Yalnızca onaylı yollara yazılır:** ana süreç, diyalogsuz "Kaydet"i yalnızca bu
  oturumda kullanıcının Aç / Kaydet diyaloğunda seçtiği dosyalara yapar; başka bir
  yol gelirse kayıt diyaloğu açılır.
* **Son değişiklik kapanışta kaybolmaz:** bekleyen otomatik kayıt sayfa kapanırken yazılır.
* **Yazmak tek geri alma adımıdır:** "Mehmet" yazmak altı değil bir adımdır (ad, not,
  etiketler, başlık...). Başka alana geçmek ya da başka bir işlem yeni adım açar.
* **Yeni çocuk her zaman kardeşlerinin sağına** eklenir (ikizler ikisi birden, yan yana).
* **Bağ kaldırma:** sağ panelde her eş ilişkisinin altında "Eş bağını kaldır" (çiftin
  çocuklarının ebeveyn bağı da gider; onayda kaç çocuk olduğu yazar) ve seçili kişi için
  "Ebeveyn bağını kaldır". Kişiler silinmez, tek Ctrl+Z hepsini geri getirir.
* **Birden çok eş:** her ilişki eşin adıyla (ad yoksa II-3 gibi numarayla) ayrı bir
  blokta düzenlenir; boşanma, etiket ve çocuksuzluk ilişki başınadır.
* **Kardeş çizgisi çift başına bir kez çizilir** (ortak iniş çizgisi artık kalınlaşmıyor,
  tek tutamak). Ekran ve PPTX aynı geometri işlevini (`PT.sibshipGeometry`) kullanır.
* **"Değişiklikte otomatik" açıkken sürükleme** bitince düzen aynı geri alma adımında
  yeniden kurulur: kardeşi diğerinin ötesine sürüklemek sırayı değiştirir, dikey
  sürükleme satırına geri oturur. Kapalıyken serbest yerleşim eskisi gibidir.
* **Kuşak hesabı:** eşlerden biri diğerinin atasıysa (ör. baba ile kızı) ikisi aynı
  kuşağa çekilmez; iki kuşaklık aile artık V-VI diye numaralanmaz.
* **Döngü engeli:** bir kişi kendi torununun çocuğu olarak bağlanamaz.
* **Arayüz:** başlıkların büyük harfi dile göre (İngilizcede "CONNECTIONS", Türkçede
  "SEÇİLİ ÇİFTE"); 1000 px pencerede üst şerit kırpılmaz (gerekirse iki satıra geçer),
  düğme yazıları tek satırda kalır.

## Öne çıkan özellikler

* **Otomatik yerleşim** ("Otomatik düzenle", Ctrl+L): kuşaklar satırlara oturur,
  eşler aynı hizada yan yana durur, çocuklar ebeveyn çiftinin ortasına gelir,
  yazılar çakışmaz. "Değişiklikte otomatik" açıkken her ekleme/silme aynı adımda
  düzenlenir; tek Ctrl+Z hem işlemi hem düzeni geri alır.
* **Elle sürüklemede yapışma:** dikey olarak en yakın kuşak satırına, yatay
  olarak 10 px ızgaraya. Eş bağlarken ikinci kişi birincinin satırına iner.
* **Düzenlenebilir PPTX:** her sembol, çizgi ve yazı ayrı PowerPoint nesnesi.
  Tek dışa aktarma biçimi budur; çalışma "Kaydet" ile JSON olarak saklanır.
* **Fenotip bölmeleri:** 1 tam, 2 yarım, 3 eşit (karede dikey şerit, daire ve
  eşkenar dörtgende 120° dilim), 4 çeyrek, 5+ eşit dilim.
* **NSGC sembolleri:** etkilenmiş, taşıyıcı, ölmüş, proband, gebelik, ölü doğum,
  evlat edinme, abortus (SAB/TOP/ECT), MZ/DZ ikiz, akraba evliliği, boşanma,
  çocuksuzluk/infertilite, toplu sembol ("5", "n").

## Kısayollar

| Kısayol | İşlev |
|---|---|
| Ctrl+N / Ctrl+O / Ctrl+S / Ctrl+Shift+S | Yeni / Aç / Kaydet / Farklı kaydet |
| Ctrl+Z / Ctrl+Y | Geri al / yinele |
| Ctrl+L | Otomatik düzenle |
| Ctrl+0 | Ekrana sığdır |
| Ctrl+, | Ayarlar |
| Ctrl++ / Ctrl+− | Yakınlaştır / uzaklaştır |
| Delete | Seçiliyi sil |
| Esc | Seçimi temizle |
| Ctrl+tık | Çoklu seçim |

## Bilinmesi gerekenler

* **Hasta verisi**: çizim `localStorage`'a şifresiz otomatik kaydedilir
  (`pedigree-tool:autosave:v2`) ve uygulama açılınca geri yüklenir. Paylaşılan
  bir makinede "Yeni" ile temizleyin.
* **Koyu tema ve Windows'un kendi parçaları:** tema, Windows'un izin verdiği yerel öğelere
  de iletilir (`nativeTheme`), ancak pencerenin üstündeki **menü çubuğu** (Dosya, Düzen...)
  ve Windows'un ileti kutuları (kaydetme sorusu, Hakkında) Windows'un kendi çizimidir;
  koyu temada açık renkli kalabilirler.
* Tarayıcıda (geliştirme sırasında, Electron dışında) tema tercihi `localStorage`'a yazılır.
* Kullanım koşulları metni bir taslaktır; hukuki bağlayıcılığı için bir hukukçuya
  gözden geçirtilmesi önerilir.
* **Kuşaklar arası birleşmeler (bilinen sınırlama):** ata ile torunu arasındaki birleşme
  (ör. baba ile kızı) doğru kuşaklarda gösterilir; eş çizgisi iki sembol arasında eğik
  çizilir. Ancak ata-torun olmayan farklı kuşaklardan iki kişinin birleşmesinde (ör. amca
  ile yeğeni) eşler hâlâ aynı kuşağa çekilir: amca, yeğeninin satırına iner ve kuşak
  numarası buna göre değişir. Bunun genel bir çözümü yerleşim algoritmasının yeniden
  tasarlanmasını gerektirir. Ata-torun birleşmesinde ikinci çiftin iniş çizgisi ilk
  çiftinkiyle aynı dikeye düşebilir (çocuk ilk çifte aitmiş gibi okunur); "Değişiklikte
  otomatik"i kapatıp sembollerden birini yana kaydırmak çizgileri ayırır.

## Lisans

Copyright (c) 2026 Eren Kılınç. Erciyes Üniversitesi Tıbbi Genetik Anabilim Dalı asistan
doktorlarının katkılarıyla geliştirilmiştir.

Pedigree Tool özgür yazılımdır; GNU Genel Kamu Lisansı sürüm 3 ya da (tercihinize göre)
daha sonraki bir sürümü (GPL-3.0-or-later) ile lisanslıdır. Kullanabilir, değiştirebilir ve
yeniden dağıtabilirsiniz; değiştirilmiş sürümler aynı lisansla ve kaynak koduyla birlikte
dağıtılmalı, telif ve yazar bildirimleri korunmalıdır. Yazılım hiçbir garanti olmaksızın
"olduğu gibi" sunulur. Tam metin: `LICENSE`. Üçüncü taraf bileşenler (Electron, React,
PptxGenJS; MIT): `THIRD-PARTY-NOTICES.txt`.
