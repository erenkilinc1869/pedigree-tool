// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// İlk açılışta gösterilen bilgilendirme ve kullanım koşulları.
// Metin değişirse PT.TERMS_VERSION artırılır; kullanıcı yeni metni bir kez daha onaylar.
(function (PT) {
  'use strict';

  PT.TERMS_VERSION = 2;

  PT.TERMS = {
    tr: [
      'Bu yazılım, Erciyes Üniversitesi Tıbbi Genetik Anabilim Dalı asistan doktorlarının katkılarıyla ' +
        'Eren Kılınç tarafından tasarlanmış ve geliştirilmiştir.',
      '© 2026 Eren Kılınç. Özgür yazılımdır; GNU Genel Kamu Lisansı sürüm 3 ya da sonrası (GPL-3.0-or-later) ile lisanslıdır.',
      '',
      'NE İŞE YARAR',
      'Pedigree Tool; genetik danışmanlık, eğitim ve araştırma amacıyla soy ağacı (pedigri) çizmek için ' +
        'geliştirilmiş bir masaüstü uygulamasıdır. Semboller uluslararası standart pedigri gösterimine (NSGC) göre çizilir.',
      '',
      'KISACA KULLANIM',
      '• Sol panelden kişi ekleyin; iki kişiyi seçip "Eş olarak bağla" ile bağlayın, çift seçiliyken çocuk ekleyin.',
      '• "Otomatik düzenle" (Ctrl+L) kuşakları satırlara hizalar ve çocukları ebeveynlerin ortasına yerleştirir.',
      '• Kişinin durumunu (etkilenmiş, taşıyıcı, proband vb.) ve fenotiplerini sağ panelden işaretleyin.',
      '• Çalışmanızı "Kaydet" ile dosyaya kaydedin; sunum için "PPTX" ile düzenlenebilir PowerPoint slaytı alın.',
      '• Arayüz dili Dil menüsünden değiştirilebilir.',
      '',
      'VERİ GİZLİLİĞİ',
      'Uygulama tamamen bu bilgisayarda çalışır; internet bağlantısı kurmaz ve hiçbir veriyi dışarı göndermez. ' +
        'Çizimler, kaydettiğiniz dosyalarda ve bu bilgisayardaki kullanıcı profilinde (otomatik kayıt) tutulur.',
      'Hasta bilgilerinin 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve kurumunuzun kurallarına uygun ' +
        'işlenmesinden kullanıcı sorumludur. Mümkün olduğunca ad yerine anonim kod kullanmanız önerilir.',
      '',
      'SORUMLULUK REDDİ',
      'Pedigree Tool bir tıbbi cihaz değildir ve tanı koymak ya da klinik karar vermek amacıyla tek başına ' +
        'kullanılamaz. Çizimlerin ve bunlara dayanan yorumların doğruluğu yetkin bir uzman tarafından kontrol edilmelidir.',
      'Yazılım "olduğu gibi" sağlanır; doğruluğu, kesintisiz çalışması veya belirli bir amaca uygunluğu konusunda ' +
        'açık ya da örtük hiçbir garanti verilmez. Yazılımın kullanımından doğabilecek doğrudan veya dolaylı ' +
        'zararlardan yazar sorumlu tutulamaz.',
      '',
      'LİSANS',
      'Bu program özgür yazılımdır: Free Software Foundation tarafından yayımlanan GNU Genel Kamu Lisansı\'nın ' +
        '3. sürümü ya da (tercihinize göre) daha sonraki bir sürümünün koşulları altında kullanabilir, ' +
        'değiştirebilir ve yeniden dağıtabilirsiniz. Değiştirilmiş sürümler de aynı lisansla ve kaynak koduyla ' +
        'birlikte dağıtılmalı, telif ve yazar bildirimleri korunmalıdır. Lisansın tam metni program klasöründeki ' +
        'LICENSE.txt dosyasındadır.',
      '',
      'ÜÇÜNCÜ TARAF BİLEŞENLER',
      'Uygulama; Electron, React ve PptxGenJS açık kaynak bileşenlerini içerir. Bu bileşenler MIT lisansıyla ' +
        'dağıtılır ve kendi lisans koşullarına tabidir (bkz. THIRD-PARTY-NOTICES.txt).',
    ].join('\n'),

    en: [
      'This software was designed and developed by Eren Kılınç, with contributions from the resident physicians ' +
        'of the Department of Medical Genetics, Erciyes University.',
      '© 2026 Eren Kılınç. Free software, licensed under the GNU General Public License version 3 or later (GPL-3.0-or-later).',
      '',
      'WHAT IT DOES',
      'Pedigree Tool is a desktop application for drawing family trees (pedigrees) for genetic counselling, ' +
        'teaching and research. Symbols follow the international standard pedigree nomenclature (NSGC).',
      '',
      'QUICK START',
      '• Add people from the left panel; select two people and use "Link as partners", then add children while the couple is selected.',
      '• "Auto-arrange" (Ctrl+L) aligns generations into rows and centres children under their parents.',
      '• Mark each person\'s status (affected, carrier, proband, etc.) and phenotypes in the right panel.',
      '• Save your work to a file with "Save"; use "PPTX" to get an editable PowerPoint slide for presentations.',
      '• The interface language can be changed from the Language menu.',
      '',
      'DATA PRIVACY',
      'The application runs entirely on this computer; it makes no internet connection and sends no data anywhere. ' +
        'Drawings are kept in the files you save and in your user profile on this computer (autosave).',
      'You are responsible for handling patient information in line with applicable data protection law (such as ' +
        'the Turkish Personal Data Protection Law No. 6698, KVKK, or the GDPR) and your institution\'s rules. ' +
        'Using anonymous codes instead of names is recommended wherever possible.',
      '',
      'DISCLAIMER',
      'Pedigree Tool is not a medical device and must not be used on its own to make a diagnosis or a clinical ' +
        'decision. The accuracy of drawings and of any interpretation based on them must be checked by a qualified professional.',
      'The software is provided "as is", without warranty of any kind, express or implied, including accuracy, ' +
        'uninterrupted operation or fitness for a particular purpose. The author cannot be held liable for any ' +
        'direct or indirect damage arising from its use.',
      '',
      'LICENCE',
      'This program is free software: you can use, modify and redistribute it under the terms of the GNU General ' +
        'Public License as published by the Free Software Foundation, either version 3 of the License or (at your ' +
        'option) any later version. Modified versions must be distributed under the same licence together with ' +
        'their source code, and copyright and author notices must be kept. The full licence text is in the ' +
        'LICENSE.txt file in the program folder.',
      '',
      'THIRD-PARTY COMPONENTS',
      'The application includes the open-source components Electron, React and PptxGenJS. These are distributed ' +
        'under the MIT licence and are subject to their own licence terms (see THIRD-PARTY-NOTICES.txt).',
    ].join('\n'),
  };
})(window.PT);
