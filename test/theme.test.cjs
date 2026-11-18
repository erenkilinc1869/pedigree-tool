// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadLogic } = require('./load.cjs');
const rules = require('../electron/settings.cjs');

const PT = loadLogic();

test('tema çözümü: Sistem, Windows ayarını izler; Açık/Koyu sabittir', () => {
  assert.equal(PT.resolveTheme('system', true), 'dark');
  assert.equal(PT.resolveTheme('system', false), 'light');
  assert.equal(PT.resolveTheme('light', true), 'light');
  assert.equal(PT.resolveTheme('dark', false), 'dark');
  // Bilinmeyen / bozuk değer "Sistem" sayılır.
  assert.equal(PT.resolveTheme('mavi', true), 'dark');
  assert.equal(PT.resolveTheme(undefined, false), 'light');
});

test('çizim alanı kâğıdı: yalnızca koyu temada ve "temaya uygun" seçiliyken koyu', () => {
  assert.equal(PT.resolvePaper('dark', 'dark'), 'dark');
  assert.equal(PT.resolvePaper('dark', 'white'), 'light');
  assert.equal(PT.resolvePaper('light', 'dark'), 'light');
  assert.equal(PT.resolvePaper('light', 'white'), 'light');
  assert.equal(PT.resolvePaper('dark', 'bozuk'), 'dark');
});

test('ana süreç: settings.json değerleri doğrulanır, eksik/bozuk olan varsayılana döner', () => {
  assert.deepEqual(rules.appearanceOf({}), { theme: 'system', darkCanvas: 'dark' });
  assert.deepEqual(rules.appearanceOf(null), { theme: 'system', darkCanvas: 'dark' });
  assert.deepEqual(rules.appearanceOf({ theme: 'dark', darkCanvas: 'white', lang: 'tr' }), { theme: 'dark', darkCanvas: 'white' });
  assert.deepEqual(rules.appearanceOf({ theme: 'DARK', darkCanvas: 1 }), { theme: 'system', darkCanvas: 'dark' });
});

test('ana süreç: renderer’dan gelen değişiklik beyaz listeden geçer', () => {
  assert.deepEqual(rules.sanitizePatch({ theme: 'light' }), { theme: 'light' });
  assert.deepEqual(rules.sanitizePatch({ darkCanvas: 'white', theme: undefined }), { darkCanvas: 'white' });
  assert.deepEqual(rules.sanitizePatch({ theme: 'dark', lang: 'en', __proto__x: 1 }), { theme: 'dark' });
  assert.equal(rules.sanitizePatch({ theme: '../../etc' }), null);
  assert.equal(rules.sanitizePatch('dark'), null);
  assert.equal(rules.sanitizePatch(null), null);
  assert.equal(rules.sanitizePatch(['dark']), null);
});

test('ana süreç ile sayfa aynı değer listelerini kullanır', () => {
  assert.deepEqual([...PT.THEMES], rules.THEMES);
  assert.deepEqual([...PT.DARK_CANVAS], rules.DARK_CANVAS);
});

// ---- renk karşıtlığı (WCAG) ----
function lum(hex) {
  const n = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function block(css, selector) {
  const i = css.indexOf(selector + ' {');
  assert.ok(i !== -1, selector + ' bulunamadı');
  const body = css.slice(i, css.indexOf('}', i));
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) out[m[1]] = m[2];
  return out;
}

const css = fs.readFileSync(path.join(__dirname, '..', 'app', 'styles.css'), 'utf8');

test('koyu tema okunur: yazı ≥ 4.5:1, soluk yazı ≥ 3:1, odak halkası ≥ 3:1', () => {
  const d = block(css, ':root[data-theme="dark"]');
  for (const bg of ['--app-bg', '--panel', '--card-bg', '--btn-bg', '--input-bg', '--btn-on-bg']) {
    assert.ok(contrast(d['--ink'], d[bg]) >= 4.5, 'yazı / ' + bg + ': ' + contrast(d['--ink'], d[bg]).toFixed(2));
  }
  for (const bg of ['--app-bg', '--panel', '--card-bg', '--input-bg']) {
    assert.ok(contrast(d['--muted'], d[bg]) >= 3, 'soluk / ' + bg + ': ' + contrast(d['--muted'], d[bg]).toFixed(2));
    assert.ok(contrast(d['--focus'], d[bg]) >= 3, 'odak / ' + bg);
  }
  assert.ok(contrast(d['--danger-ink'], d['--danger-bg']) >= 4.5, 'tehlike düğmesi');
  assert.ok(contrast(d['--on-teal'], d['--teal']) >= 3.5, 'ana düğme');
});

test('koyu kâğıt okunur ve açık kâğıt 1.6.0 ile aynı (siyah mürekkep, beyaz kâğıt)', () => {
  const l = block(css, ':root');
  const lp = (() => {
    const i = css.indexOf('--pd-paper');
    const start = css.lastIndexOf(':root {', i);
    return block(css.slice(start), ':root');
  })();
  assert.equal(lp['--pd-paper'], '#ffffff');
  assert.equal(lp['--pd-ink'], '#000000');
  assert.equal(lp['--pd-ink-soft'], '#444444');
  assert.equal(lp['--pd-ink-note'], '#333333');
  assert.equal(l['--ink'], '#1f2933');
  const d = block(css, ':root[data-paper="dark"]');
  assert.ok(contrast(d['--pd-ink'], d['--pd-paper']) >= 7);
  assert.ok(contrast(d['--pd-ink-soft'], d['--pd-paper']) >= 4.5);
  assert.ok(contrast(d['--pd-ink-note'], d['--pd-paper']) >= 4.5);
  assert.ok(contrast(d['--pd-sel'], d['--pd-paper']) >= 3);
});

test('pencere zemini koyu temadaki sayfa zeminiyle aynı (açılışta parlama yok)', () => {
  const d = block(css, ':root[data-theme="dark"]');
  assert.equal(rules.windowBackground(true), d['--app-bg']);
  assert.equal(rules.windowBackground(false), '#eef2f5');
});

test('PowerPoint çıktısı temadan bağımsız: pptx.js CSS değişkeni ya da tema kullanmaz', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'src', 'lib', 'pptx.js'), 'utf8');
  assert.ok(!/var\(--|PT\.(INK|PAPER|SEL|appearance)|data-theme|data-paper/.test(src));
});
