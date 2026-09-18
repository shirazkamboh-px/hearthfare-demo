/* Floating feedback widget. Injected site-wide by a Netlify snippet, so no
   page markup carries it — the Figma-bound data-fm-layer pages stay clean.
   Posts to the "feedback" form declared in feedback.html; submissions land
   under Forms in the Netlify dashboard. */
(function () {
  if (window.top !== window.self) return;            // not inside the Netlify Drawer's iframe
  var host = document.createElement('div');
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });    // shadow DOM keeps site CSS out

  root.innerHTML =
    '<style>' +
    ':host{all:initial}' +
    'button,input,textarea{font:inherit}' +
    '.fab{position:fixed;right:1rem;bottom:1rem;z-index:2147483647;padding:.7rem 1.1rem;border:0;border-radius:2rem;background:#f2601a;color:#fff;font:600 14px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 .4rem 1.2rem rgba(23,18,14,.28)}' +
    '.panel{position:fixed;right:1rem;bottom:1rem;z-index:2147483647;width:min(22rem,calc(100vw - 2rem));padding:1rem;border-radius:.75rem;background:#fff;color:#1a1614;font:14px/1.5 system-ui,sans-serif;box-shadow:0 .6rem 2rem rgba(23,18,14,.3)}' +
    '.panel[hidden],.fab[hidden]{display:none}' +
    'h2{margin:0 0 .25rem;font-size:15px}' +
    'p.ctx{margin:0 0 .75rem;color:#6b625b;font-size:12px;word-break:break-all}' +
    'label{display:block;margin-bottom:.5rem;font-size:12px;font-weight:600}' +
    'input,textarea{width:100%;margin-top:.25rem;padding:.5rem;border:1px solid #e3ded8;border-radius:.4rem;box-sizing:border-box;font-size:13px}' +
    '.row{display:flex;gap:.5rem;margin-top:.25rem}' +
    '.row button{flex:1;padding:.55rem;border:0;border-radius:.4rem;font:600 13px system-ui,sans-serif;cursor:pointer}' +
    '.send{background:#f2601a;color:#fff}.close{background:#f1ede9;color:#1a1614}' +
    '.msg{margin:.5rem 0 0;font-size:12px}.err{color:#b4321a}.ok{color:#1c7c44}' +
    '</style>' +
    '<button class="fab" type="button" aria-haspopup="dialog">Feedback</button>' +
    '<div class="panel" role="dialog" aria-modal="false" aria-label="Send feedback" hidden>' +
      '<h2>Send feedback</h2><p class="ctx"></p>' +
      '<form><label>Your name<input name="name" autocomplete="name"></label>' +
      '<label>What should change?<textarea name="message" rows="4" required></textarea></label>' +
      '<div class="row"><button class="send" type="submit">Send</button>' +
      '<button class="close" type="button">Cancel</button></div>' +
      '<p class="msg" role="status"></p></form>' +
    '</div>';

  var fab = root.querySelector('.fab'), panel = root.querySelector('.panel'),
      form = root.querySelector('form'), msg = root.querySelector('.msg');
  root.querySelector('.ctx').textContent = location.pathname + ' · ' + window.innerWidth + 'px wide';

  function open(yes) {
    panel.hidden = !yes; fab.hidden = yes;
    if (yes) form.querySelector('textarea').focus();
  }
  fab.addEventListener('click', function () { open(true); });
  root.querySelector('.close').addEventListener('click', function () { open(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) open(false); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.className = 'msg'; msg.textContent = 'Sending…';
    var body = new URLSearchParams({
      'form-name': 'feedback',
      name: form.name.value,
      message: form.message.value,
      page: location.pathname,
      viewport: window.innerWidth + 'px'
    });
    fetch('/feedback.html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      msg.className = 'msg ok'; msg.textContent = 'Thanks — sent.';
      form.reset();
      setTimeout(function () { open(false); msg.textContent = ''; }, 1400);
    }).catch(function () {
      msg.className = 'msg err';
      msg.textContent = 'Could not send. Try the form at /feedback.html';
    });
  });
})();
