// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Sağ panel: seçili kişinin ya da metin etiketinin ayrıntıları.
(function (PT) {
  'use strict';

  var h = PT.h;
  var t = function (k, v) { return PT.t(k, v); };

  // [durum anahtarı, kişi alanı]; etiket ve açıklama sözlükten gelir (st.<anahtar>, st.<anahtar>Tip).
  var STATUSES = [
    ['deceased', 'isDeceased'],
    ['proband', 'isProband'],
    ['affected', 'isAffected'],
    ['carrier', 'isCarrier'],
    ['pregnancy', 'isPregnancy'],
    ['stillbirth', 'isStillbirth'],
    ['adopted', 'isAdopted'],
  ];

  // Grup başlığı. Büyük harfe çevirme çağıranda, dile göre PT.upper ile yapılır;
  // böylece başlığa eklenen eş adı gibi kısımlar olduğu gibi kalır.
  function heading(text) {
    return h('h4', { key: 'h' }, text);
  }

  function field(key, label, input) {
    return h('label', { key: key, className: 'field' }, [
      h('span', { key: 's' }, label),
      input,
    ]);
  }

  PT.DetailsPanel = function (props) {
    var lab = props.selectedLabel;

    if (lab) {
      return h('div', { className: 'group' }, [
        heading(PT.upper(t('det.label'))),
        field('t', t('det.text'), h('input', {
          type: 'text', value: lab.text || '',
          onChange: function (e) { props.onUpdateLabelText(lab.id, e.target.value); },
        })),
        field('s', t('det.fontSize'), h('input', {
          type: 'number', min: 8, max: 72, value: lab.fontSize || 14,
          onChange: function (e) { props.onUpdateLabelSize(lab.id, Number(e.target.value)); },
        })),
      ]);
    }

    var p = props.selectedNode;
    if (!p) return h('div', { className: 'empty' }, t('det.empty'));

    var rows = [];

    rows.push(h('div', { key: 'id', className: 'group' }, [
      heading(PT.upper(t('det.person')) + (props.genLabel ? ' · ' + props.genLabel : '')),
      field('name', t('det.name'), h('input', {
        type: 'text', value: p.name || '',
        onChange: function (e) { props.onUpdateField('name', e.target.value); },
      })),
      field('note', t('det.note'), h('textarea', {
        rows: 3, value: p.note || '', placeholder: 'NM_000138.5:c.1234G>A, het',
        onChange: function (e) { props.onUpdateField('note', e.target.value); },
      })),
      field('ns', t('det.noteSize'), h('input', {
        type: 'number', min: 6, max: 30, value: p.noteSize || 10,
        style: { width: '70px' },
        onChange: function (e) { props.onUpdateField('noteSize', Number(e.target.value)); },
      })),
    ]));

    // Sembol ayrıntıları: toplu sembol ve (abortusta) gebelik sonucu.
    var symRows = [
      field('cnt', t('det.count'), h('input', {
        type: 'text', maxLength: 3, value: p.countLabel || '',
        placeholder: t('det.countPh'),
        style: { width: '180px' },
        onChange: function (e) { props.onUpdateField('countLabel', e.target.value.trim()); },
      })),
    ];
    if (p.gender === 'abortion') {
      symRows.push(field('pe', t('det.outcome'), h('select', {
        value: p.pregnancyEnd || '',
        onChange: function (e) { props.onUpdateField('pregnancyEnd', e.target.value); },
      }, [
        h('option', { key: 's', value: '' }, t('det.sab')),
        h('option', { key: 't', value: 'top' }, t('det.top')),
        h('option', { key: 'e', value: 'ectopic' }, t('det.ect')),
      ])));
    }
    rows.push(h('div', { key: 'sym', className: 'group' },
      [heading(PT.upper(t('det.symbol')))].concat(symRows)));

    rows.push(h('div', { key: 'status', className: 'group' }, [
      heading(PT.upper(t('det.status'))),
      h('div', { key: 'b', style: { display: 'flex', flexWrap: 'wrap', gap: '5px' } },
        STATUSES.map(function (s) {
          return h('button', {
            key: s[0],
            title: t('st.' + s[0] + 'Tip'),
            className: p[s[1]] ? 'on' : '',
            onClick: function () { props.onToggleStatus(s[0]); },
          }, t('st.' + s[0]));
        })),
    ]));

    // Her eş ilişkisi ayrı blok: birden çok evlilikte hangisinin düzenlendiği
    // başlıktaki eş adından anlaşılır.
    (props.relBlocks || []).forEach(function (blk) {
      var m = blk.mating;
      var hasKids = blk.childCount > 0;
      rows.push(h('div', { key: 'rel-' + m.id, className: 'group rel-block', 'data-mating': m.id }, [
        heading(PT.upper(t('det.rel')) + ' · ' + t('det.relWith', { who: blk.who })),
        h('div', { key: 'd', className: 'row' }, [
          h('button', {
            key: 'b', className: m.isDivorced ? 'on grow' : 'grow',
            onClick: function () { props.onToggleDivorce(m.id); },
          }, m.isDivorced ? t('det.divorcedUndo') : t('det.divorce')),
        ]),
        field('l', t('det.relLabel'), h('input', {
          type: 'text', value: m.label || '',
          onChange: function (e) { props.onUpdateRelLabel(m.id, e.target.value); },
        })),
        field('cl', hasKids ? t('det.childlessOff') : t('det.childless'), h('select', {
          value: m.childless || '',
          disabled: hasKids && !m.childless,
          onChange: function (e) { props.onUpdateRel(m.id, { childless: e.target.value }); },
        }, [
          h('option', { key: 'n', value: '' }, '—'),
          h('option', { key: 'c', value: 'none' }, t('det.childNone')),
          h('option', { key: 'i', value: 'infertile' }, t('det.infertile')),
        ])),
        m.childless ? field('cln', t('det.reason'), h('input', {
          type: 'text', value: m.childlessNote || '',
          onChange: function (e) { props.onUpdateRel(m.id, { childlessNote: e.target.value }); },
        })) : null,
        h('div', { key: 'rm', className: 'row' }, [
          h('button', {
            key: 'x', className: 'danger grow unlink',
            onClick: function () { props.onRemoveMating(m.id); },
          }, t('det.unlink')),
        ]),
      ]));
    });

    if (props.parentInfo) {
      rows.push(h('div', { key: 'parents', className: 'group' }, [
        heading(PT.upper(t('det.parents'))),
        h('div', { key: 'w', className: 'who' }, props.parentInfo.who),
        h('div', { key: 'rm', className: 'row' }, [
          h('button', {
            key: 'x', className: 'danger grow unlink-parents',
            onClick: function () { props.onRemoveParentLink(p.id); },
          }, t('det.unlinkParents')),
        ]),
      ]));
    }

    var defs = props.phenotypeDefs || [];
    rows.push(h('div', { key: 'ph', className: 'group' }, [
      heading(PT.upper(t('det.phenos'))),
      defs.length === 0
        ? h('div', { key: 'e', className: 'muted' }, t('det.noPhenos'))
        : h('div', { key: 'l' }, defs.map(function (d) {
            var checked = (p.phenotypes || []).indexOf(d.id) !== -1;
            return h('div', { key: d.id, className: 'pheno-row' }, [
              h('input', {
                key: 'c', type: 'checkbox', checked: checked,
                onChange: function () { props.onTogglePhenotype(d.id); },
              }),
              h('span', { key: 's', className: 'pheno-dot', style: { background: d.color } }),
              h('span', { key: 'n', style: { flex: 1 } }, d.name),
              h('button', {
                key: 'x', className: 'mini', title: t('det.delPheno'),
                onClick: function () { props.onDeletePhenotypeDef(d.id); },
              }, '×'),
            ]);
          })),
    ]));

    return h('div', null, rows);
  };
})(window.PT);
