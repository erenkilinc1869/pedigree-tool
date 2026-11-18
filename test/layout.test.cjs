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

// Elle çizilmiş gibi kaymış bir aile: eşler farklı yükseklikte, ondalıklı y'ler var.
function messy() {
  return {
    meta: { title: '' },
    labels: [],
    phenotypeDefs: [],
    individuals: [
      P('d1', 'male', 200, 150.4, { name: 'Ahmet', isDeceased: true }),
      P('d2', 'female', 420, 163.2, { name: 'Fatma' }),
      P('s1', 'male', 150, 380, { name: 'Mehmet', isProband: true, note: 'c.2049_2050del\nhomozigot' }),
      P('s2', 'female', 330, 372.7, { name: 'Ayşe' }),
      P('s3', 'female', 520, 395, { name: 'Zeynep' }),
      P('t1', 'male', 180, 620, { twinGroupId: 'tw', zygosity: 'mono' }),
      P('a1', 'abortion', 250, 610),
      P('t2', 'male', 300, 640, { twinGroupId: 'tw', zygosity: 'mono' }),
      P('lone', 'male', 900, 55.5),
    ],
    relationships: [
      M('m1', 'd1', 'd2', 'consanguinity'),
      C('c1', 'm1', 's1'),
      C('c2', 'm1', 's3'),
      M('m2', 's1', 's2'),
      C('c3', 'm2', 't1'),
      C('c4', 'm2', 't2'),
      C('c5', 'm2', 'a1'),
    ],
  };
}

const byId = (s) => Object.fromEntries(s.individuals.map((p) => [p.id, p]));
const center = (p) => p.x + 25;

test('eşler aynı satırda, satırlar kuşak sırasına göre', () => {
  const out = PT.autoLayout(messy());
  const p = byId(out);
  assert.equal(p.d1.y, p.d2.y);
  assert.equal(p.s1.y, p.s2.y);
  assert.equal(p.s1.y, p.s3.y);
  assert.equal(p.t1.y, p.t2.y);
  assert.equal(p.t1.y, p.a1.y);
  assert.ok(p.s1.y - p.d1.y >= 150);
  assert.ok(p.t1.y - p.s1.y >= 150);
  for (const q of out.individuals.filter((q) => q.id !== 'lone')) {
    assert.equal(q.y % 10, 0, q.id + ' y ızgarada değil: ' + q.y);
    assert.equal(Number.isInteger(q.x), true);
  }
});

test('çocuklar ebeveyn çiftinin ortasına ortalanır', () => {
  const out = PT.autoLayout(messy());
  const p = byId(out);
  const mid1 = (center(p.d1) + center(p.d2)) / 2;
  const sib1 = (center(p.s1) + center(p.s3)) / 2;
  assert.ok(Math.abs(mid1 - sib1) <= 1, `m1 ortası ${mid1}, kardeşler ${sib1}`);
  const mid2 = (center(p.s1) + center(p.s2)) / 2;
  const xs = ['t1', 't2', 'a1'].map((id) => center(p[id]));
  const sib2 = (Math.min(...xs) + Math.max(...xs)) / 2;
  assert.ok(Math.abs(mid2 - sib2) <= 1, `m2 ortası ${mid2}, kardeşler ${sib2}`);
});

test('aynı satırda yazılar dahil çakışma yok', () => {
  const out = PT.autoLayout(messy());
  const rows = {};
  out.individuals.filter((q) => q.id !== 'lone').forEach((q) => { (rows[q.y] = rows[q.y] || []).push(q); });
  for (const row of Object.values(rows)) {
    row.sort((a, b) => a.x - b.x);
    for (let i = 1; i < row.length; i++) {
      const a = row[i - 1], b = row[i];
      const aRight = center(a) + PT.personWidth(a) / 2;
      const bLeft = center(b) - PT.personWidth(b) / 2;
      assert.ok(bLeft - aRight >= 39, `${a.id} ile ${b.id} çakışıyor (${aRight} > ${bLeft})`);
    }
  }
});

test('ikizler yan yana, kullanıcının sırası korunur', () => {
  const out = PT.autoLayout(messy());
  const row = out.individuals.filter((q) => ['t1', 't2', 'a1'].includes(q.id)).sort((a, b) => a.x - b.x).map((q) => q.id);
  // Girdide sıra t1, a1, t2 idi; ikizler bitişik olmalı, t1 en solda kalmalı.
  assert.deepEqual(row, ['t1', 't2', 'a1']);
  const p = byId(out);
  assert.ok(p.s1.x < p.s3.x, 'kardeş sırası bozuldu');
});

test('bağlantısız kişiye dokunulmaz', () => {
  const out = PT.autoLayout(messy());
  const p = byId(out);
  assert.equal(p.lone.x, 900);
  assert.equal(p.lone.y, 55.5);
});

test('iki kez çalıştırınca sonuç değişmez', () => {
  const once = PT.autoLayout(messy());
  const twice = PT.autoLayout(once);
  assert.deepEqual(twice.individuals, once.individuals);
  assert.deepEqual(twice.relationships, once.relationships);
});

test('kardeş çizgisi ebeveyn yazılarının altında, çocukların üstünde', () => {
  const out = PT.autoLayout(messy());
  const p = byId(out);
  for (const m of out.relationships.filter(PT.isMating)) {
    const a = p[m.partner1Id], b = p[m.partner2Id];
    const sibY = a.y + 25 + m.lineOffsetY;
    const textBottom = a.y + Math.max(PT.personBottom(a), PT.personBottom(b));
    const kids = out.relationships.filter((r) => r.type === 'parent-child' && r.partner1Id === m.id).map((r) => p[r.childId]);
    assert.ok(sibY > textBottom, `${m.id}: çizgi (${sibY}) yazıların (${textBottom}) üstünden geçiyor`);
    for (const k of kids) assert.ok(sibY < k.y - 15, `${m.id}: çizgi çocuğa çok yakın`);
  }
});

test('birden çok evlilikte ortak kişi ortada durur', () => {
  const s = {
    meta: {}, labels: [], phenotypeDefs: [],
    individuals: [
      P('h', 'male', 100, 100), P('w1', 'female', 300, 100), P('w2', 'female', 500, 100),
      P('k1', 'male', 200, 300), P('k2', 'female', 450, 300),
    ],
    relationships: [M('a', 'h', 'w1'), M('b', 'h', 'w2'), C('x', 'a', 'k1'), C('y', 'b', 'k2')],
  };
  const p = byId(PT.autoLayout(s));
  assert.ok(p.w1.x < p.h.x && p.h.x < p.w2.x, 'ortak eş ortada değil');
  assert.ok(p.k1.x < p.k2.x, 'yarım kardeşler yanlış tarafta');
});

test('iki kurucu aile evlilikle birleşince çakışma olmaz', () => {
  const s = {
    meta: {}, labels: [], phenotypeDefs: [],
    individuals: [
      P('a1', 'male', 0, 0), P('a2', 'female', 120, 0),
      P('b1', 'male', 500, 0), P('b2', 'female', 620, 0),
      P('ac', 'male', 60, 200), P('bc', 'female', 560, 200),
      P('g', 'female', 300, 400),
    ],
    relationships: [
      M('ma', 'a1', 'a2'), M('mb', 'b1', 'b2'), C('c1', 'ma', 'ac'), C('c2', 'mb', 'bc'),
      M('mc', 'ac', 'bc'), C('c3', 'mc', 'g'),
    ],
  };
  const out = PT.autoLayout(s);
  const p = byId(out);
  assert.equal(p.ac.y, p.bc.y);
  const top = out.individuals.filter((q) => q.y === p.a1.y).sort((a, b) => a.x - b.x);
  for (let i = 1; i < top.length; i++) assert.ok(top[i].x - top[i - 1].x >= 50 + 40);
});

test('ilişki etiketi eş sembollerinin arasına sığar', () => {
  const s = messy();
  s.relationships[0].label = '1. derece kuzen evliliği';
  const p = byId(PT.autoLayout(s));
  const edgeGap = p.d2.x - (p.d1.x + 50);
  const labelW = '1. derece kuzen evliliği'.length * 11 * 0.58;
  assert.ok(edgeGap >= labelW, `semboller arası ${edgeGap}px, etiket ~${labelW}px`);
});

test('döngülü veri (kendi atası) sonsuz döngüye girmez', () => {
  const s = {
    meta: {}, labels: [], phenotypeDefs: [],
    individuals: [P('a', 'male', 0, 0), P('b', 'female', 100, 0), P('c', 'male', 50, 150)],
    relationships: [M('m', 'a', 'b'), C('x', 'm', 'c'), M('m2', 'c', 'b'), C('y', 'm2', 'a')],
  };
  const out = PT.autoLayout(s);
  assert.equal(out.individuals.length, 3);
});
