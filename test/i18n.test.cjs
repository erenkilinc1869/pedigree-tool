// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadLogic } = require('./load.cjs');

const PT = loadLogic();

test('iki dilin anahtarları birebir aynı', () => {
  const tr = Object.keys(PT.I18N.tr).sort();
  const en = Object.keys(PT.I18N.en).sort();
  assert.deepEqual(tr.filter((k) => !en.includes(k)), [], 'İngilizcede eksik');
  assert.deepEqual(en.filter((k) => !tr.includes(k)), [], 'Türkçede eksik');
});

test('koddaki her PT.t anahtarı sözlükte var', () => {
  const root = path.join(__dirname, '..', 'app', 'src');
  const files = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.js')) files.push(p);
    }
  })(root);
  const missing = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    // Yalnızca tam dize anahtarları: t('grp.add') ya da t('msg.x', {...}).
    for (const m of src.matchAll(/\bt\('([a-zA-Z0-9.]+)'\s*[,)]/g)) {
      if (!(m[1] in PT.I18N.tr)) missing.push(path.basename(f) + ': ' + m[1]);
    }
  }
  // Durum düğmeleri anahtarı birleştirerek kurar: st.<durum> ve st.<durum>Tip.
  for (const s of ['deceased', 'proband', 'affected', 'carrier', 'pregnancy', 'stillbirth', 'adopted']) {
    for (const k of ['st.' + s, 'st.' + s + 'Tip']) if (!(k in PT.I18N.tr)) missing.push(k);
  }
  assert.deepEqual(missing, []);
});

test('ilk açılış metni iki dilde, yazar ve Erciyes katkısıyla', () => {
  assert.ok(Number.isInteger(PT.TERMS_VERSION) && PT.TERMS_VERSION >= 1);
  for (const l of ['tr', 'en']) {
    const t = PT.TERMS[l];
    assert.ok(t.includes('Eren Kılınç'), l + ': yazar yok');
    assert.ok(t.includes('Erciyes'), l + ': Erciyes katkısı yok');
    assert.ok(t.includes('KVKK'), l + ': KVKK yok');
  }
  assert.ok(PT.TERMS.tr.includes('asistan doktorlarının katkılarıyla'));
});

test('dil değişince metinler değişir, değişkenler yerine konur', () => {
  PT.setLang('en');
  assert.equal(PT.t('top.save'), 'Save');
  assert.equal(PT.t('msg.delSelDetail', { n: 3 }), '3 item(s) will be deleted.');
  PT.setLang('tr');
  assert.equal(PT.t('top.save'), 'Kaydet');
  assert.equal(PT.t('msg.delSelDetail', { n: 3 }), '3 öğe silinecek.');
  assert.equal(PT.setLang('fr'), 'tr', 'bilinmeyen dil Türkçeye düşmeli');
});
