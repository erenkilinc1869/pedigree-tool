// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Otomatik kayıt (localStorage) ve dosya biçimi.
// Dosyaya her zaman formatVersion yazılır; eski (sürümsüz) dosyalar okunurken
// v1 kabul edilip yeni alanlarla tamamlanır.
(function (PT) {
  'use strict';

  var KEY = 'pedigree-tool:autosave:v2';
  var OLD_KEY = 'pedigree-tool:autosave:v1';

  // Eksik alanları doldurarak her sürümden gelen veriyi tek bir şekle getirir.
  PT.normalize = function (raw) {
    raw = raw || {};
    var base = PT.clone(PT.EMPTY_STATE);
    return {
      meta: Object.assign({ title: '' }, raw.meta || {}),
      individuals: (raw.individuals || []).map(function (p) {
        // 1.4.0'da doğum/ölüm yılı kaldırıldı; eski dosyalardaki yıllar görünmeyen
        // kişisel veri olarak taşınmasın diye okunurken atılır.
        p = Object.assign({}, p);
        delete p.birthYear;
        delete p.deathYear;
        return Object.assign({
          phenotypes: [], note: '', noteSize: 10,
          isDeceased: false, isProband: false, isAffected: false, isCarrier: false,
          isPregnancy: false, isStillbirth: false, isAdopted: false,
          pregnancyEnd: '', countLabel: '',
        }, p);
      }),
      relationships: (raw.relationships || []).map(function (r) {
        if (r.type === 'parent-child') return r;
        return Object.assign({
          lineOffsetY: PT.DEFAULT_DROP, isDivorced: false, label: '',
          childless: '', childlessNote: '',
        }, r);
      }),
      labels: raw.labels || base.labels,
      phenotypeDefs: raw.phenotypeDefs || base.phenotypeDefs,
    };
  };

  PT.toFileObject = function (state, appVersion) {
    return {
      app: PT.APP_NAME,
      appVersion: appVersion || '',
      formatVersion: PT.FORMAT_VERSION,
      savedAt: new Date().toISOString(),
      meta: state.meta,
      individuals: state.individuals,
      relationships: state.relationships,
      labels: state.labels,
      phenotypeDefs: state.phenotypeDefs,
    };
  };

  // Dosyadan okunan nesneyi doğrular ve uygulamanın iç şekline çevirir.
  PT.fromFileObject = function (raw) {
    if (!raw || typeof raw !== 'object') throw new Error(PT.t('msg.readFail'));
    if (!Array.isArray(raw.individuals) || !Array.isArray(raw.relationships)) {
      throw new Error(PT.t('msg.invalidFile'));
    }
    if (raw.formatVersion && raw.formatVersion > PT.FORMAT_VERSION) {
      throw new Error(PT.t('msg.newerFile', { v: raw.formatVersion }));
    }
    return PT.normalize(raw);
  };

  // Dosya metni -> doğrulanmış durum. JSON olarak okunamayan metinde motorun
  // İngilizce hata iletisi ("Expected property name...") kullanıcıya gitmesin diye
  // çevrilmiş bir ileti fırlatılır; diğer durumlar fromFileObject'in iletileridir.
  PT.parseFileText = function (text) {
    var raw;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      throw new Error(PT.t('msg.notPedigree'));
    }
    return PT.fromFileObject(raw);
  };

  PT.loadAutosave = function () {
    try {
      var raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY);
      if (!raw) return PT.clone(PT.EMPTY_STATE);
      return PT.normalize(JSON.parse(raw));
    } catch (e) {
      return PT.clone(PT.EMPTY_STATE);
    }
  };

  PT.saveAutosave = function (state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* kota dolu olabilir */ }
  };

  // Kullanıcı tercihleri (dosyaya değil bu bilgisayara ait).
  PT.loadPref = function (name, fallback) {
    try {
      var v = localStorage.getItem('pedigree-tool:pref:' + name);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  };

  PT.savePref = function (name, value) {
    try { localStorage.setItem('pedigree-tool:pref:' + name, JSON.stringify(value)); } catch (e) { /* yok say */ }
  };

  PT.clearAutosave = function () {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(OLD_KEY);
    } catch (e) { /* yok say */ }
  };
})(window.PT);
