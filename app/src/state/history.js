// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Geri al / yinele. Sürükleme sırasındaki ara adımlar "transient" olarak
// yazılır; sürükleme başlarken bir checkpoint alınır, böylece bir sürükleme
// tek bir geri alma adımıdır.
(function (PT) {
  'use strict';

  var React = window.React;

  function resolve(value, current) {
    return typeof value === 'function' ? value(current) : value;
  }

  PT.useHistory = function (initial, limit) {
    limit = limit || 100;
    var pair = React.useState({ past: [], present: initial, future: [] });
    var hist = pair[0], setHist = pair[1];

    var set = React.useCallback(function (value, opts) {
      setHist(function (h) {
        var next = resolve(value, h.present);
        if (Object.is(next, h.present)) return h;
        if (opts && opts.transient) return { past: h.past, present: next, future: h.future };
        var past = h.past.concat([h.present]);
        if (past.length > limit) past.shift();
        return { past: past, present: next, future: [] };
      });
    }, [limit]);

    var checkpoint = React.useCallback(function () {
      setHist(function (h) {
        var past = h.past.concat([h.present]);
        if (past.length > limit) past.shift();
        return { past: past, present: h.present, future: [] };
      });
    }, [limit]);

    var undo = React.useCallback(function () {
      setHist(function (h) {
        if (!h.past.length) return h;
        var prev = h.past[h.past.length - 1];
        return {
          past: h.past.slice(0, -1),
          present: prev,
          future: [h.present].concat(h.future),
        };
      });
    }, []);

    var redo = React.useCallback(function () {
      setHist(function (h) {
        if (!h.future.length) return h;
        return {
          past: h.past.concat([h.present]),
          present: h.future[0],
          future: h.future.slice(1),
        };
      });
    }, []);

    // Dosya açma / yeni çizim de geri alınabilir olsun diye geçmişe yazılır.
    var replace = React.useCallback(function (next) {
      setHist(function (h) {
        var past = h.past.concat([h.present]);
        if (past.length > limit) past.shift();
        return { past: past, present: next, future: [] };
      });
    }, [limit]);

    return {
      state: hist.present,
      set: set,
      checkpoint: checkpoint,
      undo: undo,
      redo: redo,
      replace: replace,
      canUndo: hist.past.length > 0,
      canRedo: hist.future.length > 0,
    };
  };
})(window.PT);
