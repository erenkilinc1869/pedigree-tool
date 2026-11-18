// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadLogic } = require('./load.cjs');

const PT = loadLogic();

function P(id, gender, x, y, extra) {
  return Object.assign({ id, gender, x, y, name: '', phenotypes: [], note: '', noteSize: 10 }, extra || {});
}
const M = (id, a, b, type) => ({ id, type: type || 'mating', partner1Id: a, partner2Id: b, lineOffsetY: 40, isDivorced: false, label: '' });
const C = (id, m, kid) => ({ id, type: 'parent-child', partner1Id: m, childId: kid });
// vm bağlamından gelen nesnelerin prototipi farklıdır; düz nesneye çevrilerek karşılaştırılır.
const plain = (o) => JSON.parse(JSON.stringify(o));
const levels = (s) => {
  const g = PT.computeGenerations(s.individuals, s.relationships);
  return Object.fromEntries(s.individuals.map((p) => [p.id, g.info[p.id].level]));
};

// ---- ata araması ----

test('isAncestor: anne/baba zinciri, yönü ve ilgisiz kişiler', () => {
  const rels = [M('m1', 'gf', 'gm'), C('c1', 'm1', 'f'), M('m2', 'f', 'mo'), C('c2', 'm2', 'k')];
  assert.equal(PT.isAncestor('gf', 'k', rels), true);
  assert.equal(PT.isAncestor('gm', 'f', rels), true);
  assert.equal(PT.isAncestor('mo', 'k', rels), true);
  assert.equal(PT.isAncestor('k', 'gf', rels), false, 'yön ters');
  assert.equal(PT.isAncestor('mo', 'gf', rels), false, 'eşin ebeveyni ata değildir');
  assert.equal(PT.isAncestor('k', 'k', rels), false, 'kişi kendi atası sayılmaz');
  assert.equal(PT.isAncestor('x', 'k', rels), false);
});

test('isAncestor döngülü veride sonlanır', () => {
  // a+b -> c, c+b -> a: a hem c'nin ebeveyni hem çocuğu.
  const rels = [M('m', 'a', 'b'), C('x', 'm', 'c'), M('m2', 'c', 'b'), C('y', 'm2', 'a')];
  assert.equal(PT.isAncestor('a', 'c', rels), true);
  assert.equal(PT.isAncestor('c', 'a', rels), true);
  assert.equal(PT.isAncestor('z', 'a', rels), false, 'olmayan ata ararken de bitmeli');
});

test('linkWouldCycle: dede kendi torununun çocuğu yapılamaz', () => {
  const rels = [M('m1', 'gf', 'gm'), C('c1', 'm1', 'f'), M('m2', 'f', 'mo')];
  assert.equal(PT.linkWouldCycle('gf', ['f', 'mo'], rels), true, 'dede, babanın atası');
  assert.equal(PT.linkWouldCycle('gm', ['mo', 'f'], rels), true, 'sıra fark etmez');
  assert.equal(PT.linkWouldCycle('k', ['f', 'mo'], rels), false, 'yeni çocuk bağlanabilir');
  assert.equal(PT.linkWouldCycle('mo', ['gf', 'gm'], rels), false, 'gelin kayınpederin çocuğu yapılabilir (döngü değil)');
  assert.equal(PT.linkWouldCycle('f', ['f', 'mo'], rels), true, 'kişi kendi ebeveyni olamaz');
});

// ---- kuşak hesabı ----

test('ata ile torunu arasındaki birleşmede kuşaklar kaymaz', () => {
  // A + B -> C; A ayrıca C ile eş; A + C -> D.
  const s = {
    individuals: [P('A', 'male', 0, 0), P('B', 'female', 100, 0), P('C', 'female', 50, 150), P('D', 'male', 50, 300)],
    relationships: [M('m1', 'A', 'B'), C('c1', 'm1', 'C'), M('m2', 'A', 'C'), C('c2', 'm2', 'D')],
  };
  assert.deepEqual(levels(s), { A: 0, B: 0, C: 1, D: 2 });
  const g = PT.computeGenerations(s.individuals, s.relationships);
  assert.equal(g.info.A.label.split('-')[0], 'I');
  assert.equal(g.info.C.label.split('-')[0], 'II');
  assert.equal(g.info.D.label.split('-')[0], 'III');
});

test('ata-torun birleşmesi: çocuk yokken de eşler kendi kuşağında kalır', () => {
  const s = {
    individuals: [P('A', 'male', 0, 0), P('B', 'female', 100, 0), P('C', 'female', 50, 150)],
    relationships: [M('m1', 'A', 'B'), C('c1', 'm1', 'C'), M('m2', 'A', 'C')],
  };
  assert.deepEqual(levels(s), { A: 0, B: 0, C: 1 });
});

test('dışarıdan evlenen eş, eşinin kuşağına çekilir (değişmedi)', () => {
  const s = {
    individuals: [P('gf', 'male', 0, 0), P('gm', 'female', 100, 0), P('son', 'male', 0, 150), P('wife', 'female', 200, 0), P('kid', 'male', 100, 300)],
    relationships: [M('m1', 'gf', 'gm'), C('c1', 'm1', 'son'), M('m2', 'son', 'wife'), C('c2', 'm2', 'kid')],
  };
  assert.deepEqual(levels(s), { gf: 0, gm: 0, son: 1, wife: 1, kid: 2 });
});

test('iki kurucu aile evlilikle birleşince kuşaklar doğru (değişmedi)', () => {
  const s = {
    individuals: [P('a1', 'male', 0, 0), P('a2', 'female', 120, 0), P('b1', 'male', 500, 0), P('b2', 'female', 620, 0),
      P('ac', 'male', 60, 200), P('bc', 'female', 560, 200), P('g', 'female', 300, 400)],
    relationships: [M('ma', 'a1', 'a2'), M('mb', 'b1', 'b2'), C('c1', 'ma', 'ac'), C('c2', 'mb', 'bc'),
      M('mc', 'ac', 'bc'), C('c3', 'mc', 'g')],
  };
  assert.deepEqual(levels(s), { a1: 0, a2: 0, b1: 0, b2: 0, ac: 1, bc: 1, g: 2 });
});

test('farklı derinlikte iki aile birleşince sığ taraf aşağı iner (değişmedi)', () => {
  // Eşlerden birinin dedesi var, diğerinin yok: eş derin olan kuşağa çekilir.
  const s = {
    individuals: [P('gg', 'male', 0, 0), P('gw', 'female', 100, 0), P('h', 'male', 0, 150), P('w', 'female', 300, 0)],
    relationships: [M('m0', 'gg', 'gw'), C('c0', 'm0', 'h'), M('m1', 'h', 'w')],
  };
  assert.deepEqual(levels(s), { gg: 0, gw: 0, h: 1, w: 1 });
});

test('ata-torun birleşmesinde otomatik yerleşim: hata yok, satırlar tutarlı, kardeş çizgisi arada', () => {
  const s = {
    meta: {}, labels: [], phenotypeDefs: [],
    individuals: [P('A', 'male', 0, 0, { name: 'Ali' }), P('B', 'female', 120, 0), P('C', 'female', 60, 150, { name: 'Cansu', note: 'uzun bir not\nikinci satır' }),
      P('D', 'male', 60, 300), P('E', 'female', 160, 300)],
    relationships: [M('m1', 'A', 'B'), C('c1', 'm1', 'C'), M('m2', 'A', 'C'), C('c2', 'm2', 'D'), C('c3', 'm2', 'E')],
  };
  const out = PT.autoLayout(s);
  const p = Object.fromEntries(out.individuals.map((q) => [q.id, q]));
  assert.equal(p.A.y, p.B.y, 'A ve B aynı satırda');
  assert.ok(p.C.y > p.A.y, 'C bir alt satırda');
  assert.equal(p.D.y, p.E.y, 'kardeşler aynı satırda');
  assert.ok(p.D.y > p.C.y, 'çocuklar C satırının altında');
  const m2 = out.relationships.find((r) => r.id === 'm2');
  const sibY = (p.A.y + p.C.y) / 2 + 25 + m2.lineOffsetY;
  assert.ok(sibY > p.C.y + PT.personBottom(p.C), `kardeş çizgisi (${sibY}) alt eşin yazılarının altında olmalı`);
  assert.ok(sibY < p.D.y - 15, `kardeş çizgisi (${sibY}) çocuk satırının (${p.D.y}) üstünde olmalı`);
  const again = PT.autoLayout(out);
  assert.deepEqual(again.individuals, out.individuals, 'ikinci çalıştırma sonucu değiştirmemeli');
  assert.deepEqual(again.relationships, out.relationships);
});

// ---- yeni çocuğun konumu: uygulamadaki akışın aynısı ----

// App.js addChildToMating ile aynı adımlar: konum -> bağ -> layoutSiblings -> autoLayout.
function addChild(s, matingId, id) {
  const slot = PT.newChildSlots(matingId, s.individuals, s.relationships, 1)[0];
  const child = Object.assign(PT.newIndividual('male', slot.x, slot.y), { id });
  const rels = s.relationships.concat([C('pc-' + id, matingId, id)]);
  const people = PT.layoutSiblings(matingId, s.individuals.concat([child]), rels);
  return PT.autoLayout(Object.assign({}, s, { individuals: people, relationships: rels }));
}

function addTwins(s, matingId, ids) {
  const slots = PT.newChildSlots(matingId, s.individuals, s.relationships, 2);
  const kids = ids.map((id, i) => Object.assign(PT.newIndividual('female', slots[i].x, slots[i].y),
    { id, twinGroupId: 'tw-' + ids[0], zygosity: 'mono' }));
  const rels = s.relationships.concat(kids.map((k) => C('pc-' + k.id, matingId, k.id)));
  const people = PT.layoutSiblings(matingId, s.individuals.concat(kids), rels);
  return PT.autoLayout(Object.assign({}, s, { individuals: people, relationships: rels }));
}

const order = (s, ids) => s.individuals.filter((q) => ids.includes(q.id)).sort((a, b) => a.x - b.x).map((q) => q.id);

for (const [where, x0, y0] of [['pozitif', 400, 300], ['negatif', -900, -500], ['sıfır çevresi', -60, 0]]) {
  test(`yeni çocuklar ekleniş sırasıyla soldan sağa dizilir (${where} koordinat)`, () => {
    let s = { meta: {}, labels: [], phenotypeDefs: [],
      individuals: [P('f', 'male', x0, y0), P('m', 'female', x0 + 110, y0)], relationships: [M('mm', 'f', 'm')] };
    s = addChild(s, 'mm', 'k1');
    s = addChild(s, 'mm', 'k2');
    s = addChild(s, 'mm', 'k3');
    assert.deepEqual(order(s, ['k1', 'k2', 'k3']), ['k1', 'k2', 'k3']);
  });
}

test('ikizler mevcut kardeşlerin sağına, yan yana eklenir', () => {
  for (const x0 of [400, -900]) {
    let s = { meta: {}, labels: [], phenotypeDefs: [],
      individuals: [P('f', 'male', x0, 100), P('m', 'female', x0 + 110, 100)], relationships: [M('mm', 'f', 'm')] };
    s = addChild(s, 'mm', 'k1');
    s = addChild(s, 'mm', 'k2');
    s = addTwins(s, 'mm', ['t1', 't2']);
    s = addChild(s, 'mm', 'k3');
    assert.deepEqual(order(s, ['k1', 'k2', 't1', 't2', 'k3']), ['k1', 'k2', 't1', 't2', 'k3'], 'x0=' + x0);
  }
});

test('newChildSlots: ilk çocuk çiftin ortasının altına, sonraki en sağdaki kardeşin sağına', () => {
  const people = [P('f', 'male', 0, 0), P('m', 'female', 110, 0), P('a', 'male', 500, 150)];
  const rels = [M('mm', 'f', 'm')];
  const first = PT.newChildSlots('mm', people, rels, 1);
  assert.deepEqual(plain(first), [{ x: 55, y: 150 }]);
  const next = PT.newChildSlots('mm', people, rels.concat([C('c', 'mm', 'a')]), 2);
  assert.deepEqual(plain(next), [{ x: 590, y: 150 }, { x: 680, y: 150 }]);
});

// ---- bağ kaldırma ----

test('removeMating eş bağını ve o çiftin çocuk bağlarını kaldırır, başka kayda dokunmaz', () => {
  const rels = [M('m1', 'a', 'b'), C('c1', 'm1', 'k1'), C('c2', 'm1', 'k2'), M('m2', 'a', 'z'), C('c3', 'm2', 'k3')];
  assert.equal(PT.childLinksOf('m1', rels).length, 2);
  const out = PT.removeMating(rels, 'm1');
  assert.deepEqual(out.map((r) => r.id), ['m2', 'c3']);
  // Asılı kayıt yok: kalan her parent-child bağı var olan bir çifte işaret eder.
  const matingIds = new Set(out.filter(PT.isMating).map((r) => r.id));
  for (const r of out.filter((r) => r.type === 'parent-child')) assert.ok(matingIds.has(r.partner1Id));
  assert.equal(rels.length, 5, 'girdi değiştirilmemeli');
});

test('removeParentLinks yalnızca kişinin ebeveyn bağını kaldırır', () => {
  const rels = [M('m1', 'a', 'b'), C('c1', 'm1', 'k1'), C('c2', 'm1', 'k2')];
  const out = PT.removeParentLinks(rels, 'k1');
  assert.deepEqual(out.map((r) => r.id), ['m1', 'c2']);
  assert.equal(PT.parentLinkOf('k1', out), null);
});

test('matingsOf kişinin bütün eş ilişkilerini verir', () => {
  const rels = [M('m1', 'a', 'b'), C('c1', 'm1', 'k'), M('m2', 'z', 'a', 'consanguinity'), M('m3', 'x', 'y')];
  assert.deepEqual(PT.matingsOf('a', rels).map((r) => r.id), ['m1', 'm2']);
  assert.deepEqual(PT.matingsOf('k', rels), []);
});

// ---- kardeş çizgisi geometrisi (ekran ve PPTX ortak) ----

const kinds = (g) => g.lines.reduce((acc, l) => { acc[l.kind] = (acc[l.kind] || 0) + 1; return acc; }, {});

test('kardeş çizgisi: 3 tekil çocuk -> 1 iniş + 1 yatay + 3 dikey', () => {
  const a = P('a', 'male', 0, 0), b = P('b', 'female', 200, 0);
  const kids = [P('k1', 'male', 0, 150), P('k2', 'female', 100, 150), P('k3', 'male', 200, 150)];
  const g = PT.sibshipGeometry(a, b, M('m', 'a', 'b'), kids);
  assert.deepEqual(kinds(g), { drop: 1, sib: 1, child: 3 });
  const sibY = 25 + 40;
  const drop = g.lines.find((l) => l.kind === 'drop');
  assert.deepEqual([drop.x1, drop.y1, drop.x2, drop.y2], [125, 25, 125, sibY]);
  const sib = g.lines.find((l) => l.kind === 'sib');
  assert.deepEqual([sib.x1, sib.x2, sib.y1, sib.y2], [25, 225, sibY, sibY]);
  assert.deepEqual(plain(g.handle), { x: 125, y: sibY });
  // Abortus üçgeninin tepesi 10 px aşağıda.
  const g2 = PT.sibshipGeometry(a, b, M('m', 'a', 'b'), [P('ab', 'abortion', 100, 150)]);
  assert.equal(g2.lines.find((l) => l.kind === 'child').y2, 160);
});

test('kardeş çizgisi: MZ ikiz -> tek çatal noktası + çubuk; DZ ikizde çubuk yok', () => {
  const a = P('a', 'male', 0, 0), b = P('b', 'female', 200, 0);
  // Çatal noktası (175) çiftin ortasından (125) farklı: yatay kardeş çizgisi de olur.
  const mz = [P('t1', 'male', 50, 150, { twinGroupId: 'g', zygosity: 'mono' }), P('t2', 'male', 250, 150, { twinGroupId: 'g', zygosity: 'mono' })];
  const g = PT.sibshipGeometry(a, b, M('m', 'a', 'b'), mz);
  assert.deepEqual(kinds(g), { drop: 1, sib: 1, twin: 2, mz: 1 });
  const twins = g.lines.filter((l) => l.kind === 'twin');
  assert.equal(twins[0].x1, 175);
  assert.equal(twins[1].x1, 175, 'iki kol aynı noktadan çıkar');
  const bar = g.lines.find((l) => l.kind === 'mz');
  assert.equal(bar.y1, (65 + 150) / 2);
  assert.deepEqual([bar.x1, bar.x2], [(175 + 75) / 2, (175 + 275) / 2], 'çubuk iki kolun ortasından geçer');

  const dz = mz.map((k) => Object.assign({}, k, { zygosity: 'di' }));
  assert.deepEqual(kinds(PT.sibshipGeometry(a, b, M('m', 'a', 'b'), dz)), { drop: 1, sib: 1, twin: 2 });
  assert.deepEqual(plain(PT.sibshipGeometry(a, b, M('m', 'a', 'b'), [])), { lines: [], handle: null });
});

test('kardeş çizgisi: tek çocuk tam ortadaysa yatay çizgi çizilmez', () => {
  const g = PT.sibshipGeometry(P('a', 'male', 0, 0), P('b', 'female', 200, 0), M('m', 'a', 'b'), [P('k', 'male', 100, 150)]);
  assert.deepEqual(kinds(g), { drop: 1, child: 1 });
});

// ---- dile göre büyük harf ----

test('PT.upper dile göre büyük harfe çevirir', () => {
  PT.setLang('tr');
  assert.equal(PT.upper('Seçili çifte'), 'SEÇİLİ ÇİFTE');
  assert.equal(PT.upper('ilişki'), 'İLİŞKİ');
  PT.setLang('en');
  assert.equal(PT.upper('Family'), 'FAMILY');
  assert.equal(PT.upper('Connections'), 'CONNECTIONS');
  assert.equal(PT.upper('ilişki', 'tr'), 'İLİŞKİ', 'dil açıkça verilebilir');
  PT.setLang('tr');
});
