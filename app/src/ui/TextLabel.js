// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Serbest metin etiketi (aile adı, açıklama, kuşak notu vb.).
(function (PT) {
  'use strict';

  var h = PT.h;
  var React = window.React;

  PT.TextLabel = function (props) {
    var lab = props.label;
    var scale = props.scale || 1;
    var st = React.useState(false);
    var dragging = st[0], setDragging = st[1];

    function begin(cx, cy) {
      if (props.onDragStart) props.onDragStart();
      var startX = cx, startY = cy;
      var ox = lab.x, oy = lab.y;
      var moved = false;
      setDragging(true);

      // 3 px'lik eşik aşılmadan konum yazılmaz: titreyen bir tıklama geri alma
      // geçmişine boş bir "sürükleme" adımı eklemesin.
      function apply(mx, my) {
        if (!moved && Math.abs(mx - startX) <= 3 && Math.abs(my - startY) <= 3) return;
        moved = true;
        props.onDrag(lab.id, ox + (mx - startX) / scale, oy + (my - startY) / scale);
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
        if (!moved) props.onSelect(lab.id, !!(e.ctrlKey || e.metaKey || e.shiftKey));
        if (props.onDragEnd) props.onDragEnd(lab.id, moved);
      }
      function onTouchMove(e) {
        var t = e.touches[0];
        if (!t) return;
        if (e.cancelable) e.preventDefault();
        apply(t.clientX, t.clientY);
      }
      function onTouchEnd() {
        cleanup();
        if (!moved) props.onSelect(lab.id, false);
        if (props.onDragEnd) props.onDragEnd(lab.id, moved);
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    }

    var size = lab.fontSize || 14;
    var kids = [];
    if (props.selected) {
      kids.push(h('rect', {
        key: 'sel', className: 'no-export',
        x: -5, y: -size - 3, width: (lab.text || '').length * size * 0.62 + 10, height: size + 10,
        fill: 'none', stroke: PT.SEL, strokeDasharray: '4',
      }));
    }
    kids.push(h('text', {
      key: 't', x: 0, y: 0, fontSize: size, fontWeight: 'bold', fill: PT.INK,
      style: { userSelect: 'none' },
    }, lab.text));

    return h('g', {
      transform: 'translate(' + lab.x + ', ' + lab.y + ')',
      style: { cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' },
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
