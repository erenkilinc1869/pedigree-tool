// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// İlişki çizgileri: eş / akraba evliliği çizgisi ve çiftin kardeş çizgisi.
(function (PT) {
  'use strict';

  var h = PT.h;
  var React = window.React;
  var HALF = PT.HALF;

  PT.RelationshipLine = function (props) {
    var rel = props.relationship;
    var src = props.sourceNode;
    var tgt = props.targetNode;

    if (!src || !tgt) return null;

    // ---- Eş / akraba evliliği ----
    if (PT.isMating(rel)) {
      var ax = src.x + HALF, ay = src.y + HALF;
      var bx = tgt.x + HALF, by = tgt.y + HALF;
      var mx = (ax + bx) / 2, my = (ay + by) / 2;

      var d = 'M ' + ax + ' ' + ay + ' L ' + bx + ' ' + by;
      if (rel.type === 'consanguinity') {
        d = 'M ' + ax + ' ' + (ay - 3) + ' L ' + bx + ' ' + (by - 3) +
            ' M ' + ax + ' ' + (ay + 3) + ' L ' + bx + ' ' + (by + 3);
      }

      var parts = [h('path', { key: 'l', d: d, stroke: PT.INK, strokeWidth: 2, fill: 'none' })];

      // Boşanma: standart gösterim iki eğik çizgidir.
      if (rel.isDivorced) {
        parts.push(h('g', { key: 'div', stroke: PT.INK, strokeWidth: 2 }, [
          h('line', { key: 'a', x1: mx - 9, y1: my + 9, x2: mx - 1, y2: my - 9 }),
          h('line', { key: 'b', x1: mx - 1, y1: my + 9, x2: mx + 7, y2: my - 9 }),
        ]));
      }
      if (rel.label) {
        parts.push(h('text', {
          key: 't', x: mx, y: my - 12, textAnchor: 'middle', fontSize: 11, fill: PT.INK,
        }, rel.label));
      }

      // Çocuksuzluk: eş çizgisinden inen kısa çizgi + tek (tercih/bilinmiyor)
      // ya da çift (infertilite) yatay çubuk; altına neden yazılabilir.
      if (rel.childless) {
        var g = PT.childlessGeometry(mx, my, rel.childless);
        parts.push(h('g', { key: 'cl', stroke: PT.INK, strokeWidth: 2 }, g.lines.map(function (l, i) {
          return h('line', { key: i, x1: l[0], y1: l[1], x2: l[2], y2: l[3] });
        })));
        if (rel.childlessNote) {
          parts.push(h('text', {
            key: 'cln', x: mx, y: g.textY, textAnchor: 'middle', fontSize: 10, fill: PT.INK_NOTE,
          }, rel.childlessNote));
        }
      }
      return h('g', null, parts);
    }

    return null;
  };

  // Kardeş çizgisi: çift başına bir kez çizilir (çocuk başına çizildiğinde ortak
  // iniş çizgisi üst üste binip kalınlaşıyor, her çocuk için ayrı tutamak çıkıyordu).
  // Geometri PPTX ile ortaktır: PT.sibshipGeometry.
  PT.SibshipLine = function (props) {
    var mating = props.mating;
    var scale = props.scale || 1;
    var startRef = React.useRef(0);
    var baseRef = React.useRef(0);

    var geo = PT.sibshipGeometry(props.a, props.b, mating, props.kids);
    if (!geo.handle) return null;
    var drop = mating.lineOffsetY || PT.DEFAULT_DROP;

    function beginDrag(clientY) {
      if (props.onDragStart) props.onDragStart();
      startRef.current = clientY;
      baseRef.current = drop;
    }

    function onMouseDown(e) {
      e.stopPropagation();
      e.preventDefault();
      if (!props.onUpdateLineHeight) return;
      beginDrag(e.clientY);
      var move = function (ev) {
        props.onUpdateLineHeight(mating.id, baseRef.current + (ev.clientY - startRef.current) / scale);
      };
      var up = function () {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        if (props.onDragEnd) props.onDragEnd();
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    }

    function onTouchStart(e) {
      e.stopPropagation();
      var t0 = e.touches[0];
      if (!t0 || !props.onUpdateLineHeight) return;
      beginDrag(t0.clientY);
      var move = function (ev) {
        var t = ev.touches[0];
        if (!t) return;
        if (ev.cancelable) ev.preventDefault();
        props.onUpdateLineHeight(mating.id, baseRef.current + (t.clientY - startRef.current) / scale);
      };
      var end = function () {
        window.removeEventListener('touchmove', move);
        window.removeEventListener('touchend', end);
        if (props.onDragEnd) props.onDragEnd();
      };
      window.addEventListener('touchmove', move, { passive: false });
      window.addEventListener('touchend', end);
    }

    // Ayrı çizgiler köşelerde boşluk bırakmasın diye uçlar kare (çizgi kalınlığının
    // yarısı kadar uzar; çocuk ucundaki fazlalık sembolün altında kalır).
    var segs = geo.lines.map(function (l, i) {
      return h('line', {
        key: i, 'data-kind': l.kind, x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2,
        stroke: PT.INK, strokeWidth: 2, strokeLinecap: 'square',
      });
    });

    // Kardeş çizgisini yukarı/aşağı almaya yarayan tutamak (baskıya girmez).
    var handle = h('g', {
      key: 'handle',
      className: 'no-export sib-handle',
      style: { cursor: 'ns-resize', touchAction: 'none' },
      onMouseDown: onMouseDown,
      onTouchStart: onTouchStart,
    }, [
      h('circle', { key: 'hit', cx: geo.handle.x, cy: geo.handle.y, r: 14, fill: 'transparent' }),
      h('circle', { key: 'dot', cx: geo.handle.x, cy: geo.handle.y, r: 2.5, fill: PT.INK }),
    ]);

    return h('g', { 'data-sibship': mating.id }, [h('g', { key: 'l' }, segs), handle]);
  };
})(window.PT);
