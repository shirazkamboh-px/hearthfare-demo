// Prototype-only side switcher: a fixed notch that jumps to each side's main page.
// Links resolve against this script's own URL, so it works from / and /app/ alike.
// ponytail: delete this file and its <script> tags once real auth routes by role.
(function () {
  var base = document.currentScript.src;
  var page = location.pathname.split('/').pop();
  var icon = function (paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  };
  var sides = [
    ['Marketing', 'index.html', /^(index|how-it-works|why-hearthfare|whats-cooking|for-cooks|login|signup)?(\.html)?$/,
      icon('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.6 3.5 5.4 3.5 8.5s-1.1 5.9-3.5 8.5c-2.4-2.6-3.5-5.4-3.5-8.5s1.1-5.9 3.5-8.5Z"/>')],
    ['Customer', 'app/shop-search.html', /^(customer|shop)-/,
      icon('<path d="M5.5 7.5h13l-1.1 11.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8Z"/><path d="M9 7.5V6a3 3 0 0 1 6 0v1.5"/>')],
    ['Operator', 'app/cook-dashboard.html', /^cook-/,
      icon('<path d="M7 17.5h10V21H7Z"/><path d="M7 17.5V13a4 4 0 0 1-.6-7.9A4.5 4.5 0 0 1 12 3a4.5 4.5 0 0 1 5.6 2.1A4 4 0 0 1 17 13v4.5"/>')]
    // ponytail: Admin hidden for now — restore ['Admin', 'app/admin-dashboard.html', /^admin-/, shield icon] when it's back in scope.
  ];

  // Every tab is the same box active or not — only colours change — so switching never shifts the row.
  var style = document.createElement('style');
  style.textContent =
    '.side-notch{position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:.25rem;padding:.375rem;' +
    'background:#17120e;border-radius:0 0 1rem 1rem;box-shadow:0 .25rem .75rem rgba(23,18,14,.25);font:600 .75rem/1 "Segoe UI",Roboto,Arial,sans-serif}' +
    '.side-notch a{display:inline-flex;align-items:center;gap:.4375rem;height:1.875rem;padding:0 .8125rem;border-radius:62.5rem;color:#cfc4bb;text-decoration:none;white-space:nowrap;box-sizing:border-box}' +
    '.side-notch svg{width:.9375rem;height:.9375rem;flex:none}' +
    '.side-notch a:hover{background:#2a2320;color:#fff8f1}' +
    '.side-notch a:focus-visible{outline:2px solid #ff8a1e;outline-offset:1px}' +
    '.side-notch a[aria-current]{background:linear-gradient(101deg,#ff8a1e 0%,#f04e23 100%);color:#fff}' +
    '@media (max-width:40rem){.side-notch a{padding:0 .625rem}.side-notch a span{display:none}}' +
    '@media print{.side-notch{display:none}}';
  document.head.appendChild(style);

  var nav = document.createElement('nav');
  nav.className = 'side-notch';
  nav.setAttribute('aria-label', 'Switch side');
  sides.forEach(function (s) {
    var a = document.createElement('a');
    a.href = new URL(s[1], base).href;
    a.title = s[0];
    a.innerHTML = s[3] + '<span>' + s[0] + '</span>';
    if (s[2].test(page)) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  });
  document.body.appendChild(nav);
})();
