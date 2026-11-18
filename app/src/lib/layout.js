// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Otomatik yerleşim ve hizalama.
//
// Yaklaşım: kuşaklar satırlara oturtulur (y = satır), her kişi eşleriyle birlikte
// bir "blok" oluşturur, blokların altına çocuk aileleri yerleştirilir ve çocuklar
// ebeveyn çiftinin ortasına ortalanır (klasik düzenli ağaç düzeni). Soldan sağa
// sıralama kullanıcının mevcut çiziminden alınır; yani kullanıcı bir kardeşi
// diğerinin soluna sürüklerse düzen bu sırayı korur. Hiç ilişkisi olmayan tek
// başına kişilere dokunulmaz.
(function (PT) {
  'use strict';

  var S = PT.SIZE, HALF = PT.HALF;

  PT.GRID = 10;
  var SPOUSE_SPACE = 60;   // eş sembolleri arasındaki boşluk (kenardan kenara)
  var SIB_SPACE = 40;      // kardeş birimleri arasındaki boşluk
  var FAMILY_SPACE = 60;   // aynı kişinin farklı evliliklerinden olan çocuk grupları arası
  var ROOT_SPACE = 120;    // birbirinden bağımsız aile ağaçları arası
  var ROW_MIN = PT.GEN_GAP;

  PT.snap = function (v, g) {
    g = g || PT.GRID;
    return Math.round(v / g) * g;
  };

  // Çocuksuzluk işaretinin çizgileri (ekran ve PPTX aynı geometriyi kullanır).
  PT.childlessGeometry = function (mx, my, kind) {
    var drop = 32, half = 16;
    var lines = [[mx, my, mx, my + drop], [mx - half, my + drop, mx + half, my + drop]];
    if (kind === 'infertile') lines.push([mx - half, my + drop + 6, mx + half, my + drop + 6]);
    return { lines: lines, textY: my + drop + (kind === 'infertile' ? 20 : 14) };
  };

  // Bir çiftin kardeş çizgisi yapısı (ekran ve PPTX aynı geometriyi kullanır, ayrı
  // ayrı hesaplansaydı zamanla birbirinden kayardı). Çizgi çift başına bir kez
  // çizilir: çiftin ortasından tek iniş, tüm bağlantı noktalarını kapsayan tek
  // yatay kardeş çizgisi, tekil çocuk başına bir dikey, ikizlere tek noktadan
  // çatal ve monozigotlarda iki kol arasında yatay çubuk.
  // Dönüş: { lines: [{ kind: 'drop'|'sib'|'child'|'twin'|'mz', x1, y1, x2, y2 }],
  //          handle: { x, y } } (handle: kardeş çizgisi yüksekliğini sürükleme noktası).
  PT.sibshipGeometry = function (a, b, mating, kids) {
    var list = (kids || []).filter(Boolean).slice().sort(function (p, q) { return p.x - q.x; });
    if (!a || !b || !list.length) return { lines: [], handle: null };

    var sx = (a.x + S + b.x) / 2;
    var sy = (a.y + b.y) / 2 + HALF;
    var sibY = sy + (mating.lineOffsetY || PT.DEFAULT_DROP);
    var attach = [sx], doneTwin = {}, lines = [];
    function seg(kind, x1, y1, x2, y2) { lines.push({ kind: kind, x1: x1, y1: y1, x2: x2, y2: y2 }); }
    function top(k) { return k.gender === 'abortion' ? k.y + 10 : k.y; }

    list.forEach(function (k) {
      var kx = k.x + HALF;
      if (!k.twinGroupId) {
        attach.push(kx);
        seg('child', kx, sibY, kx, top(k));
        return;
      }
      if (doneTwin[k.twinGroupId]) return;
      doneTwin[k.twinGroupId] = true;
      var twins = list.filter(function (o) { return o.twinGroupId === k.twinGroupId; });
      var fork = twins.reduce(function (acc, t) { return acc + t.x + HALF; }, 0) / twins.length;
      attach.push(fork);
      twins.forEach(function (t) { seg('twin', fork, sibY, t.x + HALF, top(t)); });
      if (k.zygosity === 'mono' && twins.length === 2) {
        // Çubuk iki kolun tam ortasından geçer (kolun kendi üst noktasına göre).
        var t0 = twins[0], t1 = twins[1];
        var midY = (sibY + top(t0)) / 2;
        seg('mz', (fork + t0.x + HALF) / 2, midY, (fork + t1.x + HALF) / 2, midY);
      }
    });

    var out = [{ kind: 'drop', x1: sx, y1: sy, x2: sx, y2: sibY }];
    var lo = Math.min.apply(null, attach), hi = Math.max.apply(null, attach);
    if (hi > lo) out.push({ kind: 'sib', x1: lo, y1: sibY, x2: hi, y2: sibY });
    return { lines: out.concat(lines), handle: { x: sx, y: sibY } };
  };

  // Sembolün içine yazılan kısa metin (ekran ve PPTX aynı kuralı kullanır).
  PT.innerText = function (p) {
    var tri = p.gender === 'abortion';
    var c = (p.countLabel || '').toString().trim();
    if (c) return { text: c, size: tri ? 11 : (c.length > 2 ? 14 : 18), y: tri ? 36 : 31 };
    if (p.isPregnancy) return { text: 'P', size: tri ? 11 : 22, y: tri ? 36 : 32 };
    if (p.isStillbirth) return { text: 'SB', size: tri ? 9 : 15, y: tri ? 35 : 31 };
    return null;
  };

  // Sembolün altına yazılan satırlar (PersonNode ile aynı sıra).
  PT.textLines = function (p) {
    var lines = [{ kind: 'num', text: '00', size: 11 }];
    if (p.gender === 'abortion' && p.pregnancyEnd === 'ectopic') lines.push({ kind: 'ect', text: 'ECT', size: 11 });
    if (p.name) lines.push({ kind: 'name', text: p.name, size: 12, bold: true });
    if (p.note) {
      var size = p.noteSize || 10;
      p.note.split('\n').forEach(function (t) { lines.push({ kind: 'note', text: t, size: size }); });
    }
    return lines;
  };

  // Yatayda kaplanan genişlik: sembol ya da altındaki en uzun yazı.
  PT.personWidth = function (p) {
    var w = S;
    PT.textLines(p).forEach(function (l) {
      if (l.kind === 'num') return;
      w = Math.max(w, l.text.length * l.size * (l.bold ? 0.64 : 0.58) + 8);
    });
    if (p.isProband) w = Math.max(w, S + 70);     // sol alttaki ok
    if (p.isAdopted) w = Math.max(w, S + 26);     // köşeli parantezler
    return Math.min(Math.round(w), 220);
  };

  // Sembolün üst kenarından yazıların bittiği yere kadar yükseklik.
  PT.personBottom = function (p) {
    var h = S + 4;
    PT.textLines(p).forEach(function (l) {
      h += l.kind === 'note' ? l.size * 1.2 : 14;
    });
    if (p.isProband) h = Math.max(h, S + 44);
    return h;
  };

  function other(m, pid) {
    return m.partner1Id === pid ? m.partner2Id : m.partner1Id;
  }

  PT.autoLayout = function (state) {
    var people = state.individuals || [];
    var rels = state.relationships || [];
    if (!people.length) return state;

    var byId = {};
    people.forEach(function (p) { byId[p.id] = p; });

    var matingsOf = {}, kidsOf = {}, connected = {};
    rels.forEach(function (r) {
      if (PT.isMating(r)) {
        if (!byId[r.partner1Id] || !byId[r.partner2Id]) return;
        (matingsOf[r.partner1Id] = matingsOf[r.partner1Id] || []).push(r);
        (matingsOf[r.partner2Id] = matingsOf[r.partner2Id] || []).push(r);
        connected[r.partner1Id] = connected[r.partner2Id] = true;
      }
    });
    rels.forEach(function (r) {
      if (r.type !== 'parent-child' || !byId[r.childId]) return;
      (kidsOf[r.partner1Id] = kidsOf[r.partner1Id] || []).push(r.childId);
      connected[r.childId] = true;
    });

    var ids = people.filter(function (p) { return connected[p.id]; }).map(function (p) { return p.id; });
    if (!ids.length) return state;

    var gen = PT.computeGenerations(people, rels);
    function level(id) { return gen.info[id] ? gen.info[id].level : 0; }
    function byX(a, b) { return byId[a].x - byId[b].x; }

    var widthCache = {};
    function pw(id) {
      if (widthCache[id] == null) widthCache[id] = PT.personWidth(byId[id]);
      return widthCache[id];
    }

    var visited = {};
    var seenMating = {};

    // Kişi + (henüz yerleşmemiş) eşleri. Birden çok eşi olan kişi ortaya alınır.
    function collectBlock(pid) {
      visited[pid] = true;
      var block = [pid], queue = [pid];
      while (queue.length) {
        var cur = queue.shift();
        (matingsOf[cur] || []).forEach(function (m) {
          var o = other(m, cur);
          if (!visited[o] && level(o) === level(pid)) {
            visited[o] = true;
            block.push(o);
            queue.push(o);
          }
        });
      }
      block.sort(byX);

      if (block.length >= 3) {
        var hub = block.slice().sort(function (a, b) {
          return (matingsOf[b] || []).length - (matingsOf[a] || []).length;
        })[0];
        var spouses = block.filter(function (id) { return id !== hub; });
        var half = Math.floor(spouses.length / 2);
        block = spouses.slice(0, half).concat([hub], spouses.slice(half));
      }
      return block;
    }

    // Çocukları ikizler yan yana gelecek şekilde soldan sağa sırala.
    function orderKids(kids) {
      var sorted = kids.slice().sort(byX), out = [], used = {};
      sorted.forEach(function (k) {
        if (used[k]) return;
        used[k] = true;
        out.push(k);
        var tg = byId[k].twinGroupId;
        if (tg) {
          sorted.forEach(function (o) {
            if (!used[o] && byId[o].twinGroupId === tg) { used[o] = true; out.push(o); }
          });
        }
      });
      return out;
    }

    // İki eş arasındaki boşluk: ilişki etiketi ("1. derece kuzen") ya da
    // çocuksuzluk notu sığacak kadar açılır.
    function spouseGap(a, b) {
      var gap = SPOUSE_SPACE;
      // Yuva boşluğuna ek olarak sembol kenarları arasında kalan yazı payı.
      var slack = (pw(a) - S) / 2 + (pw(b) - S) / 2;
      (matingsOf[a] || []).forEach(function (m) {
        if (other(m, a) !== b) return;
        // Etiket eş çizgisinin hemen üstünde, iki sembolün arasında durur.
        if (m.label) gap = Math.max(gap, m.label.length * 11 * 0.58 + 14 - slack);
        // Çocuksuzluk notu adlarla aynı yükseklikte, yuvaların arasında durur.
        if (m.childless && m.childlessNote) gap = Math.max(gap, m.childlessNote.length * 10 * 0.58 + 14);
      });
      return Math.round(gap);
    }

    // Birim: blok merkezi 0 kabul edilerek göreli konumlar hesaplanır.
    function layoutUnit(pid) {
      var block = collectBlock(pid);
      var nodes = {};
      var gaps = block.slice(1).map(function (id, i) { return spouseGap(block[i], id); });
      var bw = block.reduce(function (s, id) { return s + pw(id); }, 0) +
               gaps.reduce(function (s, g) { return s + g; }, 0);
      var x = -bw / 2;
      block.forEach(function (id, i) {
        nodes[id] = x + pw(id) / 2;
        x += pw(id) + (gaps[i] || 0);
      });
      var left = -bw / 2, right = bw / 2;

      var fams = [];
      block.forEach(function (id) {
        (matingsOf[id] || []).forEach(function (m) {
          if (seenMating[m.id]) return;
          seenMating[m.id] = true;
          var kids = (kidsOf[m.id] || []).filter(function (k) { return !visited[k]; });
          if (!kids.length) return;
          kids = orderKids(kids);
          kids.forEach(function (k) { visited[k] = true; });
          var known = [m.partner1Id, m.partner2Id].filter(function (p) { return nodes[p] != null; });
          var mid = known.reduce(function (s, p) { return s + nodes[p]; }, 0) / known.length;
          fams.push({ mating: m, kids: kids, mid: mid });
        });
      });
      fams.sort(function (a, b) { return a.mid - b.mid; });

      var prevRight = -Infinity;
      fams.forEach(function (f) {
        var list = [], cursor = 0;
        f.kids.forEach(function (k, i) {
          var u = layoutUnit(k);
          var o = i === 0 ? -u.left : cursor + SIB_SPACE - u.left;
          list.push({ id: k, u: u, o: o });
          cursor = o + u.right;
        });
        var famL = list[0].o + list[0].u.left;
        var famR = cursor;
        var first = list[0], last = list[list.length - 1];
        var c1 = first.o + first.u.nodes[first.id];
        var cN = last.o + last.u.nodes[last.id];
        var shift = f.mid - (c1 + cN) / 2;
        if (famL + shift < prevRight + FAMILY_SPACE) shift = prevRight + FAMILY_SPACE - famL;
        prevRight = famR + shift;

        list.forEach(function (e) {
          Object.keys(e.u.nodes).forEach(function (id) { nodes[id] = e.u.nodes[id] + e.o + shift; });
        });
        left = Math.min(left, famL + shift);
        right = Math.max(right, famR + shift);
      });

      return { nodes: nodes, left: left, right: right };
    }

    // ---- kökler: en üst kuşaktan, mevcut soldan sağa sırayla ----
    var cx = {};
    var startLeft = Math.min.apply(null, ids.map(function (id) { return byId[id].x + HALF - pw(id) / 2; }));
    var cursor = PT.snap(startLeft);

    function placeRoot(id) {
      if (visited[id]) return;
      var u = layoutUnit(id);
      var off = cursor - u.left;
      Object.keys(u.nodes).forEach(function (k) { cx[k] = u.nodes[k] + off; });
      cursor = off + u.right + ROOT_SPACE;
    }

    ids.slice().sort(function (a, b) { return level(a) - level(b) || byX(a, b); })
      .forEach(placeRoot);

    // ---- satırlar: her kuşak kendi yazı yüksekliği kadar yer alır ----
    var levels = {};
    ids.forEach(function (id) { levels[level(id)] = true; });
    var levelList = Object.keys(levels).map(Number).sort(function (a, b) { return a - b; });
    var minLevel = levelList[0];
    var topY = PT.snap(Math.min.apply(null, ids.filter(function (id) {
      return level(id) === minLevel;
    }).map(function (id) { return byId[id].y; })));

    var rowY = {}, rowBottom = {};
    ids.forEach(function (id) {
      var L = level(id);
      rowBottom[L] = Math.max(rowBottom[L] || 0, PT.personBottom(byId[id]));
    });
    var y = topY;
    for (var L = minLevel; L <= levelList[levelList.length - 1]; L++) {
      rowY[L] = y;
      var gap = Math.max(ROW_MIN, (rowBottom[L] || S) + 60);
      y += Math.ceil(gap / PT.GRID) * PT.GRID;
    }

    var individuals = people.map(function (p) {
      if (cx[p.id] == null) return p;
      return Object.assign({}, p, { x: Math.round(cx[p.id] - HALF), y: rowY[level(p.id)] });
    });

    // ---- kardeş çizgisi: ebeveyn yazılarının altından, bir alt satırın üstünden ----
    // Eşler farklı satırdaysa (ata ile torunu arasındaki birleşme) alt satırdaki
    // eş esas alınır; iniş yine çiftin ortasından ölçülür.
    var placed = {};
    individuals.forEach(function (p) { placed[p.id] = p; });
    var relationships = rels.map(function (r) {
      if (!PT.isMating(r)) return r;
      var a = placed[r.partner1Id], b = placed[r.partner2Id];
      if (!a || !b || cx[a.id] == null || cx[b.id] == null) return r;
      var low = a.y >= b.y ? a : b;
      var textBottom = Math.max(a.y + PT.personBottom(a), b.y + PT.personBottom(b)) - low.y;
      var L = level(low.id);
      var rowGap = (rowY[L + 1] != null ? rowY[L + 1] : rowY[L] + ROW_MIN) - rowY[L];
      var drop = Math.max(textBottom - HALF + 12, Math.round((rowGap - HALF) / 2));
      drop = Math.min(drop, rowGap - HALF - 24);
      drop = Math.max(20, PT.snap(drop, 2));
      drop += low.y - (a.y + b.y) / 2;
      return drop === r.lineOffsetY ? r : Object.assign({}, r, { lineOffsetY: drop });
    });

    return Object.assign({}, state, { individuals: individuals, relationships: relationships });
  };

  // Elle sürüklemede hizalama: y en yakın kuşak satırına (varsa) ya da ızgaraya,
  // x ızgaraya yapışır.
  PT.snapRowY = function (y, people, selfId) {
    var best = null;
    people.forEach(function (p) {
      if (p.id === selfId) return;
      var d = Math.abs(p.y - y);
      if (d <= 24 && (best == null || d < Math.abs(best - y))) best = p.y;
    });
    return best != null ? best : PT.snap(y);
  };
})(window.PT);
