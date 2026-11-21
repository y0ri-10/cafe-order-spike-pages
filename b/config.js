// B：GAS を JSON の API として呼ぶ。URL はここ1か所。
window.API_URL = 'https://script.google.com/macros/s/AKfycbzBu2Jmt3VRJqFmbabCZqxVH3IpBffmaDgdEx9f6aQKhxQs8QqgaJqogH6s8La-l7Y/exec';
window.CFG.call = function (name, args) {
  var read = name === 'menu' || name === 'snapshot' || name === 'seat';
  var p = read
    ? fetch(window.API_URL + '?' + new URLSearchParams(Object.assign({ api: name }, args)), { redirect: 'follow' })
    : fetch(window.API_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(Object.assign({ action: name }, args)) });
  return p.then(function (r) { return r.text(); }).then(function (t) {
    try { return JSON.parse(t); } catch (e) { throw new Error('GASが想定外の返事: ' + t.replace(/<[^>]*>/g, ' ').slice(0, 120)); }
  });
};
