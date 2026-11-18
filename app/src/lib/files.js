// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Dosya katmanı. Electron'da gerçek "Farklı Kaydet / Aç" diyalogları kullanılır;
// tarayıcıda (geliştirme sırasında) indirme bağlantısına düşer.
(function (PT) {
  'use strict';

  var api = window.pedigreeAPI || null;

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function b64ToBlob(b64, type) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: type || 'application/octet-stream' });
  }

  PT.files = {
    native: !!api,

    // filePath verilirse diyalog açılmadan üzerine yazar ("Kaydet").
    saveText: function (defaultName, data, filters, filePath) {
      if (api) return api.saveText({ defaultPath: defaultName, filters: filters, data: data, filePath: filePath || null });
      download(new Blob([data], { type: 'text/plain;charset=utf-8' }), defaultName);
      return Promise.resolve({ canceled: false, filePath: null });
    },

    saveBase64: function (defaultName, base64, filters, mime) {
      if (api) return api.saveBase64({ defaultPath: defaultName, filters: filters, base64: base64 });
      download(b64ToBlob(base64, mime), defaultName);
      return Promise.resolve({ canceled: false, filePath: null });
    },

    openText: function () {
      if (api) return api.openText();
      return new Promise(function (resolve) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = function () {
          var file = input.files && input.files[0];
          if (!file) return resolve({ canceled: true });
          var reader = new FileReader();
          reader.onload = function (e) {
            resolve({ canceled: false, filePath: null, fileName: file.name, data: e.target.result });
          };
          reader.readAsText(file);
        };
        input.click();
      });
    },

    confirm: function (message, detail) {
      if (api) return api.confirm({ message: message, detail: detail || '' });
      return Promise.resolve(window.confirm(message + (detail ? '\n\n' + detail : '')));
    },

    version: function () {
      if (api) return api.getVersion();
      return Promise.resolve('1.7.2');
    },

    // Electron'da ana süreç karar verir (kullanıcının seçtiği dil > sistem dili).
    language: function () {
      if (api) return api.getLanguage();
      var saved = PT.loadPref('lang', null);
      if (saved) return Promise.resolve(saved);
      var nav = (navigator.language || '').toLowerCase();
      return Promise.resolve(nav.indexOf('tr') === 0 ? 'tr' : 'en');
    },

    setLanguage: function (l) {
      if (api) return api.setLanguage(l);
      PT.savePref('lang', l);
      return Promise.resolve(l);
    },

    // Görünüm tercihleri: { theme: 'system'|'light'|'dark', darkCanvas: 'dark'|'white' }.
    // Electron'da settings.json'da (ana süreç doğrular), tarayıcıda tercih kaydında.
    appearance: function () {
      if (api && api.getAppearance) return api.getAppearance();
      return Promise.resolve({
        theme: PT.validTheme(PT.loadPref('theme', 'system')),
        darkCanvas: PT.validDarkCanvas(PT.loadPref('darkCanvas', 'dark')),
      });
    },

    // Yalnızca verilen alanları kaydeder; geçersiz değerler yazılmaz.
    setAppearance: function (patch) {
      patch = patch || {};
      if (api && api.setAppearance) return api.setAppearance(patch);
      if (patch.theme != null && PT.THEMES.indexOf(patch.theme) !== -1) PT.savePref('theme', patch.theme);
      if (patch.darkCanvas != null && PT.DARK_CANVAS.indexOf(patch.darkCanvas) !== -1) PT.savePref('darkCanvas', patch.darkCanvas);
      return PT.files.appearance();
    },

    // İlk açılış: koşulların bu sürümü henüz kabul edilmediyse true.
    needsFirstRun: function () {
      if (api) return api.needsFirstRun(PT.TERMS_VERSION);
      return Promise.resolve(PT.loadPref('termsAccepted', 0) !== PT.TERMS_VERSION);
    },

    // Kabul: dili ve onayı kaydeder, istenen kısayolları oluşturur.
    acceptTerms: function (opts) {
      var o = Object.assign({ termsVersion: PT.TERMS_VERSION }, opts);
      if (api) return api.acceptTerms(o);
      PT.savePref('termsAccepted', PT.TERMS_VERSION);
      PT.savePref('lang', o.lang);
      return Promise.resolve({ shortcuts: [] });
    },

    // Ana süreç, kaydedilmemiş değişikliği olan açık dosyada kapatmadan önce sorar.
    setDocState: function (st) {
      if (api && api.setDocState) api.setDocState(st);
    },

    // "Kapatmadan önce kaydet" başarılı olunca pencereyi kapatır.
    closeWindow: function () {
      if (api && api.closeWindow) return api.closeWindow();
      return Promise.resolve();
    },

    quit: function () {
      if (api) return api.quit();
      window.close();
      return Promise.resolve();
    },

    onMenu: function (cb) {
      if (api) api.onMenu(cb);
    },
  };
})(window.PT);
