// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// EK logosu, dışa aktarılan SVG'ye gömülebilmesi için metin olarak tutulur.
// (Ekranda üst şeritte assets/EK-logo.svg dosyası kullanılır; kaynak aynıdır.)
// Gradyan kimlikleri "ek-" ile başlar ki çizimdeki diğer tanımlarla çakışmasın.
(function (PT) {
  'use strict';

  PT.LOGO_MARKUP = [
    '<defs>',
    '<linearGradient id="ek-teal" gradientUnits="userSpaceOnUse" x1="8" y1="8" x2="56" y2="56">',
    '<stop offset="0" stop-color="#7cf3e2"/><stop offset="1" stop-color="#0d9488"/>',
    '</linearGradient>',
    '<linearGradient id="ek-bg" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0" stop-color="#1c2330"/><stop offset="1" stop-color="#0b1015"/>',
    '</linearGradient>',
    '<linearGradient id="ek-gem" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#c8fff6"/><stop offset="1" stop-color="#2dd4bf"/>',
    '</linearGradient>',
    '</defs>',
    '<rect x="2" y="2" width="60" height="60" rx="15" fill="url(#ek-bg)" stroke="#2a3342" stroke-width="1.5"/>',
    '<g stroke="url(#ek-teal)" stroke-width="6.5" stroke-linecap="round" fill="none">',
    '<path d="M13 16 V48"/><path d="M13 16 H26"/><path d="M13 32 H24"/><path d="M13 48 H26"/>',
    '</g>',
    '<g stroke-width="4.2" stroke-linecap="round" fill="none">',
    '<path d="M37 14 Q29 23 37 32 T37 50" stroke="#0f9f8f"/>',
    '<path d="M37 14 Q45 23 37 32 T37 50" stroke="#7cf3e2"/>',
    '</g>',
    '<g stroke="#5eead4" stroke-width="2.4" stroke-linecap="round">',
    '<path d="M33.5 20 H40.5 M32.5 25.5 H41.5 M32.5 38.5 H41.5 M33.5 44 H40.5"/>',
    '</g>',
    '<g transform="translate(40 32)">',
    '<g transform="rotate(-45)">',
    '<path d="M0 0 L11.04 -3.8 L23 0 L11.04 3.8 Z" fill="url(#ek-teal)" stroke="#06231f" stroke-width="0.6"/>',
    '<path d="M15.5 -2.356 L23 0 L15.5 2.356 Z" fill="url(#ek-gem)" opacity="0.95"/>',
    '</g>',
    '<g transform="rotate(45)">',
    '<path d="M0 0 L11.04 -3.8 L23 0 L11.04 3.8 Z" fill="url(#ek-teal)" stroke="#06231f" stroke-width="0.6"/>',
    '<path d="M15.5 -2.356 L23 0 L15.5 2.356 Z" fill="url(#ek-gem)" opacity="0.95"/>',
    '</g>',
    '</g>',
  ].join('');
})(window.PT);
