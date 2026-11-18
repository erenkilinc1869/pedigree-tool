// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Düzenlenebilir PowerPoint çıktısı. Görüntü gömülmez: her sembol, çizgi ve
// yazı ayrı bir PowerPoint nesnesi olarak veriden yeniden çizilir; kişiyi
// taşımak, adını düzeltmek ya da rengini değiştirmek PowerPoint içinde yapılabilir.
// Geometri ekrandaki çizimle aynıdır (PersonNode / RelationshipLine).
(function (PT) {
  'use strict';

  var S = PT.SIZE, HALF = PT.HALF;
  var SHAPE = { male: 'rect', female: 'ellipse', unknown: 'diamond', abortion: 'triangle' };

  // Slayt: 16:9, 10 x 5.625 inç.
  var SLIDE_W = 10, SLIDE_H = 5.625;
  var AREA = { x: 0.35, y: 0.62, w: 9.3, h: 4.28 };

  function hex(c) {
    return String(c || '#000000').replace('#', '').toUpperCase();
  }

  // Çeyrek/yarım dilimler: PowerPoint açıları saat 3'ten başlar, saat yönünde artar.
  // T1..T3: üç eşit 120° dilim (150°→270°, 270°→30°, 30°→150°; PT.THIRDS_START_DEG).
  var PIE = {
    TL: [180, 270], TR: [270, 0], BR: [0, 90], BL: [90, 180],
    L: [90, 270], R: [270, 90],
    T1: [150, 270], T2: [270, 30], T3: [30, 150],
  };
  // Eşkenar dörtgenin aynı bölgeleri (50x50 kutu içinde çokgenler). 30° ve 150°
  // ışınları kenarları (40.85, 34.15) ve (9.15, 34.15) noktalarında keser.
  var D30 = [40.85, 34.15], D150 = [9.15, 34.15], C = [25, 25];
  var DIAMOND = {
    TL: [[0, 25], [25, 0], C],
    TR: [[25, 0], [50, 25], C],
    BR: [[50, 25], [25, 50], C],
    BL: [[25, 50], [0, 25], C],
    L: [[25, 0], [25, 50], [0, 25]],
    R: [[25, 0], [50, 25], [25, 50]],
    T1: [C, D150, [0, 25], [25, 0]],
    T2: [C, [25, 0], [50, 25], D30],
    T3: [C, D30, [25, 50], D150],
  };
  // Karede üçte bir: eşit genişlikte dikey şeritler.
  var RECT = {
    TL: [0, 0, 25, 25], TR: [25, 0, 25, 25], BR: [25, 25, 25, 25], BL: [0, 25, 25, 25],
    L: [0, 0, 25, 50], R: [25, 0, 25, 50],
    T1: [0, 0, 50 / 3, 50], T2: [50 / 3, 0, 50 / 3, 50], T3: [100 / 3, 0, 50 / 3, 50],
  };
  // Ekrandaki sırayla aynı: 2 -> sol/sağ, 3 -> üç eşit parça, 4 -> dört çeyrek.
  var REGIONS = { 2: ['L', 'R'], 3: ['T1', 'T2', 'T3'], 4: ['TL', 'TR', 'BR', 'BL'] };

  PT.buildPptxNative = function (opts) {
    var state = opts.state;
    var people = state.individuals || [];
    var rels = state.relationships || [];
    var bb = opts.bbox;

    var pptx = new window.PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Pedigree Tool';
    pptx.title = opts.title || PT.t('doc.title');
    var slide = pptx.addSlide();

    // px -> inç ölçeği: çizim alana sığar, bir sembol en fazla 0.9 inç olur.
    var s = Math.min(AREA.w / bb.width, AREA.h / bb.height, 0.9 / S);
    var ox = AREA.x + (AREA.w - bb.width * s) / 2;
    var oy = AREA.y + (AREA.h - bb.height * s) / 2;
    function X(px) { return ox + (px - bb.x) * s; }
    function Y(py) { return oy + (py - bb.y) * s; }
    function D(len) { return len * s; }
    function PTS(px) { return Math.max(4, Math.round(px * s * 72 * 10) / 10); }
    function LW(px) { return Math.max(0.5, Math.round(px * s * 72 * 100) / 100); }

    // ---- yardımcılar ----
    function line(x1, y1, x2, y2, width, arrowAtEnd) {
      var dx = x2 - x1, dy = y2 - y1;
      var o = {
        x: X(Math.min(x1, x2)), y: Y(Math.min(y1, y2)),
        w: D(Math.abs(dx)), h: D(Math.abs(dy)),
        line: { color: '000000', width: LW(width || 2) },
      };
      if (dx !== 0 && dy !== 0 && (dx < 0) !== (dy < 0)) o.flipV = true;
      if (arrowAtEnd) {
        var reversed = dx < 0 || (dx === 0 && dy < 0);
        o.line[reversed ? 'beginArrowType' : 'endArrowType'] = 'triangle';
      }
      slide.addShape('line', o);
    }

    // SVG'deki metin y'si taban çizgisidir; PowerPoint kutusu üstten konumlanır.
    function text(str, x, baseline, size, o) {
      o = o || {};
      if (str == null || str === '') return;
      str = String(str);
      var align = o.align || 'center';
      var wpx = Math.max(24, str.length * size * 0.7 + 16);
      var left = align === 'center' ? x - wpx / 2 : (align === 'right' ? x - wpx : x);
      slide.addText(str, {
        x: X(left), y: Y(baseline - size * 0.98), w: D(wpx), h: D(size * 1.3),
        fontFace: 'Arial', fontSize: PTS(size), bold: !!o.bold, color: hex(o.color || '#000000'),
        align: align, valign: 'top', margin: 0, wrap: false, fit: 'none',
      });
    }

    function poly(px, py, points, color) {
      // points: 50x50 kutu içinde [x, y]; kutunun kendisi custGeom çerçevesidir.
      slide.addShape('custGeom', {
        x: X(px), y: Y(py), w: D(S), h: D(S),
        fill: { color: color },
        points: points.map(function (pt) { return { x: D(pt[0]), y: D(pt[1]) }; }).concat([{ close: true }]),
      });
    }

    // ---- kişiler ----
    var gen = PT.computeGenerations(people, rels);
    var defs = state.phenotypeDefs || [];

    function phenotypes(p) {
      return (p.phenotypes || [])
        .map(function (id) { return defs.find(function (d) { return d.id === id; }); })
        .filter(Boolean);
    }

    function phenotypePieces(p, list) {
      var n = list.length, kind = p.gender;
      var c = function (i) { return hex(list[i].color); };

      if (kind === 'abortion' || n === 1) {
        var box = kind === 'abortion' ? [p.x + 10, p.y + 10, 30, 30] : [p.x, p.y, S, S];
        slide.addShape(SHAPE[kind] || 'ellipse', {
          x: X(box[0]), y: Y(box[1]), w: D(box[2]), h: D(box[3]), fill: { color: c(0) },
        });
        return;
      }

      if (n > 4) {
        // Beşten fazla fenotip: saat 12'den başlayan eşit dilimler.
        list.forEach(function (d, i) {
          var a0 = (270 + i * 360 / n) % 360, a1 = (270 + (i + 1) * 360 / n) % 360;
          slide.addShape('pie', {
            x: X(p.x), y: Y(p.y), w: D(S), h: D(S),
            angleRange: [Math.round(a0), Math.round(a1)], fill: { color: hex(d.color) },
          });
        });
        return;
      }

      REGIONS[n].forEach(function (region, i) {
        if (kind === 'male') {
          var r = RECT[region];
          slide.addShape('rect', { x: X(p.x + r[0]), y: Y(p.y + r[1]), w: D(r[2]), h: D(r[3]), fill: { color: c(i) } });
        } else if (kind === 'unknown') {
          poly(p.x, p.y, DIAMOND[region], c(i));
        } else {
          slide.addShape('pie', {
            x: X(p.x), y: Y(p.y), w: D(S), h: D(S), angleRange: PIE[region], fill: { color: c(i) },
          });
        }
      });
    }

    function drawPerson(p) {
      var kind = SHAPE[p.gender] || 'ellipse';
      var box = p.gender === 'abortion' ? [p.x + 10, p.y + 10, 30, 30] : [p.x, p.y, S, S];
      var list = phenotypes(p);
      var outline = { color: '000000', width: LW(2) };

      if (!list.length) {
        slide.addShape(kind, {
          x: X(box[0]), y: Y(box[1]), w: D(box[2]), h: D(box[3]),
          fill: { color: p.isAffected ? '000000' : 'FFFFFF' }, line: outline,
        });
      } else {
        phenotypePieces(p, list);
        slide.addShape(kind, { x: X(box[0]), y: Y(box[1]), w: D(box[2]), h: D(box[3]), line: outline });
      }

      if (p.isCarrier) {
        slide.addShape('ellipse', { x: X(p.x + 17), y: Y(p.y + 17), w: D(16), h: D(16), fill: { color: '000000' } });
      }
      if (p.isDeceased) line(p.x - 4, p.y + S + 4, p.x + S + 4, p.y - 4, 3);
      if (p.gender === 'abortion' && p.pregnancyEnd === 'top') line(p.x + 4, p.y + 48, p.x + 46, p.y + 4, 2.5);
      if (p.isAdopted) {
        [[-5, -6, -11, -6], [-11, -6, -11, 56], [-11, 56, -5, 56],
         [55, -6, 61, -6], [61, -6, 61, 56], [61, 56, 55, 56]].forEach(function (l) {
          line(p.x + l[0], p.y + l[1], p.x + l[2], p.y + l[3], 2);
        });
      }
      var inner = PT.innerText(p);
      if (inner) text(inner.text, p.x + HALF, p.y + inner.y, inner.size, { bold: true, color: p.isAffected ? '#FFFFFF' : '#000000' });
      if (p.isProband) {
        line(p.x - 28.3, p.y + 78.3, p.x, p.y + 50, 3, true);
        text('P', p.x - 38, p.y + 88, 13, { bold: true, align: 'left' });
      }

      var lineY = p.y + S + 14;
      var info = gen.info[p.id];
      if (opts.showNumbers && info) { text(String(info.index), p.x + HALF, lineY, 11, { color: '#444444' }); lineY += 14; }
      if (p.gender === 'abortion' && p.pregnancyEnd === 'ectopic') { text('ECT', p.x + HALF, lineY, 11, { bold: true }); lineY += 14; }
      if (p.name) { text(p.name, p.x + HALF, lineY, 12, { bold: true }); lineY += 14; }
      if (p.note) {
        var size = p.noteSize || 10;
        p.note.split('\n').forEach(function (t, i) {
          text(t, p.x + HALF, lineY + i * size * 1.2, size, { color: '#444444' });
        });
      }
    }

    // ---- ilişkiler ----
    var byId = {};
    people.forEach(function (p) { byId[p.id] = p; });

    function drawMating(m) {
      var a = byId[m.partner1Id], b = byId[m.partner2Id];
      if (!a || !b) return;
      var ax = a.x + HALF, ay = a.y + HALF, bx = b.x + HALF, by = b.y + HALF;
      var mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (m.type === 'consanguinity') {
        line(ax, ay - 3, bx, by - 3, 2);
        line(ax, ay + 3, bx, by + 3, 2);
      } else {
        line(ax, ay, bx, by, 2);
      }
      if (m.isDivorced) {
        line(mx - 9, my + 9, mx - 1, my - 9, 2);
        line(mx - 1, my + 9, mx + 7, my - 9, 2);
      }
      if (m.label) text(m.label, mx, my - 12, 11);
      if (m.childless) {
        var g = PT.childlessGeometry(mx, my, m.childless);
        g.lines.forEach(function (l) { line(l[0], l[1], l[2], l[3], 2); });
        if (m.childlessNote) text(m.childlessNote, mx, g.textY, 10, { color: '#333333' });
      }

      // Çocuklar: ekrandakiyle aynı kardeş çizgisi geometrisi (PT.sibshipGeometry).
      var kids = PT.childLinksOf(m.id, rels).map(function (r) { return byId[r.childId]; });
      PT.sibshipGeometry(a, b, m, kids).lines.forEach(function (l) {
        line(l.x1, l.y1, l.x2, l.y2, 2);
      });
    }

    // Çizim sırası: önce çizgiler, sonra semboller (semboller çizgilerin üstünde kalsın).
    rels.filter(PT.isMating).forEach(drawMating);
    people.forEach(drawPerson);

    (state.labels || []).forEach(function (l) {
      text(l.text, l.x, l.y, l.fontSize || 14, { bold: true, align: 'left' });
    });

    if (opts.showNumbers) {
      gen.levels.forEach(function (L) {
        var row = gen.byLevel[L];
        if (!row || !row.length) return;
        var minX = Math.min.apply(null, row.map(function (p) { return p.x; }));
        var minY = Math.min.apply(null, row.map(function (p) { return p.y; }));
        text(PT.roman(L), minX - 60, minY + HALF + 6, 18, { bold: true, color: '#444444' });
      });
    }

    // ---- başlık ve alt bilgi (slayt koordinatlarıyla) ----
    slide.addText(opts.title || PT.t('doc.title'), {
      x: 0.35, y: 0.12, w: 9.3, h: 0.42, fontFace: 'Arial', fontSize: 18, bold: true,
      color: '1F2933', margin: 0, valign: 'middle',
    });

    if (opts.logo) {
      // Logo bilerek küçük: slaytta imza gibi durur, çizimin önüne geçmez.
      slide.addImage({ data: opts.logo, x: 0.35, y: 5.2, w: 0.28, h: 0.28 });
      slide.addText([
        { text: 'PEDIGREE TOOL', options: { bold: true, fontSize: 7, color: '1F2933', breakLine: true } },
        { text: opts.title || '', options: { fontSize: 6, color: '6B7280' } },
      ], { x: 0.69, y: 5.2, w: 3, h: 0.28, fontFace: 'Arial', margin: 0, valign: 'middle' });
    }

    if (defs.length) {
      // Lejant: sağ alt köşede, sağdan sola iki satıra kadar.
      var itemW = function (d) { return 0.28 + d.name.length * 0.065; };
      var x = SLIDE_W - 0.35, row = 0;
      var rowsY = [5.08, 5.3];
      defs.slice().reverse().forEach(function (d) {
        var w = itemW(d);
        if (x - w < 4.2 && row === 0) { row = 1; x = SLIDE_W - 0.35; }
        x -= w;
        var y = rowsY[row];
        slide.addShape('rect', { x: x, y: y + 0.03, w: 0.13, h: 0.13, fill: { color: hex(d.color) }, line: { color: '999999', width: 0.5 } });
        slide.addText(d.name, { x: x + 0.18, y: y, w: w - 0.18, h: 0.2, fontFace: 'Arial', fontSize: 9, color: '333333', margin: 0, valign: 'middle' });
        x -= 0.12;
      });
    }

    return pptx;
  };

  // SVG -> PNG. data: URL kullanılır; blob'un aksine file:// altında da
  // canvas'ı "tainted" yapmaz, yani toDataURL çalışır.
  function svgToPng(svgEl, scale) {
    var str = new XMLSerializer().serializeToString(svgEl);
    var w = parseFloat(svgEl.getAttribute('width'));
    var h = parseFloat(svgEl.getAttribute('height'));
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = Math.round(w * scale);
        c.height = Math.round(h * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        try { resolve({ dataUrl: c.toDataURL('image/png'), width: c.width, height: c.height }); }
        catch (err) { reject(err); }
      };
      img.onerror = function () { reject(new Error(PT.t('msg.renderFail'))); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
    });
  }

  // Logo PNG'si (SVG kaynağından; dosya okumadan, file:// altında da çalışır).
  var logoCache = null;
  PT.logoPng = function () {
    if (logoCache) return logoCache;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('xmlns', NS);
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('width', '64');
    svg.setAttribute('height', '64');
    svg.innerHTML = PT.LOGO_MARKUP;
    logoCache = svgToPng(svg, 4).catch(function () { logoCache = null; return null; });
    return logoCache;
  };
})(window.PT);
