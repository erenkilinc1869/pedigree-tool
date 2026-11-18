// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Sol panel: çizim komutları.
(function (PT) {
  'use strict';

  var h = PT.h;
  var React = window.React;
  var t = function (k) { return PT.t(k); };

  function btn(key, label, onClick, opts) {
    opts = opts || {};
    return h('button', {
      key: key,
      onClick: onClick,
      disabled: !!opts.disabled,
      title: opts.title || '',
      className: (opts.className || '') + ' grow',
    }, label);
  }

  function group(key, title, rows) {
    return h('div', { key: key, className: 'group' },
      [h('h4', { key: 'h' }, PT.upper(title))].concat(rows));
  }

  function row(key, items) {
    return h('div', { key: key, className: 'row' }, items);
  }

  PT.Toolbar = function (props) {
    var sel = props.selectedNodeIds || [];
    var st = React.useState('');
    var phenoName = st[0], setPhenoName = st[1];
    var st2 = React.useState('#e11d48');
    var phenoColor = st2[0], setPhenoColor = st2[1];

    var one = sel.length === 1;
    var two = sel.length === 2;
    var three = sel.length === 3;

    return h('div', null, [
      group('layout', t('grp.layout'), [
        row('r1', [
          btn('auto', t('layout.auto'), props.onAutoLayout, { className: 'primary', title: t('layout.autoTip') }),
        ]),
        row('r2', [
          btn('toggle', props.autoLayoutOn ? t('layout.on') : t('layout.off'), props.onToggleAutoLayout, {
            className: props.autoLayoutOn ? 'on mini' : 'mini',
            title: t('layout.toggleTip'),
          }),
        ]),
      ]),

      group('add', t('grp.add'), [
        row('r1', [
          btn('m', t('add.male'), function () { props.onAddIndividual('male'); }),
          btn('f', t('add.female'), function () { props.onAddIndividual('female'); }),
        ]),
        row('r2', [
          btn('u', t('add.unknown'), function () { props.onAddIndividual('unknown'); }),
          btn('t', t('add.text'), props.onAddLabel, { title: t('add.textTip') }),
        ]),
      ]),

      group('link', t('grp.link'), [
        row('r1', [
          btn('p', t('link.partners'), function () { props.onAddRelationship('mating'); },
            { disabled: !two, title: t('tip.select2') }),
        ]),
        row('r2', [
          btn('c', t('link.consang'), function () { props.onAddRelationship('consanguinity'); },
            { disabled: !two, title: t('tip.select2') }),
        ]),
        row('r3', [
          btn('ch', t('link.child'), props.onLinkChild, { disabled: !three, title: t('tip.select3') }),
        ]),
      ]),

      group('child', t('grp.child'), [
        // Abortus ayrı satırda: üçü bir arada İngilizce etiketlerle 260 px'lik panele sığmıyordu.
        row('r1', [
          btn('s', t('child.son'), function () { props.onAddChild('male'); }, { disabled: !two }),
          btn('d', t('child.daughter'), function () { props.onAddChild('female'); }, { disabled: !two }),
        ]),
        row('r1b', [
          btn('a', t('child.abortion'), function () { props.onAddChild('abortion'); }, { disabled: !two }),
        ]),
        row('r2', [
          btn('mzb', 'MZ ♂♂', function () { props.onAddTwins('mono', 'male', 'male'); },
            { disabled: !two, className: 'mini', title: t('twin.mzMale') }),
          btn('mzg', 'MZ ♀♀', function () { props.onAddTwins('mono', 'female', 'female'); },
            { disabled: !two, className: 'mini', title: t('twin.mzFemale') }),
        ]),
        row('r3', [
          btn('dzb', 'DZ ♂♂', function () { props.onAddTwins('di', 'male', 'male'); },
            { disabled: !two, className: 'mini', title: t('twin.dz') }),
          btn('dzg', 'DZ ♀♀', function () { props.onAddTwins('di', 'female', 'female'); },
            { disabled: !two, className: 'mini', title: t('twin.dz') }),
          btn('dzm', 'DZ ♂♀', function () { props.onAddTwins('di', 'male', 'female'); },
            { disabled: !two, className: 'mini', title: t('twin.dz') }),
        ]),
      ]),

      group('family', t('grp.family'), [
        row('r1', [btn('par', t('fam.parents'), props.onAddParents, { disabled: !one })]),
        row('r2', [
          btn('br', t('fam.brother'), function () { props.onAddSibling('male', 'full'); }, { disabled: !one }),
          btn('si', t('fam.sister'), function () { props.onAddSibling('female', 'full'); }, { disabled: !one }),
        ]),
        row('r3', [
          btn('hbf', t('fam.halfBroF'), function () { props.onAddSibling('male', 'half-father'); },
            { disabled: !one, className: 'mini', title: t('fam.halfFTip') }),
          btn('hsf', t('fam.halfSisF'), function () { props.onAddSibling('female', 'half-father'); },
            { disabled: !one, className: 'mini', title: t('fam.halfFTip') }),
        ]),
        row('r4', [
          btn('hbm', t('fam.halfBroM'), function () { props.onAddSibling('male', 'half-mother'); },
            { disabled: !one, className: 'mini', title: t('fam.halfMTip') }),
          btn('hsm', t('fam.halfSisM'), function () { props.onAddSibling('female', 'half-mother'); },
            { disabled: !one, className: 'mini', title: t('fam.halfMTip') }),
        ]),
      ]),

      group('pheno', t('grp.pheno'), [
        row('r1', [
          h('input', {
            key: 'n', type: 'text', placeholder: t('pheno.ph'),
            value: phenoName, onChange: function (e) { setPhenoName(e.target.value); },
          }),
          h('input', {
            key: 'c', type: 'color', value: phenoColor,
            onChange: function (e) { setPhenoColor(e.target.value); },
            style: { width: '38px', height: '30px', padding: 0, border: '1px solid var(--line)' },
          }),
        ]),
        row('r2', [
          btn('add', t('pheno.create'), function () {
            if (!phenoName.trim()) return;
            props.onAddPhenotype(phenoName.trim(), phenoColor);
            setPhenoName('');
          }),
        ]),
      ]),

      group('export', t('grp.export'), [
        row('r1', [btn('ppt', t('exp.pptx'), props.onExportPPT, { title: t('exp.pptxTip') })]),
      ]),

      group('danger', t('grp.selection'), [
        row('r1', [btn('del', t('sel.delete'), props.onDelete, { disabled: !sel.length, className: 'danger' })]),
      ]),
    ]);
  };
})(window.PT);
