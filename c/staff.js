// 店員画面の共通部分。Firebase JS SDK（CDN）で /spike/lines を常時購読する。
firebase.initializeApp({ databaseURL: CFG.DB_URL });
const db = firebase.database(), $ = id => document.getElementById(id);
const hhmm = t => { const d = new Date(t); return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"); };
function setStatus(id, status, stamp) {
  const b = document.querySelector(`[data-id="${id}"]`); if (b) { b.disabled = true; b.textContent = "送信中"; }
  db.ref("spike/lines/" + id).update({ status, [stamp]: firebase.database.ServerValue.TIMESTAMP })
    .catch(e => { $("msg").textContent = "失敗：" + e.message; $("msg").className = "msg err"; if (b) { b.disabled = false; b.textContent = "再送"; } });
}
function watch(render) {
  db.ref(".info/connected").on("value", s => { $("conn").textContent = s.val() ? "接続中" : "未接続"; });
  db.ref("spike/lines").on("value", s => render(Object.entries(s.val() || {}).map(([id, l]) => ({ id, ...l }))),
    e => { $("msg").textContent = "読めません：" + e.message; $("msg").className = "msg err"; });
}
