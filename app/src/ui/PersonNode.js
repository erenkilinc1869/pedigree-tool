// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Kişi sembolü: şekil (cinsiyet), dolgu (etkilenme), fenotip renkleri,
// durum işaretleri, ad / yıl / not satırları ve kuşak numarası.
(function (PT) {
  'use strict';

  var h = PT.h;
  var React = window.React;
  var S = PT.SIZE, HALF = PT.HALF;

  function shape(gender, extra) {
    var props = extra || {};
    switch (gender) {
      case 'male':
        return h('rect', Object.assign({ x: 0, y: 0, width: S, height: S }, props));
      case 'female':
        return h('circle', Object.assign({ cx: HALF, cy: HALF, r: HALF }, props));
      case 'unknown':
        return h('polygon', Object.assign({ points: '25,0 50,25 25,50 0,25' }, props));
      case 'abortion':
        return h('polygon', Object.assign({ points: '10,40 25,10 40,40' }, props));
      default:
        return h('circle', Object.assign({ cx: HALF, cy: HALF, r: HALF }, props));
    }
  }

  // Merkezden eşit açılı dilimler (şekle clipPath ile kırpılır).
  // Açı: saat 3 = 0°, saat yönünde artar.
  function sectors(list, startDeg) {
    var n = list.length, R = 40;
    return list.map(function (def, i) {
      var a0 = (startDeg + i * 360 / n) * Math.PI / 180;
      var a1 = (startDeg + (i + 1) * 360 / n) * Math.PI / 180;
      var x0 = HALF + R * Math.cos(a0), y0 = HALF + R * Math.sin(a0);
      var x1 = HALF + R * Math.cos(a1), y1 = HALF + R * Math.sin(a1);
      var large = a1 - a0 > Math.PI ? 1 : 0;
      return h('path', {
        key: def.id + '-' + i,
        d: 'M 25 25 L ' + x0 + ' ' + y0 + ' A ' + R + ' ' + R + ' 0 ' + large + ' 1 ' + x1 + ' ' + y1 + ' Z',
        fill: def.color,
      });
    });
  }

  // Fenotip dolgusu: 1 tam, 2 yarım, 3 eşit üçte bir (karede dikey şerit, diğer
  // şekillerde 120° dilim), 4 çeyrek, fazlasında eşit dilimler.
  function phenotypeFill(person, defs) {
    var list = (person.phenotypes || [])
      .map(function (id) { return defs.find(function (d) { return d.id === id; }); })
      .filter(Boolean);
    if (!list.length) return null;
    var c = function (i) { return list[i].color; };
    var n = list.length;
    var body;

    if (n === 1) {
      body = [h('rect', { key: 0, x: 0, y: 0, width: S, height: S, fill: c(0) })];
    } else if (n === 2) {
      body = [
        h('rect', { key: 0, x: 0, y: 0, width: HALF, height: S, fill: c(0) }),
        h('rect', { key: 1, x: HALF, y: 0, width: HALF, height: S, fill: c(1) }),
      ];
    } else if (n === 3) {
      body = person.gender === 'male'
        ? [0, 1, 2].map(function (i) {
            return h('rect', { key: i, x: i * S / 3, y: 0, width: S / 3, height: S, fill: c(i) });
          })
        : sectors(list, PT.THIRDS_START_DEG);
    } else if (n === 4) {
      body = [
        h('rect', { key: 0, x: 0, y: 0, width: HALF, height: HALF, fill: c(0) }),
        h('rect', { key: 1, x: HALF, y: 0, width: HALF, height: HALF, fill: c(1) }),
        h('rect', { key: 2, x: HALF, y: HALF, width: HALF, height: HALF, fill: c(2) }),
        h('rect', { key: 3, x: 0, y: HALF, width: HALF, height: HALF, fill: c(3) }),
      ];
    } else {
      body = sectors(list, -90);
    }
    return body;
  }

  PT.PersonNode = function (props) {
    var p = props.node;
    var scale = props.scale || 1;
    var st = React.useState(false);
    var dragging = st[0], setDragging = st[1];

    // Dinleyiciler doğrudan basma anında bağlanır (effect'e bırakılırsa çok hızlı
    // bir tıklamada mouseup kaçabilir ve seçim gerçekleşmez).
    function begin(cx, cy) {
      if (props.onDragStart) props.onDragStart();
      var startX = cx, startY = cy;
      var ox = p.x, oy = p.y;
      var moved = false;
      setDragging(true);

      // 3 px'lik eşik aşılmadan konum yazılmaz: titreyen bir tıklama geri alma
      // geçmişine boş bir "sürükleme" adımı eklemesin.
      function apply(mx, my) {
        if (!moved && Math.abs(mx - startX) <= 3 && Math.abs(my - startY) <= 3) return;
        moved = true;
        props.onNodeDrag(p.id, ox + (mx - startX) / scale, oy + (my - startY) / scale);
      }
      function cleanup() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        setDragging(false);
      }
      function onMove(e) { apply(e.clientX, e.clientY); }
      function onUp(e) {
        cleanup();
        if (!moved) props.onSelect(p.id, !!(e.ctrlKey || e.metaKey || e.shiftKey));
        if (props.onDragEnd) props.onDragEnd(p.id, moved);
      }
      function onTouchMove(e) {
        var t = e.touches[0];
        if (!t) return;
        if (e.cancelable) e.preventDefault();
        apply(t.clientX, t.clientY);
      }
      function onTouchEnd() {
        cleanup();
        if (!moved) props.onSelect(p.id, false);
        if (props.onDragEnd) props.onDragEnd(p.id, moved);
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    }

    var clipId = 'clip-' + p.id;
    var outline = props.selected ? PT.SEL : PT.INK;
    // Etkilenmiş = mürekkeple dolu, etkilenmemiş = kâğıt renginde (koyu kâğıtta da anlam aynı).
    var fill = p.isAffected ? PT.INK : PT.PAPER;

    var kids = [];

    kids.push(h('defs', { key: 'defs' }, h('clipPath', { id: clipId }, shape(p.gender))));

    if (props.selected) {
      kids.push(h('g', { key: 'sel', className: 'no-export' },
        shape(p.gender, { fill: 'none', stroke: PT.SEL_GLOW, strokeWidth: 6, opacity: 0.3 })));
    }

    kids.push(h('g', { key: 'base' }, shape(p.gender, { fill: fill, stroke: 'none' })));

    var pheno = phenotypeFill(p, props.phenotypeDefs || []);
    if (pheno) kids.push(h('g', { key: 'ph', clipPath: 'url(#' + clipId + ')' }, pheno));

    kids.push(h('g', { key: 'out' }, shape(p.gender, { fill: 'none', stroke: outline, strokeWidth: 2 })));

    if (p.isCarrier) {
      kids.push(h('circle', { key: 'carrier', cx: HALF, cy: HALF, r: 8, fill: PT.INK }));
    }
    if (p.isDeceased) {
      kids.push(h('line', { key: 'dec', x1: -4, y1: S + 4, x2: S + 4, y2: -4, stroke: PT.INK, strokeWidth: 3 }));
    }
    if (p.isAdopted) {
      kids.push(h('g', { key: 'adopt', stroke: PT.INK, strokeWidth: 2, fill: 'none' }, [
        h('polyline', { key: 'l', points: '-5,-6 -11,-6 -11,56 -5,56' }),
        h('polyline', { key: 'r', points: '55,-6 61,-6 61,56 55,56' }),
      ]));
    }
    // Terminasyon (TOP): üçgenin üzerinden çapraz çizgi.
    if (p.gender === 'abortion' && p.pregnancyEnd === 'top') {
      kids.push(h('line', { key: 'top', x1: 4, y1: 48, x2: 46, y2: 4, stroke: PT.INK, strokeWidth: 2.5 }));
    }

    // Sembol içi yazı: toplu sembol sayısı > gebelik (P) > ölü doğum (SB).
    var inner = PT.innerText(p);
    if (inner) {
      kids.push(h('text', {
        key: 'inner', x: HALF, y: inner.y, textAnchor: 'middle', fontSize: inner.size, fontWeight: 'bold',
        fill: p.isAffected ? PT.PAPER : PT.INK,
      }, inner.text));
    }
    if (p.isProband) {
      kids.push(h('g', { key: 'prb' }, [
        h('g', { key: 'arrow', transform: 'translate(0, 50) rotate(-45)' }, [
          h('line', { key: 'l', x1: -40, y1: 0, x2: 0, y2: 0, stroke: PT.INK, strokeWidth: 3 }),
          h('polygon', { key: 'a', points: '0,0 -12,-6 -12,6', fill: PT.INK }),
        ]),
        h('text', { key: 'p', x: -38, y: 88, fontSize: 13, fontWeight: 'bold', fill: PT.INK }, 'P'),
      ]));
    }

    // Birey numarası sembolün hemen altında (kardeş çizgisi üst tarafı kullandığı
    // için standart gösterimde olduğu gibi aşağıya yazılır).
    var lineY = S + 14;
    if (props.genLabel) {
      kids.push(h('text', {
        key: 'gen', x: HALF, y: lineY, textAnchor: 'middle', fontSize: 11, fill: PT.INK_SOFT,
      }, props.genLabel));
      lineY += 14;
    }
    if (p.gender === 'abortion' && p.pregnancyEnd === 'ectopic') {
      kids.push(h('text', {
        key: 'ect', x: HALF, y: lineY, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: PT.INK,
      }, 'ECT'));
      lineY += 14;
    }

    // Ad ve yıllar
    if (p.name) {
      kids.push(h('text', {
        key: 'name', x: HALF, y: lineY, textAnchor: 'middle', fontSize: 12, fontWeight: 'bold', fill: PT.INK,
      }, p.name));
      lineY += 14;
    }
    if (p.note) {
      var size = p.noteSize || 10;
      kids.push(h('text', {
        key: 'note', x: HALF, y: lineY, textAnchor: 'middle', fontSize: size, fill: PT.INK_SOFT,
      }, p.note.split('\n').map(function (line, i) {
        return h('tspan', { key: i, x: HALF, dy: i === 0 ? 0 : size * 1.2 }, line);
      })));
    }

    return h('g', {
      transform: 'translate(' + p.x + ', ' + p.y + ')',
      style: { cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none', touchAction: 'none' },
      onMouseDown: function (e) {
        if (e.button !== 0) return;
        e.stopPropagation();
        begin(e.clientX, e.clientY);
      },
      onTouchStart: function (e) {
        e.stopPropagation();
        var t = e.touches[0];
        if (t) begin(t.clientX, t.clientY);
      },
    }, kids);
  };
})(window.PT);
