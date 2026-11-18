// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Görünüm: tema (Sistem / Açık / Koyu) ve koyu temada çizim alanının zemini.
//
// Bu dosya <head> içinde, stil dosyasından ÖNCE yüklenir ve <html>'e hemen
// data-theme (light|dark) ve data-paper (light|dark) yazar; böylece React çizmeden
// önceki ilk boyamada bile yanlış tema bir an görünmez. Renkler styles.css'te bu
// iki özniteliğe bağlı CSS değişkenleridir; bileşenler renk değil değişken adı kullanır.
//
// Tek doğruluk kaynağı kullanıcının tercihidir (Electron'da settings.json, tarayıcıda
// tercih kaydı). Electron'da ana süreç tercihi nativeTheme.themeSource'a yazar; bu da
// sayfadaki prefers-color-scheme sorgusunu belirler. Bu yüzden sayfa, tercihi henüz
// bilmeden de sorgudan doğru temayı okur ve sorgu değişince (Windows teması ya da
// tercih değişti) kendini günceller.
window.PT = window.PT || {};

(function (PT) {
  'use strict';

  PT.THEMES = ['system', 'light', 'dark'];
  // Koyu temada çizim alanı: 'dark' = temaya uygun koyu kâğıt, 'white' = her zaman beyaz.
  PT.DARK_CANVAS = ['dark', 'white'];

  PT.validTheme = function (v) {
    return PT.THEMES.indexOf(v) !== -1 ? v : 'system';
  };

  PT.validDarkCanvas = function (v) {
    return PT.DARK_CANVAS.indexOf(v) !== -1 ? v : 'dark';
  };

  // Tercih + sistemin koyu olup olmadığı -> uygulanacak tema.
  PT.resolveTheme = function (pref, systemDark) {
    var p = PT.validTheme(pref);
    if (p === 'system') return systemDark ? 'dark' : 'light';
    return p;
  };

  // Çizim alanının kâğıdı: yalnızca koyu temada ve "temaya uygun" seçiliyse koyu.
  PT.resolvePaper = function (theme, darkCanvas) {
    return theme === 'dark' && PT.validDarkCanvas(darkCanvas) === 'dark' ? 'dark' : 'light';
  };

  // Çizim renkleri. Açık kâğıtta eskisiyle birebir aynıdır (siyah mürekkep, beyaz
  // kâğıt); koyu kâğıtta tersine döner ama anlam korunur: etkilenmiş = mürekkeple
  // dolu, etkilenmemiş = kâğıt renginde. PowerPoint çıktısı bunları KULLANMAZ
  // (lib/pptx.js kendi sabit renklerini kullanır, slayt her zaman beyazdır).
  PT.INK = 'var(--pd-ink)';
  PT.PAPER = 'var(--pd-paper)';
  PT.INK_SOFT = 'var(--pd-ink-soft)';   // numaralar, notlar (eski #444)
  PT.INK_NOTE = 'var(--pd-ink-note)';   // çocuksuzluk nedeni (eski #333)
  PT.SEL = 'var(--pd-sel)';             // seçili sembolün çerçevesi
  PT.SEL_GLOW = 'var(--pd-sel-glow)';   // seçili sembolün hâlesi

  // ---- sayfa tarafı (Node'daki testlerde document yoktur) ----
  if (typeof document === 'undefined') return;

  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var current = { pref: 'system', darkCanvas: 'dark' };
  var listeners = [];

  // Tarayıcıda (geliştirme) tercih, React yüklenmeden okunabilsin diye doğrudan
  // localStorage'dan alınır; anahtar biçimi state/storage.js'teki PT.loadPref ile aynıdır.
  function readPref(name) {
    try {
      var v = window.localStorage.getItem('pedigree-tool:pref:' + name);
      return v == null ? null : JSON.parse(v);
    } catch (e) {
      return null;
    }
  }

  PT.appearance = function () {
    var theme = PT.resolveTheme(current.pref, !!(mq && mq.matches));
    return {
      pref: current.pref,
      darkCanvas: current.darkCanvas,
      theme: theme,
      paper: PT.resolvePaper(theme, current.darkCanvas),
    };
  };

  function paint() {
    var a = PT.appearance();
    var root = document.documentElement;
    if (root.getAttribute('data-theme') !== a.theme) root.setAttribute('data-theme', a.theme);
    if (root.getAttribute('data-paper') !== a.paper) root.setAttribute('data-paper', a.paper);
    listeners.slice().forEach(function (cb) { cb(a); });
  }

  // Tercihlerin bir kısmını ya da tamamını uygular (geçersiz değerler yok sayılır).
  PT.applyAppearance = function (next) {
    next = next || {};
    if (next.pref != null) current.pref = PT.validTheme(next.pref);
    if (next.darkCanvas != null) current.darkCanvas = PT.validDarkCanvas(next.darkCanvas);
    paint();
    return PT.appearance();
  };

  PT.onAppearance = function (cb) {
    listeners.push(cb);
    return function () {
      listeners = listeners.filter(function (x) { return x !== cb; });
    };
  };

  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', paint);
    else if (mq.addListener) mq.addListener(paint);
  }

  // İlk boyama. Electron'da tercih ana süreçtedir ve sorgu zaten ona göre ayarlıdır;
  // çizim alanı tercihi main.js'te, React çizmeden önce gelir.
  if (!window.pedigreeAPI) {
    current.pref = PT.validTheme(readPref('theme'));
    current.darkCanvas = PT.validDarkCanvas(readPref('darkCanvas'));
  }
  paint();
})(window.PT);
