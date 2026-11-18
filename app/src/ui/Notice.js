// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Uygulama içi bilgi / uyarı penceresi. window.alert yerine kullanılır: Electron'da
// (Windows) yerel uyarı kutusu kapandıktan sonra sayfa klavye odağını geri alamıyor
// ve pencere arka plana alınıp geri getirilene kadar hiçbir kutuya yazı yazılamıyordu.
(function (PT) {
  'use strict';

  var h = PT.h;
  var React = window.React;

  PT.NoticeDialog = function (props) {
    var okRef = React.useRef(null);

    // Açılınca odak "Tamam" düğmesine; kapanınca açan öğeye döner.
    React.useEffect(function () {
      var before = document.activeElement;
      if (okRef.current) okRef.current.focus();
      return function () {
        if (before && before.focus && document.contains(before)) before.focus();
      };
    }, []);

    function onKeyDown(e) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        props.onClose();
      } else if (e.key === 'Tab') {
        // Tek düğme var: odak pencerenin dışına çıkmasın.
        e.preventDefault();
        if (okRef.current) okRef.current.focus();
      }
    }

    return h('div', {
      className: 'modal-backdrop',
      onMouseDown: function (e) { if (e.target === e.currentTarget) props.onClose(); },
    }, h('div', {
      className: 'modal notice', role: 'alertdialog', 'aria-modal': 'true',
      'aria-describedby': 'notice-text', onKeyDown: onKeyDown,
    }, [
      h('div', { key: 'body', className: 'modal-body' },
        h('p', { id: 'notice-text', className: 'notice-text' }, props.message)),
      h('div', { key: 'foot', className: 'modal-foot' },
        h('button', { ref: okRef, type: 'button', className: 'primary', onClick: props.onClose }, PT.t('msg.ok'))),
    ]));
  };
})(window.PT);
