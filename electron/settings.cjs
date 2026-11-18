// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Ana süreçteki görünüm ayarlarının saf mantığı (Electron'a bağlı değil; test/
// altında Node ile denetlenir). Değer listeleri app/src/theme.js ile aynıdır.
const THEMES = ['system', 'light', 'dark'];
const DARK_CANVAS = ['dark', 'white'];

// Pencerenin, sayfa çizilmeden önce görünen zemin rengi. Koyu temada beyaz bir an
// parlamasın diye koyu; değer styles.css'teki koyu --app-bg ile aynıdır.
const WINDOW_BG = { light: '#eef2f5', dark: '#16191e' };

const validTheme = (v) => (THEMES.includes(v) ? v : 'system');
const validDarkCanvas = (v) => (DARK_CANVAS.includes(v) ? v : 'dark');

// settings.json'dan okunan (eksik, eski ya da elle bozulmuş olabilir) değerler.
function appearanceOf(settings) {
  const s = settings && typeof settings === 'object' ? settings : {};
  return { theme: validTheme(s.theme), darkCanvas: validDarkCanvas(s.darkCanvas) };
}

// Renderer'dan gelen değişiklik: yalnızca bilinen anahtarlar ve listedeki değerler
// geçer; geri kalan her şey sessizce atılır. Geçerli bir şey yoksa null.
function sanitizePatch(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out = {};
  if (THEMES.includes(input.theme)) out.theme = input.theme;
  if (DARK_CANVAS.includes(input.darkCanvas)) out.darkCanvas = input.darkCanvas;
  return Object.keys(out).length ? out : null;
}

const windowBackground = (dark) => (dark ? WINDOW_BG.dark : WINDOW_BG.light);

module.exports = { THEMES, DARK_CANVAS, WINDOW_BG, validTheme, validDarkCanvas, appearanceOf, sanitizePatch, windowBackground };
