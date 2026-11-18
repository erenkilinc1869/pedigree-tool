// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// İlk açılış ekranı: dil seçimi, bilgilendirme / kullanım koşulları ve kısayollar.
// Kurulum programının yaptığı işi üstlenir (uygulama kurulumsuz dağıtılır).
(function (PT) {
  'use strict';

  var h = PT.h;
  var React = window.React;

  PT.FirstRun = function (props) {
    var langPair = React.useState(PT.lang);
    var lang = langPair[0], setLang = langPair[1];
    var deskPair = React.useState(true);
    var desktop = deskPair[0], setDesktop = deskPair[1];
    var startPair = React.useState(true);
    var startMenu = startPair[0], setStartMenu = startPair[1];
    var busyPair = React.useState(false);
    var busy = busyPair[0], setBusy = busyPair[1];

    function pickLang(l) {
      PT.setLang(l);
      setLang(l);
    }

    function langButton(code, label) {
      return h('button', {
        key: code, className: lang === code ? 'on' : '',
        onClick: function () { pickLang(code); },
      }, label);
    }

    function checkbox(key, checked, onChange, label) {
      return h('label', { key: key, className: 'fr-check' }, [
        h('input', { key: 'i', type: 'checkbox', checked: checked, onChange: function (e) { onChange(e.target.checked); } }),
        h('span', { key: 's' }, label),
      ]);
    }

    return h('div', { className: 'firstrun' }, h('div', { className: 'fr-card' }, [
      h('div', { key: 'head', className: 'fr-head' }, [
        h('img', { key: 'logo', src: 'assets/EK-logo.svg', alt: 'EK' }),
        h('div', { key: 't' }, [
          h('h1', { key: 'h' }, PT.t('first.welcome')),
          h('p', { key: 'p' }, PT.t('first.intro')),
        ]),
        h('div', { key: 'lang', className: 'fr-lang', title: PT.t('lang.label') }, [
          langButton('tr', 'Türkçe'),
          langButton('en', 'English'),
        ]),
      ]),
      h('div', { key: 'terms', className: 'fr-terms' }, PT.TERMS[lang]),
      props.native ? h('div', { key: 'opts', className: 'fr-opts' }, [
        checkbox('d', desktop, setDesktop, PT.t('first.desktop')),
        checkbox('s', startMenu, setStartMenu, PT.t('first.startMenu')),
      ]) : null,
      h('div', { key: 'actions', className: 'fr-actions' }, [
        h('button', { key: 'c', onClick: props.onCancel, disabled: busy }, PT.t('first.cancel')),
        h('button', {
          key: 'a', className: 'primary', disabled: busy,
          onClick: function () {
            setBusy(true);
            props.onAccept({ lang: lang, desktop: desktop, startMenu: startMenu });
          },
        }, PT.t('first.accept')),
      ]),
    ]));
  };
})(window.PT);
