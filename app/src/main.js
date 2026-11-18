// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Giriş noktası: dil belirlenir; koşullar henüz kabul edilmediyse önce ilk açılış
// ekranı, ardından uygulama çizilir.
(function (PT) {
  'use strict';

  var root = ReactDOM.createRoot(document.getElementById('root'));

  function showApp() {
    root.render(PT.h(window.React.StrictMode, null, PT.h(PT.App)));
  }

  function showFirstRun() {
    root.render(PT.h(PT.FirstRun, {
      native: PT.files.native,
      onCancel: function () { PT.files.quit(); },
      onAccept: function (opts) {
        PT.files.acceptTerms(opts).then(function () {
          PT.setLang(opts.lang);
          showApp();
        }, function () {
          // Kısayol oluşturulamasa bile uygulama açılsın.
          showApp();
        });
      },
    }));
  }

  // Çizim alanı tercihi (koyu / her zaman beyaz) ilk çizimden önce uygulanır; tema
  // kendisi theme.js'te, sayfa boyanmadan önce uygulanmıştır.
  Promise.all([
    PT.files.language(),
    PT.files.appearance().then(function (a) {
      PT.applyAppearance({ pref: a && a.theme, darkCanvas: a && a.darkCanvas });
    }, function () { /* görünüm okunamazsa varsayılan kalır */ }),
  ]).then(function (res) {
    PT.setLang(res[0]);
    return PT.files.needsFirstRun();
  }).then(function (needed) {
    if (needed) showFirstRun();
    else showApp();
  });
})(window.PT);
