// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadLogic } = require('./load.cjs');

const PT = loadLogic();

test('eski dosyalar yeni alanlarla tamamlanır', () => {
  const old = PT.fromFileObject({
    individuals: [{ id: 'a', gender: 'abortion', x: 0, y: 0 }],
    relationships: [
      { id: 'm', type: 'mating', partner1Id: 'a', partner2Id: 'a' },
      { id: 'c', type: 'parent-child', partner1Id: 'm', childId: 'a' },
    ],
  });
  assert.equal(old.individuals[0].pregnancyEnd, '');
  assert.equal(old.individuals[0].countLabel, '');
  assert.equal(old.relationships[0].childless, '');
  assert.equal(old.relationships[1].childless, undefined, 'parent-child bağlarına eş alanı eklenmemeli');
});

test('eski dosyalardaki doğum/ölüm yılı okunurken atılır', () => {
  const s = PT.fromFileObject({
    individuals: [{ id: 'a', gender: 'male', x: 0, y: 0, name: 'Ahmet', birthYear: '1948', deathYear: '2012' }],
    relationships: [],
  });
  assert.equal('birthYear' in s.individuals[0], false);
  assert.equal('deathYear' in s.individuals[0], false);
  assert.equal(s.individuals[0].name, 'Ahmet');
});

test('daha yeni biçimli dosya açıkça reddedilir', () => {
  assert.throws(() => PT.fromFileObject({ formatVersion: 99, individuals: [], relationships: [] }), /v99/);
});

test('sembol içi yazı önceliği: sayı > gebelik > ölü doğum', () => {
  assert.equal(PT.innerText({ gender: 'male', countLabel: '5', isPregnancy: true }).text, '5');
  assert.equal(PT.innerText({ gender: 'female', isPregnancy: true, isStillbirth: true }).text, 'P');
  assert.equal(PT.innerText({ gender: 'female', isStillbirth: true }).text, 'SB');
  assert.equal(PT.innerText({ gender: 'male' }), null);
});

test('dosya metni: JSON olmayan metin çevrilmiş iletiyle reddedilir', () => {
  for (const lang of ['tr', 'en']) {
    PT.setLang(lang);
    const expected = PT.I18N[lang]['msg.notPedigree'];
    assert.throws(() => PT.parseFileText('{ bu json degil'), (e) => e.message === expected);
    assert.throws(() => PT.parseFileText(''), (e) => e.message === expected);
  }
  PT.setLang('tr');
});

test('dosya metni: pedigri olmayan JSON ve yeni biçim mevcut iletileriyle reddedilir', () => {
  PT.setLang('tr');
  assert.throws(() => PT.parseFileText('[]'), (e) => e.message === PT.t('msg.invalidFile'));
  assert.throws(() => PT.parseFileText('{"a":1}'), (e) => e.message === PT.t('msg.invalidFile'));
  assert.throws(() => PT.parseFileText('null'), (e) => e.message === PT.t('msg.readFail'));
  assert.throws(() => PT.parseFileText('{"formatVersion":99,"individuals":[],"relationships":[]}'), /v99/);
});

test('dosya metni: geçerli dosya iç şekle çevrilir', () => {
  const text = JSON.stringify({
    formatVersion: 2, meta: { title: 'Aile' },
    individuals: [{ id: 'a', gender: 'male', x: 0, y: 0, name: 'Ali' }],
    relationships: [], labels: [], phenotypeDefs: [],
  });
  const s = PT.parseFileText(text);
  assert.equal(s.meta.title, 'Aile');
  assert.equal(s.individuals[0].name, 'Ali');
  assert.equal(s.individuals[0].noteSize, 10, 'eksik alanlar tamamlanır');
});
