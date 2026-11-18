// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Tarayıcı betiklerini (window.PT'ye yazan IIFE'ler) Node içinde yükler.
// React gerekmeyen saf mantık dosyaları için yeterli bir window taklidi kurar.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'app', 'src');

function loadPT(files) {
  const window = {
    React: { createElement: () => null },
    crypto: { randomUUID: require('crypto').randomUUID },
  };
  const ctx = vm.createContext({ window, crypto: window.crypto, console, Math, JSON, Date });
  for (const f of files) {
    const code = fs.readFileSync(path.join(SRC, f), 'utf8');
    vm.runInContext(code, ctx, { filename: f });
  }
  return window.PT;
}

module.exports = {
  loadLogic: () => loadPT([
    'theme.js',
    'constants.js',
    'i18n.js',
    'terms.js',
    'lib/pedigree.js',
    'lib/layout.js',
    'state/storage.js',
  ]),
};
