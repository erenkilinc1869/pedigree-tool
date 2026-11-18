// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Pedigri veri modeli üzerindeki saf hesaplamalar (çizimden bağımsız).
(function (PT) {
  'use strict';

  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
               'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

  PT.roman = function (n) {
    return ROMAN[n] || String(n + 1);
  };

  PT.isMating = function (r) {
    return r.type === 'mating' || r.type === 'consanguinity';
  };

  // Kişinin tüm eş ilişkileri (birden çok evlilikte her biri ayrı düzenlenir).
  PT.matingsOf = function (id, rels) {
    return rels.filter(function (r) {
      return PT.isMating(r) && (r.partner1Id === id || r.partner2Id === id);
    });
  };

  // Kişinin ebeveyn çiftini veren parent-child bağı.
  PT.parentLinkOf = function (id, rels) {
    for (var i = 0; i < rels.length; i++) {
      if (rels[i].type === 'parent-child' && rels[i].childId === id) return rels[i];
    }
    return null;
  };

  // Bir çiftin çocuk bağları.
  PT.childLinksOf = function (matingId, rels) {
    return rels.filter(function (r) { return r.type === 'parent-child' && r.partner1Id === matingId; });
  };

  // Eş bağını kaldırır. Çocuk bağları da gider; aksi halde var olmayan bir
  // çifte işaret eden kayıtlar kalırdı.
  PT.removeMating = function (rels, matingId) {
    return rels.filter(function (r) {
      if (r.id === matingId) return false;
      return !(r.type === 'parent-child' && r.partner1Id === matingId);
    });
  };

  // Kişinin ebeveynlerine bağını kaldırır (eş bağı ve kardeşler yerinde kalır).
  PT.removeParentLinks = function (rels, childId) {
    return rels.filter(function (r) { return !(r.type === 'parent-child' && r.childId === childId); });
  };

  // Ebeveyn-çocuk bağları üzerinden ata araması için dizin (döngülü veriye dayanıklı).
  function parentIndex(rels) {
    var matingById = {}, up = {};
    rels.forEach(function (r) { if (PT.isMating(r)) matingById[r.id] = r; });
    rels.forEach(function (r) {
      if (r.type !== 'parent-child') return;
      var m = matingById[r.partner1Id];
      if (!m) return;
      (up[r.childId] = up[r.childId] || []).push(m.partner1Id, m.partner2Id);
    });
    return up;
  }

  function reachesUp(up, ancestorId, descendantId) {
    if (ancestorId === descendantId) return false;
    var seen = {}, queue = [descendantId];
    seen[descendantId] = true;
    while (queue.length) {
      var parents = up[queue.shift()] || [];
      for (var i = 0; i < parents.length; i++) {
        var p = parents[i];
        if (p === ancestorId) return true;
        if (!seen[p]) { seen[p] = true; queue.push(p); }
      }
    }
    return false;
  }

  // ancestorId, descendantId'nin (anne/baba zinciriyle) atası mı?
  PT.isAncestor = function (ancestorId, descendantId, rels) {
    return reachesUp(parentIndex(rels), ancestorId, descendantId);
  };

  // "Çocuğu ebeveyne bağla" döngü yaratır mı: çocuk ebeveynlerden birinin kendisi
  // ya da atasıysa bağ, kişiyi kendi soyunun altına koyar.
  PT.linkWouldCycle = function (childId, parentIds, rels) {
    var up = parentIndex(rels);
    return parentIds.some(function (pid) { return pid === childId || reachesUp(up, childId, pid); });
  };

  // Eş zinciriyle birbirine bağlı kişiler (yatay hizalama için).
  PT.partnerCluster = function (id, rels) {
    var seen = {}, queue = [id];
    seen[id] = true;
    while (queue.length) {
      var cur = queue.shift();
      for (var i = 0; i < rels.length; i++) {
        var r = rels[i];
        if (!PT.isMating(r)) continue;
        if (r.partner1Id !== cur && r.partner2Id !== cur) continue;
        var other = r.partner1Id === cur ? r.partner2Id : r.partner1Id;
        if (!seen[other]) { seen[other] = true; queue.push(other); }
      }
    }
    return seen;
  };

  // Kuşak seviyeleri: ebeveyn -> çocuk ilişkisinden gevşetme yöntemiyle.
  // Eşler aynı kuşağa çekilir. Döngüsel veri gelse bile tur sayısı sınırlıdır.
  // İstisna: eşlerden biri diğerinin atasıysa (ör. baba ile kızı) ikisi aynı kuşağa
  // çekilmez; çekilseydi çocuk -> ebeveyn kuralıyla birbirini tur sınırına kadar
  // aşağı iterlerdi (iki kuşaklık aile V-VI diye numaralanıyordu).
  PT.computeGenerations = function (individuals, rels) {
    var level = {};
    individuals.forEach(function (p) { level[p.id] = 0; });

    var childLinks = rels.filter(function (r) { return r.type === 'parent-child'; });
    var up = parentIndex(rels);
    var matings = rels.filter(function (m) {
      return PT.isMating(m) &&
        !reachesUp(up, m.partner1Id, m.partner2Id) && !reachesUp(up, m.partner2Id, m.partner1Id);
    });
    var matingById = {};
    rels.forEach(function (m) { if (PT.isMating(m)) matingById[m.id] = m; });

    var rounds = Math.max(4, Math.min(individuals.length + 2, 200));
    for (var n = 0; n < rounds; n++) {
      var changed = false;

      childLinks.forEach(function (link) {
        var m = matingById[link.partner1Id];
        if (!m) return;
        var p1 = level[m.partner1Id], p2 = level[m.partner2Id];
        if (p1 === undefined && p2 === undefined) return;
        var want = Math.max(p1 === undefined ? 0 : p1, p2 === undefined ? 0 : p2) + 1;
        if (level[link.childId] !== undefined && level[link.childId] < want) {
          level[link.childId] = want;
          changed = true;
        }
      });

      matings.forEach(function (m) {
        var a = level[m.partner1Id], b = level[m.partner2Id];
        if (a === undefined || b === undefined) return;
        var want = Math.max(a, b);
        if (a !== want) { level[m.partner1Id] = want; changed = true; }
        if (b !== want) { level[m.partner2Id] = want; changed = true; }
      });

      if (!changed) break;
    }

    // Kuşak içinde soldan sağa numaralandır.
    var byLevel = {};
    individuals.forEach(function (p) {
      var L = level[p.id] || 0;
      (byLevel[L] = byLevel[L] || []).push(p);
    });

    var info = {};
    var levels = Object.keys(byLevel).map(Number).sort(function (a, b) { return a - b; });
    levels.forEach(function (L) {
      var row = byLevel[L].slice().sort(function (a, b) { return a.x - b.x; });
      row.forEach(function (p, i) {
        info[p.id] = {
          level: L,
          index: i + 1,
          label: PT.roman(L) + '-' + (i + 1),
        };
      });
    });

    return { info: info, levels: levels, byLevel: byLevel };
  };

  // Yeni eklenen çocuk(lar)ın ilk konumu. Kardeşler hem layoutSiblings hem
  // autoLayout tarafından mevcut x sırasıyla dizilir; pedigride kardeşler doğum
  // sırasıyla soldan sağa yazıldığından yeni çocuk her zaman çiftin mevcut
  // çocuklarının sağına konur (ikizlerde ikisi de, yan yana).
  PT.newChildSlots = function (matingId, individuals, rels, count) {
    var byId = {};
    individuals.forEach(function (p) { byId[p.id] = p; });
    var mating = null;
    for (var i = 0; i < rels.length; i++) if (rels[i].id === matingId) mating = rels[i];
    var p1 = mating && byId[mating.partner1Id], p2 = mating && byId[mating.partner2Id];
    var y = p1 && p2 ? Math.max(p1.y, p2.y) + PT.GEN_GAP : 0;

    var xs = PT.childLinksOf(matingId, rels)
      .map(function (r) { return byId[r.childId]; }).filter(Boolean)
      .map(function (k) { return k.x; });
    var x0;
    if (xs.length) x0 = Math.max.apply(null, xs) + PT.SIB_GAP;
    else if (p1 && p2) x0 = (p1.x + PT.SIZE + p2.x) / 2 - PT.HALF;
    else x0 = 0;

    var out = [];
    for (var n = 0; n < (count || 1); n++) out.push({ x: x0 + n * PT.SIB_GAP, y: y });
    return out;
  };

  // Kardeşleri eş çiftinin altında ortalar (çocuk eklendiğinde çağrılır).
  PT.layoutSiblings = function (matingId, individuals, rels) {
    var links = rels.filter(function (r) {
      return r.type === 'parent-child' && r.partner1Id === matingId;
    });
    if (!links.length) return individuals;

    var mating = null;
    for (var i = 0; i < rels.length; i++) if (rels[i].id === matingId) mating = rels[i];
    if (!mating) return individuals;

    var byId = {};
    individuals.forEach(function (p) { byId[p.id] = p; });
    var p1 = byId[mating.partner1Id], p2 = byId[mating.partner2Id];
    if (!p1 || !p2) return individuals;

    var kids = links.map(function (l) { return byId[l.childId]; }).filter(Boolean);
    kids.sort(function (a, b) { return a.x - b.x; });

    var span = (kids.length - 1) * PT.SIB_GAP;
    var startX = (p1.x + PT.SIZE + p2.x) / 2 - span / 2;
    var out = individuals.slice();

    kids.forEach(function (kid, i) {
      var idx = out.findIndex(function (p) { return p.id === kid.id; });
      if (idx !== -1) {
        out[idx] = Object.assign({}, out[idx], {
          x: startX + i * PT.SIB_GAP - PT.HALF,
          y: Math.max(p1.y, p2.y) + PT.GEN_GAP,
        });
      }
    });
    return out;
  };

  // Yeni kişi eklerken boş bir nokta bul (üst üste binmeyi önler).
  PT.freeSpot = function (individuals, x, y) {
    var step = 34, tries = 0, cx = x, cy = y;
    function occupied(px, py) {
      return individuals.some(function (p) {
        return Math.abs(p.x - px) < PT.SIZE + 10 && Math.abs(p.y - py) < PT.SIZE + 30;
      });
    }
    while (occupied(cx, cy) && tries < 80) {
      tries++;
      cx = x + (tries % 6) * (PT.SIZE + step);
      cy = y + Math.floor(tries / 6) * (PT.SIZE + step);
    }
    return { x: cx, y: cy };
  };
})(window.PT);
