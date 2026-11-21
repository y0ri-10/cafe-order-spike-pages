// 3画面共通。CFG = {page, seat, call(name,args)->Promise}。通信の仕方だけが案ごとに違う。
(function () {
  var C = window.CFG, app = document.getElementById('app'), menu = [], names = {};
  var ST = { new: 'つくっています', ready: 'できました', served: 'お届け済み' };
  var el = function (h) { app.innerHTML = h; };
  var hm = function (t) { var d = new Date(t); return d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2); };
  var msg = function (t, cls) { var m = document.getElementById('msg'); if (m) { m.textContent = t; m.className = cls || ''; } };
  var rid = function () { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now(); };
  var unwrap = function (r) { if (!r || r.ok === false) throw new Error((r && r.error) || '失敗'); return r; };

  function loadMenu() {
    return C.call('menu', {}).then(unwrap).then(function (r) { menu = r.menu; menu.forEach(function (m) { names[m.id] = m.name; }); });
  }

  // 取り直し。版が同じなら「変化なし」だけ返る
  function poller(name, args, draw, ms) {
    var v = 0, lines = [];
    function tick() {
      C.call(name, args(v)).then(unwrap).then(function (r) {
        if (!r.same) { v = r.v; lines = r.l; draw(lines); }
        msg('');
      }).catch(function (e) { msg('通信に失敗: ' + e.message, 'err'); }).then(function () { setTimeout(tick, ms); });
    }
    tick();
    return function () { v = 0; };
  }

  function customer() {
    var seat = C.seat, q = {}, busy = false, myRid = null;
    var total = function () { var t = 0; menu.forEach(function (m) { t += (q[m.id] || 0) * m.price; }); return t; };
    var count = function () { var n = 0; for (var k in q) n += q[k]; return n; };
    function draw() {
      var cat = '', h = '<h1>カフェ注文 試作</h1><div>席 ' + seat + '</div>';
      menu.forEach(function (m) {
        if (m.cat !== cat) { cat = m.cat; h += '<h2>' + cat + '</h2>'; }
        h += '<div class="row"><span>' + m.name + ' ' + m.price + '円</span><span class="qty"><button data-d="-1" data-id="' + m.id + '">-</button><b>' + (q[m.id] || 0) + '</b><button data-d="1" data-id="' + m.id + '">+</button></span></div>';
      });
      h += '<button class="main" id="go"' + (count() && !busy ? '' : ' disabled') + '>' + (busy ? '送信中' : '注文する ' + total() + '円') + '</button><div id="msg"></div><h2>いまの注文</h2><div id="mine"></div>';
      el(h);
      if (mineLines) drawMine(mineLines);
      var bs = app.querySelectorAll('button[data-id]');
      for (var i = 0; i < bs.length; i++) bs[i].onclick = function () {
        var id = this.getAttribute('data-id'), d = +this.getAttribute('data-d');
        q[id] = Math.max(0, Math.min(9, (q[id] || 0) + d)); draw();
      };
      document.getElementById('go').onclick = send;
    }
    var mineLines = null;
    function drawMine(l) {
      mineLines = l;
      var d = document.getElementById('mine');
      if (d) d.innerHTML = l.length ? l.map(function (r) { return '<div class="row"><span>' + names[r[2]] + ' ×' + r[3] + '</span><span>' + ST[r[4]] + '</span></div>'; }).join('') : '<div class="small">まだありません</div>';
    }
    function send() {
      var items = []; for (var k in q) if (q[k]) items.push({ itemId: k, qty: q[k] });
      busy = true; myRid = myRid || rid(); draw();
      C.call('placeOrder', { requestId: myRid, seat: seat, items: items }).then(unwrap).then(function () {
        q = {}; myRid = null; busy = false; draw(); msg('注文しました', 'ok'); resetPoll();
      }).catch(function (e) { busy = false; draw(); msg('送れませんでした: ' + e.message, 'err'); });
    }
    if (!(seat >= 1 && seat <= 80)) { el('<h1>カフェ注文 試作</h1><div class="err">席の番号が必要です（?seat=1〜80）</div>'); return; }
    var resetPoll;
    loadMenu().then(function () {
      draw();
      resetPoll = poller('seat', function () { return { seat: seat }; }, drawMine, 5000);
      window.__ready = true;
    }).catch(function (e) { el('<div class="err">メニューを読めません: ' + e.message + '</div>'); });
  }

  // キッチン・ウェイター共通：指定の状態の行を並べ、ボタンで次の状態へ
  function staff(page) {
    var kitchen = page === 'kitchen', from = kitchen ? 'new' : 'ready', to = kitchen ? 'ready' : 'served', label = kitchen ? 'できた' : '届けた';
    var busy = {}, last = [], again;
    function draw(l) {
      last = l;
      var rows = l.filter(function (r) { return r[4] === from; }).sort(function (a, b) { return (kitchen ? a[5] : a[6]) - (kitchen ? b[5] : b[6]); });
      var h = '<h1>カフェ注文 試作 ' + (kitchen ? 'キッチン' : 'ウェイター') + '</h1>';
      if (kitchen) {
        var t = {}; rows.forEach(function (r) { t[r[2]] = (t[r[2]] || 0) + r[3]; });
        h += '<h2>あと作る数</h2>' + (Object.keys(t).length ? Object.keys(t).map(function (k) { return '<div class="row"><span>' + names[k] + '</span><b>' + t[k] + '</b></div>'; }).join('') : '<div class="small">なし</div>');
      }
      h += '<h2>' + (kitchen ? '注文' : 'できた') + ' ' + rows.length + '件</h2>';
      h += rows.map(function (r) {
        return '<div class="row" data-line="' + r[0] + '"><span>' + names[r[2]] + ' ×' + r[3] + '<br><span class="small">席 ' + r[1] + ' ' + hm(r[5]) + '</span></span><button data-l="' + r[0] + '"' + (busy[r[0]] ? ' disabled' : '') + '>' + (busy[r[0]] ? '送信中' : label) + '</button></div>';
      }).join('') + '<div id="msg"></div>';
      el(h);
      var bs = app.querySelectorAll('button[data-l]');
      for (var i = 0; i < bs.length; i++) bs[i].onclick = function () {
        var id = +this.getAttribute('data-l'); busy[id] = true; draw(last);
        C.call('updateLine', { lineId: id, status: to }).then(unwrap).then(function () { delete busy[id]; again(); })
          .catch(function (e) { delete busy[id]; draw(last); msg('送れませんでした: ' + e.message, 'err'); });
      };
    }
    loadMenu().then(function () {
      again = poller('snapshot', function (v) { return { since: v }; }, draw, 4000);
      window.__ready = true;
    }).catch(function (e) { el('<div class="err">メニューを読めません: ' + e.message + '</div>'); });
  }

  if (C.page === 'customer') customer(); else staff(C.page);
})();
