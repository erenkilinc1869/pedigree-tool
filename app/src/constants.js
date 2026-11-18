// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Ortak sabitler ve küçük yardımcılar. Tüm dosyalar window.PT ad alanını paylaşır.
window.PT = window.PT || {};

(function (PT) {
  'use strict';

  PT.React = window.React;
  PT.h = window.React.createElement;

  // Çizim ölçüleri
  PT.SIZE = 50;          // sembol kutusu (kare/daire) kenarı
  PT.HALF = 25;
  PT.GEN_GAP = 150;      // kuşaklar arası dikey mesafe
  PT.SIB_GAP = 90;       // kardeşler arası yatay mesafe
  PT.DEFAULT_DROP = 40;  // eş çizgisinden kardeş çizgisine varsayılan iniş

  // Üç fenotipte daire/eşkenar dörtgen dilimlerinin başlangıç açısı (saat 3 = 0°,
  // saat yönünde): 150° → sol üst, sağ üst, alt olmak üzere üç eşit 120° dilim.
  PT.THIRDS_START_DEG = 150;

  PT.MIN_ZOOM = 0.15;
  PT.MAX_ZOOM = 4;

  PT.FORMAT_VERSION = 2;
  PT.APP_NAME = 'pedigree-tool';

  PT.EMPTY_STATE = {
    meta: { title: '' },
    individuals: [],
    relationships: [],
    labels: [],
    phenotypeDefs: [],
  };

  PT.uid = function () {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
  };

  PT.clamp = function (v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  };

  PT.clone = function (o) {
    return JSON.parse(JSON.stringify(o));
  };

  // Yeni kişi şablonu. Tek yerde tutulur ki alan eklemek kolay olsun.
  PT.newIndividual = function (gender, x, y) {
    return {
      id: PT.uid(),
      x: x, y: y,
      gender: gender,
      name: '',
      phenotypes: [],
      isDeceased: false,
      isProband: false,
      isAffected: false,
      isCarrier: false,
      isPregnancy: false,
      isStillbirth: false,
      isAdopted: false,
      pregnancyEnd: '',    // abortus için: '' (spontan, SAB) | 'top' | 'ectopic'
      countLabel: '',      // toplu sembol: "5" = 5 kişi, "n" = sayısı bilinmiyor
      note: '',
      noteSize: 10,
    };
  };

  PT.newMating = function (aId, bId, type) {
    return {
      id: PT.uid(),
      type: type || 'mating',
      partner1Id: aId,
      partner2Id: bId,
      lineOffsetY: PT.DEFAULT_DROP,
      isDivorced: false,
      label: '',
      childless: '',       // '' | 'none' (çocuk yok: tercih/bilinmiyor) | 'infertile'
      childlessNote: '',   // örn. "azospermi", "vazektomi"
    };
  };

  PT.newParentChild = function (matingId, childId) {
    return { id: PT.uid(), type: 'parent-child', partner1Id: matingId, childId: childId };
  };

  // Dosya adlarında güvenli olsun diye
  PT.slug = function (s, fallback) {
    var t = (s || '').trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_');
    return t || fallback;
  };
})(window.PT);
