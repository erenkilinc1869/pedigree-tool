// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Ayarlar penceresi: tema, koyu temada çizim alanı, dil, ızgara ve numaralar.
// Değişiklikler hemen uygulanır (Uygula düğmesi yok). Esc, "Kapat" ya da karartılmış
// zemine tıklamak kapatır. Açılınca odak pencereye girer, kapanınca eski yerine döner.
(function (PT) {
  'use strict';

  var h = PT.h;
  var React = window.React;
  var t = function (k, v) { return PT.t(k, v); };

  // Tek seçimli düğme grubu (radyo düğmesi gibi davranır, ok tuşlarıyla da gezilir).
  function segmented(key, labelId, options, value, onPick) {
    function onKeyDown(e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var i = options.findIndex(function (o) { return o.value === value; });
      var n = options.length;
      var next = options[(i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n];
      onPick(next.value);
      var grp = e.currentTarget;
      setTimeout(function () {
        var b = grp.querySelector('[data-value="' + next.value + '"]');
        if (b) b.focus();
      }, 0);
    }
    return h('div', { key: key, className: 'seg', role: 'radiogroup', 'aria-labelledby': labelId, onKeyDown: onKeyDown },
      options.map(function (o) {
        var on = o.value === value;
        return h('button', {
          key: o.value, type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false',
          'data-value': o.value, tabIndex: on ? 0 : -1,
          className: on ? 'on' : '',
          onClick: function () { onPick(o.value); },
        }, o.label);
      }));
  }

  function check(key, checked, onChange, label) {
    return h('label', { key: key, className: 'set-check' }, [
      h('input', {
        key: 'i', type: 'checkbox', checked: checked,
        onChange: function (e) { onChange(e.target.checked); },
      }),
      h('span', { key: 's' }, label),
    ]);
  }

  PT.SettingsDialog = function (props) {
    var a = props.appearance;
    var boxRef = React.useRef(null);

    // Açılınca odak seçili temaya; kapanınca açan öğeye (ör. dişli düğmesi) döner.
    React.useEffect(function () {
      var before = document.activeElement;
      var box = boxRef.current;
      var first = box && (box.querySelector('[role="radio"][aria-checked="true"]') || box);
      if (first) first.focus();
      return function () {
        if (before && before.focus && document.contains(before)) before.focus();
      };
    }, []);

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        props.onClose();
        return;
      }
      // Tab odağı pencerenin içinde tutar (arkadaki çizim alanına kaçmasın).
      if (e.key === 'Tab') {
        var items = Array.prototype.slice.call(boxRef.current.querySelectorAll(
          'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), select:not([disabled])'));
        if (!items.length) return;
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === boxRef.current)) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    }

    var modeName = t(a.theme === 'dark' ? 'set.dark' : 'set.light');
    var canvasApplies = a.theme === 'dark';

    var body = [
      h('div', { key: 'theme', className: 'set-sec' }, [
        h('h3', { key: 'h', id: 'set-theme-h' }, t('set.theme')),
        segmented('s', 'set-theme-h', [
          { value: 'system', label: t('set.system') },
          { value: 'light', label: t('set.light') },
          { value: 'dark', label: t('set.dark') },
        ], a.pref, props.onTheme),
        a.pref === 'system'
          ? h('p', { key: 'n', className: 'set-note' }, t('set.systemNote', { mode: modeName }))
          : null,
      ]),
      h('div', { key: 'canvas', className: 'set-sec' + (canvasApplies ? '' : ' inactive') }, [
        h('h3', { key: 'h', id: 'set-canvas-h' }, t('set.canvas')),
        segmented('s', 'set-canvas-h', [
          { value: 'dark', label: t('set.canvasDark') },
          { value: 'white', label: t('set.canvasWhite') },
        ], a.darkCanvas, props.onDarkCanvas),
        h('p', { key: 'n', className: 'set-note' },
          (canvasApplies ? '' : t('set.canvasInactive') + ' ') + t('set.canvasNote')),
      ]),
      h('div', { key: 'lang', className: 'set-sec' }, [
        h('h3', { key: 'h', id: 'set-lang-h' }, t('lang.label')),
        segmented('s', 'set-lang-h', [
          { value: 'tr', label: 'Türkçe' },
          { value: 'en', label: 'English' },
        ], props.lang, props.onLang),
      ]),
      h('div', { key: 'view', className: 'set-sec' }, [
        h('h3', { key: 'h' }, t('set.drawing')),
        check('grid', props.showGrid, props.onGrid, t('set.grid')),
        check('num', props.showNumbers, props.onNumbers, t('set.numbers')),
      ]),
    ];

    return h('div', {
      className: 'modal-backdrop',
      // Yalnızca zeminin kendisine basılınca kapanır (pencere içinden sürükleyip
      // dışarıda bırakmak kapatmasın).
      onMouseDown: function (e) { if (e.target === e.currentTarget) props.onClose(); },
    }, h('div', {
      ref: boxRef, className: 'modal settings', role: 'dialog', 'aria-modal': 'true',
      'aria-labelledby': 'set-title', tabIndex: -1, onKeyDown: onKeyDown,
    }, [
      h('div', { key: 'head', className: 'modal-head' }, h('h2', { id: 'set-title' }, t('set.title'))),
      h('div', { key: 'body', className: 'modal-body' }, body),
      h('div', { key: 'foot', className: 'modal-foot' },
        h('button', { type: 'button', className: 'primary', onClick: props.onClose }, t('set.close'))),
    ]));
  };
})(window.PT);
