// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Uygulamanın tamamı: durum, komutlar ve yerleşim.
(function (PT) {
  'use strict';

  var h = PT.h;
  var React = window.React;
  var HALF = PT.HALF, S = PT.SIZE;

  // Dişli simgesi (yazı tipine bağlı kalmasın diye çizim; rengi yazı rengini izler).
  function gearIcon() {
    var teeth = [];
    for (var i = 0; i < 8; i++) {
      teeth.push(h('rect', {
        key: i, x: 7, y: 0.5, width: 2, height: 3.2, rx: 0.5,
        transform: 'rotate(' + (i * 45) + ' 8 8)',
      }));
    }
    return h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': 'true', fill: 'currentColor' }, [
      h('g', { key: 't' }, teeth),
      h('circle', { key: 'o', cx: 8, cy: 8, r: 4.6, fill: 'none', stroke: 'currentColor', strokeWidth: 2.2 }),
    ]);
  }

  function baseName(p) {
    if (!p) return '';
    var parts = String(p).split(/[\\/]/);
    return parts[parts.length - 1];
  }

  PT.App = function () {
    // ---- durum ----
    var initial = React.useState(PT.loadAutosave)[0];
    var hist = PT.useHistory(initial, 100);
    var state = hist.state;
    var individuals = state.individuals;
    var relationships = state.relationships;
    var labels = state.labels;
    var phenotypeDefs = state.phenotypeDefs;

    var selPair = React.useState([]);
    var selected = selPair[0], setSelected = selPair[1];

    var viewPair = React.useState({ x: 120, y: 90, k: 1 });
    var view = viewPair[0], setView = viewPair[1];
    var viewRef = React.useRef(view);
    viewRef.current = view;

    var msPair = React.useState(false);
    var multiSelect = msPair[0], setMultiSelect = msPair[1];

    // Numaralar ve ızgara bu bilgisayarın tercihidir (dosyaya yazılmaz).
    var numPair = React.useState(function () { return PT.loadPref('numbers', true) !== false; });
    var showNumbers = numPair[0], setShowNumbersState = numPair[1];
    function setShowNumbers(v) {
      setShowNumbersState(!!v);
      PT.savePref('numbers', !!v);
    }

    var gridPair = React.useState(function () { return PT.loadPref('grid', true) !== false; });
    var showGrid = gridPair[0], setShowGridState = gridPair[1];
    function setShowGrid(v) {
      setShowGridState(!!v);
      PT.savePref('grid', !!v);
    }

    // Görünüm (tema). Renkler CSS değişkenleriyle değişir; bu durum yalnızca Ayarlar
    // penceresinin seçili düğmeleri ve "şu an: Koyu" notu için tutulur.
    var appPair = React.useState(PT.appearance);
    var appearance = appPair[0], setAppearanceState = appPair[1];
    React.useEffect(function () { return PT.onAppearance(setAppearanceState); }, []);

    // fromMenu: değişiklik ana süreçten (Görünüm > Tema menüsü) geldi, zaten kaydedildi.
    function changeTheme(pref, fromMenu) {
      PT.applyAppearance({ pref: pref });
      if (!fromMenu) PT.files.setAppearance({ theme: PT.validTheme(pref) });
    }

    function changeDarkCanvas(v) {
      PT.applyAppearance({ darkCanvas: v });
      PT.files.setAppearance({ darkCanvas: PT.validDarkCanvas(v) });
    }

    var setPair = React.useState(false);
    var settingsOpen = setPair[0], setSettingsOpen = setPair[1];
    // Uygulama içi uyarı penceresi (window.alert yerine; bkz. ui/Notice.js). Bazı uyarılar
    // durum güncelleyicilerinin içinden verildiği için gösterim bir sonraki adıma bırakılır.
    var noticePair = React.useState(null);
    var notice = noticePair[0], setNotice = noticePair[1];
    function notify(message) {
      setTimeout(function () { setNotice(String(message)); }, 0);
    }

    // Ayarlar ya da uyarı penceresi açıkken çizim kısayolları ve menü komutları çalışmaz.
    var settingsOpenRef = React.useRef(false);
    settingsOpenRef.current = settingsOpen || notice !== null;

    // Otomatik yerleşim açıkken her yapısal değişiklik aynı adımda düzenlenir.
    var autoPair = React.useState(function () { return PT.loadPref('autolayout', true); });
    var autoLayoutOn = autoPair[0], setAutoLayoutOn = autoPair[1];
    var autoRef = React.useRef(autoLayoutOn);
    autoRef.current = autoLayoutOn;

    // Dil: değişince tüm arayüz yeniden çizilir (metinler PT.t ile okunur).
    var langPair = React.useState(PT.lang);
    var lang = langPair[0], setLangState = langPair[1];

    function changeLanguage(l, fromMenu) {
      var applied = PT.setLang(l);
      setLangState(applied);
      if (!fromMenu) PT.files.setLanguage(applied);
    }

    var filePair = React.useState({ path: null, name: null });
    var file = filePair[0], setFile = filePair[1];

    var verPair = React.useState('');
    var appVersion = verPair[0], setAppVersion = verPair[1];

    var svgRef = React.useRef(null);
    var contentRef = React.useRef(null);
    var dragPending = React.useRef(false);
    var panRef = React.useRef(null);

    // Son kaydedilen / açılan içerik. Ref değil durum: kayıttan sonra "•" işaretinin
    // hemen kalkması için değiştiğinde yeniden çizim gerekir.
    var savedPair = React.useState(function () { return JSON.stringify(initial); });
    var savedSnap = savedPair[0], setSavedSnap = savedPair[1];

    var dirty = React.useMemo(function () {
      return JSON.stringify(state) !== savedSnap;
    }, [state, savedSnap]);

    var gen = React.useMemo(function () {
      return PT.computeGenerations(individuals, relationships);
    }, [individuals, relationships]);

    // ---- yazı alanları: art arda yazılan harfler tek geri alma adımı ----
    // Aynı hedefin aynı alanına yapılan ardışık değişikliklerden ilki geçmişe yeni
    // adım açar, sonrakiler o adımın üzerine yazılır (transient). Başka bir alan,
    // başka bir işlem, seçim değişikliği ya da geri al/yinele zinciri koparır;
    // böylece "Mehmet" yazmak 6 değil 1 adım olur ve 100 adımlık geçmişi yemez.
    var typingRef = React.useRef(null);
    function endTyping() { typingRef.current = null; }
    function typed(key, updater) {
      var same = typingRef.current === key;
      typingRef.current = key;
      hist.set(updater, same ? { transient: true } : undefined);
    }
    React.useEffect(endTyping, [selected]);

    function undo() { endTyping(); hist.undo(); }
    function redo() { endTyping(); hist.redo(); }

    // ---- kısa yollar (alt durum güncelleyicileri) ----
    function setPart(key, value) {
      endTyping();
      hist.set(function (s) {
        var next = {};
        next[key] = typeof value === 'function' ? value(s[key]) : value;
        return Object.assign({}, s, next);
      });
    }
    var setIndividuals = function (v) { setPart('individuals', v); };
    var setRelationships = function (v) { setPart('relationships', v); };
    var setLabels = function (v) { setPart('labels', v); };
    var setPhenotypeDefs = function (v) { setPart('phenotypeDefs', v); };

    // Yapısal değişiklik: kişi/ilişki ekleme, bağlama, silme.
    function commit(updater) {
      endTyping();
      hist.set(function (s) {
        var next = updater(s);
        if (next === s) return s;
        return autoRef.current ? PT.autoLayout(next) : next;
      });
    }

    function runAutoLayout() {
      endTyping();
      hist.set(function (s) { return PT.autoLayout(s); });
    }

    function toggleAutoLayout() {
      var next = !autoLayoutOn;
      setAutoLayoutOn(next);
      PT.savePref('autolayout', next);
      if (next) runAutoLayout();
    }

    function markDragStart() { dragPending.current = true; }
    function flushDragCheckpoint() {
      if (dragPending.current) { dragPending.current = false; endTyping(); hist.checkpoint(); }
    }
    // Hareketsiz tıklamada checkpoint alınmamış olur; bekleyen bayrak sonraki bir
    // sürüklemeye taşınmasın.
    function markDragEnd() { dragPending.current = false; }

    // ---- otomatik kayıt ----
    // 400 ms gecikmeli yazılır; pencere bu süre içinde kapanırsa bekleyen kayıt
    // sayfa kapanırken (pagehide / beforeunload) hemen yazılır, son değişiklik kaybolmaz.
    var stateRef = React.useRef(state);
    stateRef.current = state;
    var autosavePending = React.useRef(false);
    // Kapatırken "Kaydetme" seçildiyse değişiklikler atılmıştır; bekleyen kayıt ya da
    // sayfa kapanırken yapılan yazma onları otomatik kayda geri koymamalı.
    var discarded = React.useRef(false);

    React.useEffect(function () {
      autosavePending.current = true;
      var t = setTimeout(function () {
        autosavePending.current = false;
        if (!discarded.current) PT.saveAutosave(state);
      }, 400);
      return function () { clearTimeout(t); };
    }, [state]);

    React.useEffect(function () {
      function flush() {
        if (!autosavePending.current || discarded.current) return;
        autosavePending.current = false;
        PT.saveAutosave(stateRef.current);
      }
      window.addEventListener('pagehide', flush);
      window.addEventListener('beforeunload', flush);
      return function () {
        window.removeEventListener('pagehide', flush);
        window.removeEventListener('beforeunload', flush);
      };
    }, []);

    React.useEffect(function () {
      PT.files.version().then(setAppVersion);
    }, []);

    // ---- görünüm (yakınlaştırma / kaydırma) ----
    function zoomAbout(px, py, nextK) {
      setView(function (v) {
        var k = PT.clamp(nextK, PT.MIN_ZOOM, PT.MAX_ZOOM);
        if (k === v.k) return v;
        var wx = (px - v.x) / v.k, wy = (py - v.y) / v.k;
        return { k: k, x: px - wx * k, y: py - wy * k };
      });
    }

    function zoomByFactor(factor, clientX, clientY) {
      var svg = svgRef.current;
      if (!svg) return;
      var rect = svg.getBoundingClientRect();
      var px = clientX == null ? rect.width / 2 : clientX - rect.left;
      var py = clientY == null ? rect.height / 2 : clientY - rect.top;
      zoomAbout(px, py, viewRef.current.k * factor);
    }

    function fitToContent() {
      var el = contentRef.current, svg = svgRef.current;
      if (!el || !svg) return;
      var bb;
      try { bb = el.getBBox(); } catch (e) { return; }
      if (!bb.width || !bb.height) return;
      var rect = svg.getBoundingClientRect();
      var pad = 70;
      var k = PT.clamp(Math.min(rect.width / (bb.width + pad * 2), rect.height / (bb.height + pad * 2)),
        PT.MIN_ZOOM, 2);
      setView({
        k: k,
        x: rect.width / 2 - (bb.x + bb.width / 2) * k,
        y: rect.height / 2 - (bb.y + bb.height / 2) * k,
      });
    }

    // Tekerlek ve iki parmak hareketi React dışında, passive:false ile bağlanır.
    React.useEffect(function () {
      var svg = svgRef.current;
      if (!svg) return undefined;
      var pinch = null;

      function onWheel(e) {
        e.preventDefault();
        zoomByFactor(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
      }
      function distance(t) {
        var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
      }
      function onTouchStart(e) {
        if (e.touches.length === 2) {
          var rect = svg.getBoundingClientRect();
          pinch = {
            d: distance(e.touches),
            k: viewRef.current.k,
            px: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
            py: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
          };
        }
      }
      function onTouchMove(e) {
        if (!pinch || e.touches.length !== 2) return;
        if (e.cancelable) e.preventDefault();
        var d = distance(e.touches);
        if (!pinch.d) return;
        zoomAbout(pinch.px, pinch.py, pinch.k * (d / pinch.d));
      }
      function onTouchEnd(e) { if (e.touches.length < 2) pinch = null; }

      svg.addEventListener('wheel', onWheel, { passive: false });
      svg.addEventListener('touchstart', onTouchStart, { passive: true });
      svg.addEventListener('touchmove', onTouchMove, { passive: false });
      svg.addEventListener('touchend', onTouchEnd);
      return function () {
        svg.removeEventListener('wheel', onWheel);
        svg.removeEventListener('touchstart', onTouchStart);
        svg.removeEventListener('touchmove', onTouchMove);
        svg.removeEventListener('touchend', onTouchEnd);
      };
    }, []);

    function centerWorld() {
      var svg = svgRef.current;
      var v = viewRef.current;
      if (!svg) return { x: 0, y: 0 };
      var rect = svg.getBoundingClientRect();
      return {
        x: (rect.width / 2 - v.x) / v.k - HALF,
        y: (rect.height / 2 - v.y) / v.k - HALF,
      };
    }

    function onCanvasMouseDown(e) {
      // Yalnızca boş zemine basıldıysa kaydırma başlar.
      if (e.target !== e.currentTarget && e.target.tagName !== 'svg') return;
      setSelected([]);
      panRef.current = { x: e.clientX, y: e.clientY };
      var move = function (ev) {
        if (!panRef.current) return;
        var dx = ev.clientX - panRef.current.x, dy = ev.clientY - panRef.current.y;
        panRef.current = { x: ev.clientX, y: ev.clientY };
        setView(function (v) { return { k: v.k, x: v.x + dx, y: v.y + dy }; });
      };
      var up = function () {
        panRef.current = null;
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    }

    function onCanvasTouchStart(e) {
      if (e.touches.length !== 1) return;
      if (e.target !== e.currentTarget && e.target.tagName !== 'svg') return;
      var last = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      var move = function (ev) {
        if (ev.touches.length !== 1) return;
        var t = ev.touches[0];
        var dx = t.clientX - last.x, dy = t.clientY - last.y;
        last = { x: t.clientX, y: t.clientY };
        setView(function (v) { return { k: v.k, x: v.x + dx, y: v.y + dy }; });
      };
      var end = function () {
        window.removeEventListener('touchmove', move);
        window.removeEventListener('touchend', end);
      };
      window.addEventListener('touchmove', move, { passive: true });
      window.addEventListener('touchend', end);
    }

    // ---- seçim ----
    var selectNode = React.useCallback(function (id, additive) {
      setSelected(function (prev) {
        if (additive || multiSelect) {
          return prev.indexOf(id) !== -1 ? prev.filter(function (x) { return x !== id; }) : prev.concat([id]);
        }
        if (prev.length === 1 && prev[0] === id) return prev;
        return [id];
      });
    }, [multiSelect]);

    // ---- ekleme ----
    function addIndividual(gender) {
      var c = centerWorld();
      var spot = PT.freeSpot(individuals, PT.snap(c.x), PT.snap(c.y));
      var p = PT.newIndividual(gender, PT.snap(spot.x), PT.snap(spot.y));
      setIndividuals(function (list) { return list.concat([p]); });
      setSelected([p.id]);
    }

    function addLabel() {
      var c = centerWorld();
      var lab = { id: 'lbl-' + PT.uid(), x: c.x, y: c.y, text: PT.t('label.new'), fontSize: 14 };
      setLabels(function (list) { return list.concat([lab]); });
      setSelected([lab.id]);
    }

    function addRelationship(type) {
      if (selected.length !== 2) return;
      var ids = selected.slice();
      commit(function (s) {
        var a = s.individuals.find(function (p) { return p.id === ids[0]; });
        var b = s.individuals.find(function (p) { return p.id === ids[1]; });
        if (!a || !b) return s;
        var idx = s.relationships.findIndex(function (r) {
          return PT.isMating(r) &&
            ((r.partner1Id === a.id && r.partner2Id === b.id) || (r.partner1Id === b.id && r.partner2Id === a.id));
        });
        var rels = s.relationships.slice();
        if (idx !== -1) rels[idx] = Object.assign({}, rels[idx], { type: type });
        else rels.push(a.x <= b.x ? PT.newMating(a.id, b.id, type) : PT.newMating(b.id, a.id, type));

        // Otomatik yerleşim kapalıysa bile eşler aynı hizaya iner; aksi halde
        // eş çizgisi eğik çıkardı. Sonradan seçilen kişi ilkinin satırına alınır.
        // Biri diğerinin atasıysa ikisi farklı kuşaktadır ve satırlarında kalır.
        var people = s.individuals;
        var crossGen = PT.isAncestor(a.id, b.id, rels) || PT.isAncestor(b.id, a.id, rels);
        if (b.y !== a.y && !crossGen) {
          people = people.map(function (p) { return p.id === b.id ? Object.assign({}, p, { y: a.y }) : p; });
        }
        return Object.assign({}, s, { individuals: people, relationships: rels });
      });
    }

    function selectedMating() {
      if (selected.length !== 2) return null;
      return relationships.find(function (r) {
        return PT.isMating(r) &&
          ((r.partner1Id === selected[0] && r.partner2Id === selected[1]) ||
           (r.partner1Id === selected[1] && r.partner2Id === selected[0]));
      }) || null;
    }

    function addChildToMating(matingId, gender) {
      commit(function (s) {
        var mating = s.relationships.find(function (r) { return r.id === matingId; });
        if (!mating) return s;
        // Yeni çocuk mevcut kardeşlerin sağına (doğum sırası soldan sağa).
        var slot = PT.newChildSlots(matingId, s.individuals, s.relationships, 1)[0];
        var child = PT.newIndividual(gender, slot.x, slot.y);
        var rels = s.relationships.concat([PT.newParentChild(matingId, child.id)]);
        var people = PT.layoutSiblings(matingId, s.individuals.concat([child]), rels);
        return Object.assign({}, s, { individuals: people, relationships: rels });
      });
    }

    function addChild(gender) {
      var m = selectedMating();
      if (!m) { notify(PT.t('msg.linkFirst')); return; }
      addChildToMating(m.id, gender);
    }

    function addTwins(zygosity, g1, g2) {
      var m = selectedMating();
      if (!m) { notify(PT.t('msg.linkCouple')); return; }
      commit(function (s) {
        var groupId = PT.uid();
        var slots = PT.newChildSlots(m.id, s.individuals, s.relationships, 2);
        var a = PT.newIndividual(g1, slots[0].x, slots[0].y);
        var b = PT.newIndividual(g2, slots[1].x, slots[1].y);
        a.twinGroupId = groupId; a.zygosity = zygosity;
        b.twinGroupId = groupId; b.zygosity = zygosity;
        var rels = s.relationships.concat([PT.newParentChild(m.id, a.id), PT.newParentChild(m.id, b.id)]);
        var people = PT.layoutSiblings(m.id, s.individuals.concat([a, b]), rels);
        return Object.assign({}, s, { individuals: people, relationships: rels });
      });
    }

    function addParents() {
      if (selected.length !== 1) return;
      commit(function (s) {
        var kid = s.individuals.find(function (p) { return p.id === selected[0]; });
        if (!kid) return s;
        if (PT.parentLinkOf(kid.id, s.relationships)) {
          notify(PT.t('msg.hasParents'));
          return s;
        }
        var dad = PT.newIndividual('male', kid.x - 80, kid.y - PT.GEN_GAP);
        var mom = PT.newIndividual('female', kid.x + 80, kid.y - PT.GEN_GAP);
        var mating = PT.newMating(dad.id, mom.id, 'mating');
        return Object.assign({}, s, {
          individuals: s.individuals.concat([dad, mom]),
          relationships: s.relationships.concat([mating, PT.newParentChild(mating.id, kid.id)]),
        });
      });
    }

    function addSibling(gender, kind) {
      if (selected.length !== 1) return;
      var me = individuals.find(function (p) { return p.id === selected[0]; });
      if (!me) return;
      var link = PT.parentLinkOf(me.id, relationships);
      if (!link) { notify(PT.t('msg.addParentsFirst')); return; }
      var mating = relationships.find(function (r) { return r.id === link.partner1Id; });
      if (!mating) return;

      if (kind === 'full') { addChildToMating(mating.id, gender); return; }

      // Yarım kardeş: ortak ebeveyn + yeni bir eş üzerinden.
      commit(function (s) {
        var m = s.relationships.find(function (r) { return r.id === mating.id; });
        var p1 = s.individuals.find(function (p) { return p.id === m.partner1Id; });
        var p2 = s.individuals.find(function (p) { return p.id === m.partner2Id; });
        if (!p1 || !p2) return s;

        var wantFather = kind === 'half-father';
        var shared = wantFather
          ? (p1.gender === 'male' ? p1 : p2)
          : (p1.gender === 'female' ? p1 : p2);
        if (!shared) shared = p1;

        var otherGender = shared.gender === 'male' ? 'female' : 'male';
        var newPartner = PT.newIndividual(otherGender, shared.x + 250, shared.y);
        newPartner.name = '';
        var newMating = PT.newMating(shared.id, newPartner.id, 'mating');
        var withMating = s.relationships.concat([newMating]);
        var slot = PT.newChildSlots(newMating.id, s.individuals.concat([newPartner]), withMating, 1)[0];
        var child = PT.newIndividual(gender, slot.x, slot.y);
        var rels = withMating.concat([PT.newParentChild(newMating.id, child.id)]);
        var people = PT.layoutSiblings(newMating.id,
          s.individuals.concat([newPartner, child]), rels);
        return Object.assign({}, s, { individuals: people, relationships: rels });
      });
    }

    function linkChild() {
      if (selected.length !== 3) { notify(PT.t('msg.select3')); return; }
      commit(function (s) {
        var chosen =s.individuals.filter(function (p) { return selected.indexOf(p.id) !== -1; });
        var existing = s.relationships.find(function (r) {
          return PT.isMating(r) && selected.indexOf(r.partner1Id) !== -1 && selected.indexOf(r.partner2Id) !== -1;
        });
        var dad, mom, kid;
        if (existing) {
          dad = chosen.find(function (p) { return p.id === existing.partner1Id; });
          mom = chosen.find(function (p) { return p.id === existing.partner2Id; });
          kid = chosen.find(function (p) { return p.id !== dad.id && p.id !== mom.id; });
        } else {
          var males = chosen.filter(function (p) { return p.gender === 'male'; });
          var females = chosen.filter(function (p) { return p.gender === 'female'; });
          if (males.length !== 1 || females.length !== 1) {
            notify(PT.t('msg.parentsMF'));
            return s;
          }
          dad = males[0]; mom = females[0];
          kid = chosen.find(function (p) { return p.id !== dad.id && p.id !== mom.id; });
        }
        if (!dad || !mom || !kid) return s;

        var rels = s.relationships.slice();
        var matingId = existing ? existing.id : null;
        if (!matingId) {
          var m = PT.newMating(dad.id, mom.id, 'mating');
          rels.push(m);
          matingId = m.id;
        }
        var already = rels.find(function (r) {
          return r.type === 'parent-child' && r.childId === kid.id && r.partner1Id === matingId;
        });
        if (already) { notify(PT.t('msg.linkExists')); return s; }
        if (PT.parentLinkOf(kid.id, rels)) { notify(PT.t('msg.hasParents')); return s; }
        // Dede/nineyi kendi torununun çocuğu yapmak soyu döngüye sokar.
        if (PT.linkWouldCycle(kid.id, [dad.id, mom.id], rels)) { notify(PT.t('msg.cycle')); return s; }

        rels.push(PT.newParentChild(matingId, kid.id));
        var people = PT.layoutSiblings(matingId, s.individuals, rels);
        return Object.assign({}, s, { individuals: people, relationships: rels });
      });
      setSelected([]);
    }

    // ---- düzenleme ----
    // Klavyeyle yazılan alanlar (tek geri alma adımında birleşir); diğerleri
    // (ör. gebelik sonucu seçimi) her değişiklikte ayrı adımdır.
    var TEXT_FIELDS = { name: true, note: true, noteSize: true, countLabel: true };
    var TEXT_REL_FIELDS = { label: true, childlessNote: true };

    function updateField(field, value) {
      var ids = selected.slice();
      var apply = function (s) {
        return Object.assign({}, s, {
          individuals: s.individuals.map(function (p) {
            if (ids.indexOf(p.id) === -1) return p;
            var o = {}; o[field] = value;
            return Object.assign({}, p, o);
          }),
        });
      };
      if (TEXT_FIELDS[field]) typed('person:' + field + ':' + ids.join(','), apply);
      else { endTyping(); hist.set(apply); }
    }

    var STATUS_FIELD = {
      deceased: 'isDeceased', proband: 'isProband', affected: 'isAffected',
      carrier: 'isCarrier', pregnancy: 'isPregnancy', stillbirth: 'isStillbirth',
      adopted: 'isAdopted',
    };

    function toggleStatus(kind) {
      var key = STATUS_FIELD[kind];
      if (!key) return;
      setIndividuals(function (list) {
        return list.map(function (p) {
          if (selected.indexOf(p.id) === -1) return p;
          var o = {}; o[key] = !p[key];
          return Object.assign({}, p, o);
        });
      });
    }

    function addPhenotype(name, color) {
      if (phenotypeDefs.find(function (d) { return d.name === name; })) {
        notify(PT.t('msg.phenoExists'));
        return;
      }
      var def = { id: PT.uid(), name: name, color: color };
      endTyping();
      hist.set(function (s) {
        var people = s.individuals.map(function (p) {
          if (selected.indexOf(p.id) === -1) return p;
          return Object.assign({}, p, { phenotypes: (p.phenotypes || []).concat([def.id]) });
        });
        return Object.assign({}, s, {
          phenotypeDefs: s.phenotypeDefs.concat([def]),
          individuals: people,
        });
      });
    }

    function togglePhenotype(defId) {
      setIndividuals(function (list) {
        return list.map(function (p) {
          if (selected.indexOf(p.id) === -1) return p;
          var cur = p.phenotypes || [];
          return Object.assign({}, p, {
            phenotypes: cur.indexOf(defId) !== -1
              ? cur.filter(function (x) { return x !== defId; })
              : cur.concat([defId]),
          });
        });
      });
    }

    function deletePhenotypeDef(defId) {
      PT.files.confirm(PT.t('msg.delPheno'), PT.t('msg.delPhenoDetail')).then(function (ok) {
        if (!ok) return;
        endTyping();
        hist.set(function (s) {
          return Object.assign({}, s, {
            phenotypeDefs: s.phenotypeDefs.filter(function (d) { return d.id !== defId; }),
            individuals: s.individuals.map(function (p) {
              return Object.assign({}, p, {
                phenotypes: (p.phenotypes || []).filter(function (x) { return x !== defId; }),
              });
            }),
          });
        });
      });
    }

    function toggleDivorce(relId) {
      setRelationships(function (list) {
        return list.map(function (r) {
          return r.id === relId ? Object.assign({}, r, { isDivorced: !r.isDivorced }) : r;
        });
      });
    }

    function updateRelLabel(relId, text) {
      updateRel(relId, { label: text });
    }

    function updateRel(relId, patch) {
      var apply = function (s) {
        return Object.assign({}, s, {
          relationships: s.relationships.map(function (r) {
            return r.id === relId ? Object.assign({}, r, patch) : r;
          }),
        });
      };
      var keys = Object.keys(patch);
      if (keys.length === 1 && TEXT_REL_FIELDS[keys[0]]) typed('rel:' + keys[0] + ':' + relId, apply);
      else { endTyping(); hist.set(apply); }
    }

    function updateLabel(id, key, value) {
      typed('label:' + key + ':' + id, function (s) {
        return Object.assign({}, s, {
          labels: s.labels.map(function (l) {
            if (l.id !== id) return l;
            var o = {}; o[key] = value;
            return Object.assign({}, l, o);
          }),
        });
      });
    }
    function updateLabelText(id, text) { updateLabel(id, 'text', text); }
    function updateLabelSize(id, size) { updateLabel(id, 'fontSize', size); }

    // Yanlış kurulmuş eş bağını kişileri silmeden kaldırır. Çiftin çocuk bağları
    // da gider (yoksa var olmayan bir çifte işaret eden kayıt kalırdı); onayda
    // kaç çocuğun etkileneceği söylenir.
    function removeMating(matingId) {
      var n = PT.childLinksOf(matingId, relationships).length;
      var detail = n ? PT.t('msg.unlinkPartnersKids', { n: n }) : PT.t('msg.unlinkPartnersDetail');
      PT.files.confirm(PT.t('msg.unlinkPartners'), detail).then(function (ok) {
        if (!ok) return;
        commit(function (s) {
          var rels = PT.removeMating(s.relationships, matingId);
          if (rels.length === s.relationships.length) return s;
          return Object.assign({}, s, { relationships: rels });
        });
      });
    }

    // Seçili kişiyi ebeveynlerinden ayırır (eşler ve kardeşler yerinde kalır).
    function removeParentLink(childId) {
      commit(function (s) {
        var rels = PT.removeParentLinks(s.relationships, childId);
        if (rels.length === s.relationships.length) return s;
        return Object.assign({}, s, { relationships: rels });
      });
    }

    function deleteSelected() {
      if (!selected.length) return;
      PT.files.confirm(PT.t('msg.delSel'), PT.t('msg.delSelDetail', { n: selected.length })).then(function (ok) {
        if (!ok) return;
        commit(function (s) {
          var gone = {};
          selected.forEach(function (id) { gone[id] = true; });

          var people = s.individuals.filter(function (p) { return !gone[p.id]; });
          var rels = s.relationships.filter(function (r) {
            if (r.type === 'parent-child') return !gone[r.childId];
            return !gone[r.partner1Id] && !gone[r.partner2Id];
          });
          // Eşi silinmiş bir çiftin altında kalan çocuk bağlarını temizle.
          var alive = {};
          rels.forEach(function (r) { if (PT.isMating(r)) alive[r.id] = true; });
          rels = rels.filter(function (r) { return r.type !== 'parent-child' || alive[r.partner1Id]; });

          return Object.assign({}, s, {
            individuals: people,
            relationships: rels,
            labels: s.labels.filter(function (l) { return !gone[l.id]; }),
          });
        });
        setSelected([]);
      });
    }

    // ---- sürükleme ----
    var onNodeDrag = React.useCallback(function (id, nx, ny) {
      flushDragCheckpoint();
      hist.set(function (s) {
        var people = s.individuals, rels = s.relationships;
        var me = people.find(function (p) { return p.id === id; });
        if (!me) return s;

        var dx = nx - me.x, dy = ny - me.y;
        var tx = nx, ty = ny;

        if (Math.abs(dx) > Math.abs(dy)) {
          // Yatay hareket: kuşak yüksekliği korunur, ebeveyn ortasına yapışır.
          ty = me.y;
          var link = PT.parentLinkOf(id, rels);
          if (link) {
            var mating = rels.find(function (r) { return r.id === link.partner1Id; });
            if (mating) {
              var a = people.find(function (p) { return p.id === mating.partner1Id; });
              var b = people.find(function (p) { return p.id === mating.partner2Id; });
              if (a && b) {
                var center = (a.x + S + b.x) / 2 - HALF;
                if (Math.abs(tx - center) < 20) tx = center;
              }
            }
          }
          if (tx !== nx) tx = Math.round(tx); else tx = PT.snap(tx);
        } else {
          tx = me.x;
          // Dikey: en yakın kuşak satırına (24 px içinde) ya da 10 px ızgaraya.
          ty = PT.snapRowY(ny, people, id);
        }

        // Dikey hareket: eş kümesi ve kardeşler aynı hizada kalsın.
        var move = {};
        if (ty !== me.y) {
          Object.keys(PT.partnerCluster(id, rels)).forEach(function (k) { move[k] = true; });
          var pl = PT.parentLinkOf(id, rels);
          if (pl) {
            rels.filter(function (r) {
              return r.type === 'parent-child' && r.partner1Id === pl.partner1Id;
            }).forEach(function (r) {
              move[r.childId] = true;
              Object.keys(PT.partnerCluster(r.childId, rels)).forEach(function (k) { move[k] = true; });
            });
          }
        }

        var next = people.map(function (p) {
          if (p.id === id) return Object.assign({}, p, { x: tx, y: ty });
          if (move[p.id]) return Object.assign({}, p, { y: ty });
          return p;
        });
        return Object.assign({}, s, { individuals: next });
      }, { transient: true });
    }, [hist]);

    // "Değişiklikte otomatik" açıkken bırakılan kişi yerinde kalırsa çizim bir
    // sonraki yapısal değişikliğe kadar hizasız durur. Bu yüzden sürükleme bitince
    // düzen, sürüklemeyle AYNI geri alma adımında (transient) yeniden kurulur:
    // kardeşi diğerinin ötesine sürüklemek sırayı değiştirir, dikey sürükleme
    // kuşak satırına geri oturur. Hareketsiz tıklama ne adım ne düzen üretir.
    var onNodeDragEnd = React.useCallback(function (id, moved) {
      markDragEnd();
      if (!moved || !autoRef.current) return;
      hist.set(function (s) { return PT.autoLayout(s); }, { transient: true });
    }, [hist]);

    var onLabelDrag = React.useCallback(function (id, x, y) {
      flushDragCheckpoint();
      hist.set(function (s) {
        return Object.assign({}, s, {
          labels: s.labels.map(function (l) {
            return l.id === id ? Object.assign({}, l, { x: x, y: y }) : l;
          }),
        });
      }, { transient: true });
    }, [hist]);

    var onUpdateLineHeight = React.useCallback(function (relId, value) {
      flushDragCheckpoint();
      hist.set(function (s) {
        return Object.assign({}, s, {
          relationships: s.relationships.map(function (r) {
            return r.id === relId
              ? Object.assign({}, r, { lineOffsetY: PT.clamp(PT.snap(value, 5), 20, 400) })
              : r;
          }),
        });
      }, { transient: true });
    }, [hist]);

    // ---- dosya ----
    function jsonFilters() { return [{ name: PT.t('file.json'), extensions: ['json'] }]; }

    function defaultName(ext) {
      return PT.slug(state.meta && state.meta.title, PT.t('file.base')) + '.' + ext;
    }

    // Sistem hatasının okunur kısmı ("ENOENT: no such file or directory, open '...'").
    // IPC'den gelen hatalarda Electron'un önek eklediği kısım atılır.
    function errorReason(err) {
      var m = err && err.message ? err.message : String(err || '');
      return m.replace(/^Error invoking remote method '[^']*': (Error: )?/, '');
    }

    // Kaydetme sonucu: true yalnızca dosya gerçekten yazıldıysa. Hata olursa kullanıcı
    // nedeniyle birlikte uyarılır; dosya adı ve "•" işareti başarılıymış gibi değişmez.
    function saveFile(asNew) {
      var payload = JSON.stringify(PT.toFileObject(state, appVersion), null, 2);
      var snapshot = JSON.stringify(state);
      var target = asNew ? null : file.path;
      return PT.files.saveText(file.path ? baseName(file.path) : defaultName('json'),
        payload, jsonFilters(), target).then(function (res) {
        if (!res || res.canceled) return false;
        if (res.error) throw new Error(res.error);
        setSavedSnap(snapshot);
        setFile({
          path: res.filePath || null,
          name: res.filePath ? baseName(res.filePath) : defaultName('json'),
        });
        return true;
      }).catch(function (err) {
        notify(PT.t('msg.saveFail', { reason: errorReason(err) }));
        return false;
      });
    }

    // Yalnızca kaybedilecek bir şey varsa sorar: çizim boş değil VE (kaydedilmemiş
    // değişiklik var YA DA çizim hiçbir dosyaya bağlı değil, yani adsız).
    function confirmDiscard(message, detail) {
      var empty = !individuals.length && !labels.length;
      if (empty || (!dirty && file.name)) return Promise.resolve(true);
      return PT.files.confirm(message, detail);
    }

    function openFile() {
      confirmDiscard(PT.t('msg.open'), PT.t('msg.openDetail')).then(function (ok) {
        if (!ok) return null;
        return PT.files.openText().then(function (res) {
          if (!res || res.canceled) return;
          if (res.error) throw new Error(res.error);
          var next;
          try {
            next = PT.parseFileText(res.data);
          } catch (err) {
            notify(err.message || PT.t('msg.readFail'));
            return;
          }
          endTyping();
          hist.replace(next);
          setSavedSnap(JSON.stringify(next));
          setSelected([]);
          setFile({
            path: res.filePath || null,
            name: res.fileName || baseName(res.filePath) || PT.t('top.opened'),
          });
          setTimeout(fitToContent, 60);
        });
      }).catch(function (err) {
        notify(PT.t('msg.openFail', { reason: errorReason(err) }));
      });
    }

    function newDrawing() {
      confirmDiscard(PT.t('msg.new'), PT.t('msg.newDetail'))
        .then(function (ok) {
          if (!ok) return;
          var empty = PT.clone(PT.EMPTY_STATE);
          endTyping();
          hist.replace(empty);
          PT.clearAutosave();
          setSavedSnap(JSON.stringify(empty));
          setSelected([]);
          setFile({ path: null, name: null });
          setView({ x: 120, y: 90, k: 1 });
        });
    }

    // Ana süreç kapatırken sorabilsin diye belge durumu bildirilir; pencere
    // başlığında açık dosyanın adı görünür.
    React.useEffect(function () {
      PT.files.setDocState({ dirty: dirty, filePath: file.path, name: file.name });
      document.title = file.name ? (dirty ? '• ' : '') + file.name + ' — Pedigree Tool' : 'Pedigree Tool';
    }, [dirty, file.path, file.name]);

    // Kapatma sorusunda "Kaydet": kayıt başarılıysa pencere kapanır, değilse açık kalır.
    function saveAndClose() {
      saveFile(false).then(function (ok) {
        if (ok) PT.files.closeWindow();
      });
    }

    // Kapatma sorusunda "Kaydetme": değişiklikler atılır. Otomatik kayda dosyanın
    // son kaydedilmiş hâli yazılır; yoksa atılan değişiklikler bir sonraki açılışta
    // adsız çizim olarak geri gelirdi.
    function discardAndClose() {
      discarded.current = true;
      PT.saveAutosave(JSON.parse(savedSnap));
      PT.files.closeWindow();
    }

    // ---- dışa aktarma: PowerPoint'te düzenlenebilir şekiller (görüntü değil) ----
    function buildPptx() {
      if (!individuals.length && !labels.length) {
        notify(PT.t('msg.empty'));
        return Promise.resolve(null);
      }
      var bb = contentRef.current.getBBox();
      return PT.logoPng().then(function (logo) {
        return PT.buildPptxNative({
          state: state,
          bbox: { x: bb.x, y: bb.y, width: bb.width, height: bb.height },
          showNumbers: showNumbers,
          logo: logo ? logo.dataUrl : null,
          title: (state.meta && state.meta.title) || PT.t('doc.title'),
        });
      });
    }

    function exportPPTX() {
      buildPptx().then(function (pptx) {
        if (!pptx) return null;
        if (PT.files.native) {
          return pptx.write({ outputType: 'base64' }).then(function (b64) {
            return PT.files.saveBase64(defaultName('pptx'), b64,
              [{ name: PT.t('file.pptx'), extensions: ['pptx'] }],
              'application/vnd.openxmlformats-officedocument.presentationml.presentation');
          }).then(function (res) {
            if (res && res.error) throw new Error(res.error);
            return res;
          });
        }
        return pptx.writeFile({ fileName: defaultName('pptx') });
      }).catch(function (e) {
        notify(PT.t('msg.pptxFail') + errorReason(e));
      });
    }

    // ---- klavye ve menü ----
    var commands = {
      new: newDrawing, open: openFile,
      save: function () { saveFile(false); },
      saveAndClose: saveAndClose,
      discardAndClose: discardAndClose,
      saveAs: function () { saveFile(true); },
      undo: undo, redo: redo,
      pptx: exportPPTX,
      zoomIn: function () { zoomByFactor(1.2); },
      zoomOut: function () { zoomByFactor(1 / 1.2); },
      fit: fitToContent,
      layout: runAutoLayout,
      'lang:tr': function () { changeLanguage('tr', true); },
      'lang:en': function () { changeLanguage('en', true); },
      'theme:system': function () { changeTheme('system', true); },
      'theme:light': function () { changeTheme('light', true); },
      'theme:dark': function () { changeTheme('dark', true); },
      settings: function () { setSettingsOpen(true); },
    };
    // Ayarlar açıkken çizime dokunan komutlar (geri al, düzenle, yakınlaştır, dosya
    // işlemleri...) çalışmaz; yalnızca bunlar geçer. Kapatma sorusunun yanıtları da
    // geçer, yoksa pencere ayarlar açıkken kapatılamazdı.
    var WHILE_SETTINGS = {
      settings: true, 'lang:tr': true, 'lang:en': true,
      'theme:system': true, 'theme:light': true, 'theme:dark': true,
      saveAndClose: true, discardAndClose: true,
    };
    var commandsRef = React.useRef(commands);
    commandsRef.current = commands;

    React.useEffect(function () {
      PT.files.onMenu(function (cmd) {
        if (settingsOpenRef.current && !WHILE_SETTINGS[cmd]) return;
        var fn = commandsRef.current[cmd];
        if (fn) fn();
      });
    }, []);

    React.useEffect(function () {
      function onKey(e) {
        // Ayarlar penceresi kendi tuşlarını (Esc, Tab, oklar) kendisi işler.
        if (settingsOpenRef.current) return;
        var tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        var c = commandsRef.current;

        if (e.key === 'Escape') { setSelected([]); return; }
        if (e.key === 'Delete') { e.preventDefault(); deleteSelected(); return; }

        // Electron'da Ctrl kısayollarını uygulama menüsü çalıştırır;
        // burada ikinci kez işlenirse komut iki kez çalışır.
        if (PT.files.native) return;

        var mod = e.ctrlKey || e.metaKey;
        if (!mod) return;
        var k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); c.undo(); }
        else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); c.redo(); }
        else if (k === 's') { e.preventDefault(); e.shiftKey ? c.saveAs() : c.save(); }
        else if (k === 'o') { e.preventDefault(); c.open(); }
        else if (k === 'n') { e.preventDefault(); c.new(); }
        else if (k === '0') { e.preventDefault(); c.fit(); }
        else if (k === 'l') { e.preventDefault(); c.layout(); }
        else if (k === '+' || k === '=') { e.preventDefault(); c.zoomIn(); }
        else if (k === '-') { e.preventDefault(); c.zoomOut(); }
        else if (k === ',') { e.preventDefault(); c.settings(); }
      }
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, [selected]);

    // ---- çizim katmanı ----
    var byId = {};
    individuals.forEach(function (p) { byId[p.id] = p; });
    var relById = {};
    relationships.forEach(function (r) { relById[r.id] = r; });

    // Çift başına: eş çizgisi ve (çocuk varsa) tek bir kardeş çizgisi yapısı.
    var kidsOfMating = {};
    relationships.forEach(function (r) {
      if (r.type !== 'parent-child' || !byId[r.childId]) return;
      (kidsOfMating[r.partner1Id] = kidsOfMating[r.partner1Id] || []).push(byId[r.childId]);
    });

    var lines = [];
    relationships.forEach(function (rel) {
      if (!PT.isMating(rel)) return;
      var a = byId[rel.partner1Id], b = byId[rel.partner2Id];
      if (!a || !b) return;
      lines.push(h(PT.RelationshipLine, { key: rel.id, relationship: rel, sourceNode: a, targetNode: b }));
      if (kidsOfMating[rel.id]) {
        lines.push(h(PT.SibshipLine, {
          key: 'sib-' + rel.id, mating: rel, a: a, b: b, kids: kidsOfMating[rel.id], scale: view.k,
          onUpdateLineHeight: onUpdateLineHeight, onDragStart: markDragStart, onDragEnd: markDragEnd,
        }));
      }
    });

    var nodes = individuals.map(function (p) {
      var info = gen.info[p.id];
      return h(PT.PersonNode, {
        key: p.id, node: p, phenotypeDefs: phenotypeDefs,
        selected: selected.indexOf(p.id) !== -1,
        genLabel: showNumbers && info ? String(info.index) : '',
        scale: view.k,
        onSelect: selectNode, onNodeDrag: onNodeDrag, onDragStart: markDragStart,
        onDragEnd: onNodeDragEnd,
      });
    });

    var labelNodes = labels.map(function (l) {
      return h(PT.TextLabel, {
        key: l.id, label: l, selected: selected.indexOf(l.id) !== -1,
        scale: view.k, onSelect: selectNode, onDrag: onLabelDrag, onDragStart: markDragStart,
        onDragEnd: markDragEnd,
      });
    });

    // Kuşak cetveli (I, II, III ...) satır başlarında.
    var ruler = [];
    if (showNumbers) {
      gen.levels.forEach(function (L) {
        var row = gen.byLevel[L];
        if (!row || !row.length) return;
        var minX = Math.min.apply(null, row.map(function (p) { return p.x; }));
        var minY = Math.min.apply(null, row.map(function (p) { return p.y; }));
        ruler.push(h('text', {
          key: 'gen' + L, x: minX - 60, y: minY + HALF + 6,
          fontSize: 18, fontWeight: 'bold', fill: PT.INK_SOFT, textAnchor: 'middle',
        }, PT.roman(L)));
      });
    }

    var selectedNode = null, selectedLabel = null;
    if (selected.length === 1) {
      selectedNode = individuals.find(function (p) { return p.id === selected[0]; }) || null;
      selectedLabel = labels.find(function (l) { return l.id === selected[0]; }) || null;
    }

    // Sağ panel: seçili kişinin her eş ilişkisi ayrı bir blok (eşin adıyla, ad yoksa
    // kuşak numarasıyla, ör. II-3). "Çocuğu var" kuralı ilişki başına uygulanır.
    function whoLabel(id) {
      var p = byId[id];
      if (p && p.name) return p.name;
      return gen.info[id] ? gen.info[id].label : '?';
    }
    var relBlocks = [], parentInfo = null;
    if (selectedNode) {
      relBlocks = PT.matingsOf(selectedNode.id, relationships).map(function (m) {
        var other = m.partner1Id === selectedNode.id ? m.partner2Id : m.partner1Id;
        return { mating: m, who: whoLabel(other), childCount: PT.childLinksOf(m.id, relationships).length };
      });
      var pl = PT.parentLinkOf(selectedNode.id, relationships);
      var pm = pl && relById[pl.partner1Id];
      if (pm) parentInfo = { who: whoLabel(pm.partner1Id) + ' × ' + whoLabel(pm.partner2Id) };
      else if (pl) parentInfo = { who: '?' };
    }

    // ---- yerleşim ----
    var topbar = h('div', { className: 'topbar' }, [
      h('div', { key: 'brand', className: 'brand' }, [
        h('img', { key: 'i', src: 'assets/EK-logo.svg', alt: 'EK' }),
        h('span', { key: 't' }, 'PEDIGREE TOOL'),
      ]),
      h('input', {
        key: 'title', type: 'text', value: (state.meta && state.meta.title) || '',
        placeholder: PT.t('top.titlePh'),
        className: 'title-input',
        onChange: function (e) {
          var v = e.target.value;
          typed('meta:title', function (s) {
            return Object.assign({}, s, { meta: Object.assign({}, s.meta, { title: v }) });
          });
        },
      }),
      h('span', { key: 'fn', className: 'filename' }, (dirty ? '• ' : '') + (file.name || PT.t('top.untitled'))),
      h('span', { key: 'sp', className: 'spacer' }),
      h('div', { key: 'file', className: 'row', style: { margin: 0 } }, [
        h('button', { key: 'n', onClick: newDrawing, title: 'Ctrl+N' }, PT.t('top.new')),
        h('button', { key: 'o', onClick: openFile, title: 'Ctrl+O' }, PT.t('top.open')),
        h('button', { key: 's', onClick: function () { saveFile(false); }, className: 'primary', title: 'Ctrl+S' }, PT.t('top.save')),
        h('button', { key: 'sa', onClick: function () { saveFile(true); }, title: 'Ctrl+Shift+S' }, PT.t('top.saveAs')),
      ]),
      h('div', { key: 'hist', className: 'row', style: { margin: 0 } }, [
        h('button', { key: 'u', onClick: undo, disabled: !hist.canUndo, title: PT.t('top.undo') }, '↶'),
        h('button', { key: 'r', onClick: redo, disabled: !hist.canRedo, title: PT.t('top.redo') }, '↷'),
      ]),
      h('div', { key: 'zoom', className: 'zoomctl' }, [
        h('button', { key: 'o', onClick: function () { zoomByFactor(1 / 1.2); }, title: PT.t('top.zoomOut') }, '−'),
        h('span', { key: 'p', className: 'pct' }, Math.round(view.k * 100) + '%'),
        h('button', { key: 'i', onClick: function () { zoomByFactor(1.2); }, title: PT.t('top.zoomIn') }, '+'),
        h('button', { key: 'f', onClick: fitToContent, title: PT.t('top.fitTip') }, PT.t('top.fit')),
      ]),
      h('button', {
        key: 'num', className: showNumbers ? 'on' : '',
        onClick: function () { setShowNumbers(!showNumbers); },
        title: PT.t('top.numbersTip'),
      }, PT.t('top.numbers')),
      h('button', {
        key: 'ms', className: multiSelect ? 'on' : '',
        onClick: function () { setMultiSelect(!multiSelect); },
        title: PT.t('top.multiTip'),
      }, PT.t('top.multi')),
      // Dil seçimi Ayarlar penceresine taşındı (Dil menüsü de duruyor).
      h('button', {
        key: 'set', className: 'gear', onClick: function () { setSettingsOpen(true); },
        title: PT.t('top.settings'), 'aria-label': PT.t('set.title'),
        'aria-haspopup': 'dialog',
      }, gearIcon()),
    ]);

    var canvas = h('div', { className: 'canvas' }, [
      showGrid ? h('div', {
        key: 'grid', className: 'grid',
        style: {
          backgroundImage: 'radial-gradient(circle, var(--pd-grid) 1.1px, transparent 1.1px)',
          backgroundSize: (26 * view.k) + 'px ' + (26 * view.k) + 'px',
          backgroundPosition: view.x + 'px ' + view.y + 'px',
        },
      }) : null,
      h('svg', {
        key: 'svg', ref: svgRef, width: '100%', height: '100%',
        onMouseDown: onCanvasMouseDown, onTouchStart: onCanvasTouchStart,
      }, h('g', {
        ref: contentRef,
        transform: 'translate(' + view.x + ',' + view.y + ') scale(' + view.k + ')',
      }, [
        h('g', { key: 'ruler' }, ruler),
        h('g', { key: 'lines' }, lines),
        h('g', { key: 'nodes' }, nodes),
        h('g', { key: 'labels' }, labelNodes),
      ])),
      phenotypeDefs.length ? h('div', { key: 'legend', className: 'legend' }, [
        h('h5', { key: 'h' }, PT.t('legend.title')),
        phenotypeDefs.map(function (d) {
          return h('div', { key: d.id, className: 'item' }, [
            h('span', { key: 's', className: 'sw', style: { background: d.color } }),
            h('span', { key: 'n' }, d.name),
          ]);
        }),
      ]) : null,
      h('div', { key: 'hint', className: 'hint' },
        PT.t('canvas.hint')),
    ]);

    return h('div', { className: 'app' }, [
      topbar,
      h('div', { key: 'body', className: 'body' }, [
        h('div', { key: 'left', className: 'sidebar' }, h(PT.Toolbar, {
          selectedNodeIds: selected,
          onAddIndividual: addIndividual,
          onAddLabel: addLabel,
          onAddRelationship: addRelationship,
          onLinkChild: linkChild,
          onAddChild: addChild,
          onAddTwins: addTwins,
          onAddParents: addParents,
          onAddSibling: addSibling,
          onAddPhenotype: addPhenotype,
          onDelete: deleteSelected,
          onExportPPT: exportPPTX,
          autoLayoutOn: autoLayoutOn,
          onAutoLayout: runAutoLayout,
          onToggleAutoLayout: toggleAutoLayout,
        })),
        canvas,
        h('div', { key: 'right', className: 'sidebar right' }, h(PT.DetailsPanel, {
          selectedNode: selectedNode,
          selectedLabel: selectedLabel,
          genLabel: selectedNode && gen.info[selectedNode.id] ? gen.info[selectedNode.id].label : '',
          phenotypeDefs: phenotypeDefs,
          onUpdateField: updateField,
          onToggleStatus: toggleStatus,
          onTogglePhenotype: togglePhenotype,
          onDeletePhenotypeDef: deletePhenotypeDef,
          onToggleDivorce: toggleDivorce,
          onUpdateRelLabel: updateRelLabel,
          onUpdateRel: updateRel,
          relBlocks: relBlocks,
          parentInfo: parentInfo,
          onRemoveMating: removeMating,
          onRemoveParentLink: removeParentLink,
          onUpdateLabelText: updateLabelText,
          onUpdateLabelSize: updateLabelSize,
        })),
      ]),
      notice !== null ? h(PT.NoticeDialog, {
        key: 'notice', message: notice,
        onClose: function () { setNotice(null); },
      }) : null,
      settingsOpen ? h(PT.SettingsDialog, {
        key: 'settings',
        appearance: appearance,
        onTheme: function (v) { changeTheme(v, false); },
        onDarkCanvas: changeDarkCanvas,
        lang: lang,
        onLang: function (l) { changeLanguage(l, false); },
        showGrid: showGrid, onGrid: setShowGrid,
        showNumbers: showNumbers, onNumbers: setShowNumbers,
        onClose: function () { setSettingsOpen(false); },
      }) : null,
    ]);
  };
})(window.PT);
