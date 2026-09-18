// Mobile navigation drawer and sortable tables. The screens are static HTML;
// nothing depends on this having run — the closed drawer and the unsorted
// table are the default states in the markup.
(function () {
  function setMenu(on) {
    var side = document.querySelector('.app-side');
    var scrim = document.querySelector('.app-scrim');
    var toggle = document.querySelector('[data-menu-open]');
    if (side) side.classList.toggle('app-side--open', on);
    if (scrim) scrim.hidden = !on;
    if (toggle) toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
  }

  // Right-hand full-height sheet. Each opener names its sheet in aria-controls,
  // so a page can carry more than one (every cook screen has the notifications
  // drawer, and Availability/Menu add their own editor). An opener with data-fill
  // ({"element-id": value}) sets fields and text directly; a boolean shows or
  // hides that element (or enables/disables a fieldset). Otherwise (cook-menu) it reads the .dish card.
  var opener;

  function applyFill(sheet, data) {
    Object.keys(data).forEach(function (id) {
      var el = sheet.querySelector('#' + id), v = data[id];
      if (typeof v === 'boolean') { if (el.tagName === 'FIELDSET') el.disabled = !v; else el.hidden = !v; }
      else if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.value = v;
      else el.textContent = v;
    });
  }

  function fillSheet(sheet, card) {
    function text(sel) {
      var n = card && card.querySelector(sel);
      return n ? n.textContent.trim() : '';
    }
    var sizes = [], qty = '';
    if (card) Array.prototype.forEach.call(card.querySelectorAll('.dish__tags .pill'), function (pill) {
      var t = pill.textContent, m = t.match(/^(.+) \$([\d.]+)$/);
      if (m) sizes.push([m[1], m[2]]);
      m = t.match(/of (\d+) left|all (\d+) sold/);
      if (m) qty = m[1] || m[2];
    });

    sheet.querySelector('#add-item-title').textContent = card ? 'Edit menu item' : 'Add menu item';
    sheet.querySelector('[data-sheet-submit] .btn__label').textContent = card ? 'Save changes' : 'Add to menu';
    sheet.querySelector('#item-name').value = text('.dish__name');
    var categoryPill = card && card.querySelector('.dish__tags .pill--accent');
    sheet.querySelector('#item-category').value = categoryPill ? categoryPill.textContent.trim() : 'Mains';
    sheet.querySelector('#item-desc').value = text('.dish__body');
    sheet.querySelector('#item-qty').value = qty;
    sheet.querySelector('#item-from').value = '';
    sheet.querySelector('#item-until').value = '';

    var photo = card && card.querySelector('img.dish__photo');
    sheet.querySelector('.photos').hidden = !photo;
    if (photo) sheet.querySelector('.photos__img').src = photo.src;

    // One size row per "Small $14.00" pill; the first row is the template.
    var rows = sheet.querySelectorAll('[data-size-row]'), first = rows[0];
    for (var i = 1; i < rows.length; i++) rows[i].remove();
    (sizes.length ? sizes : [['Small', '']]).forEach(function (size, n) {
      var row = first;
      if (n) {
        row = first.parentNode.appendChild(first.cloneNode(true));
        Array.prototype.forEach.call(row.querySelectorAll('[id]'), function (el) { el.id = el.id.replace(/\d+$/, n + 1); });
        Array.prototype.forEach.call(row.querySelectorAll('[for]'), function (el) { el.htmlFor = el.htmlFor.replace(/\d+$/, n + 1); });
      }
      row.querySelector('select').value = size[0];
      row.querySelector('.input-prefix .input').value = size[1];
    });
  }

  function setSheet(on, from) {
    // Opening picks the opener's own sheet; closing finds whichever one is open.
    var sheet = on ? document.getElementById(from.getAttribute('aria-controls'))
                   : document.querySelector('.sheet:not([hidden])');
    if (!sheet) return;
    var scrim = document.querySelector('.sheet-scrim');
    var isOpen = !sheet.hidden && !sheet.classList.contains('sheet--closing');
    if (on === isOpen) return;

    if (on) {
      opener = from;
      var fill = from.getAttribute('data-fill');
      if (fill) applyFill(sheet, JSON.parse(fill));
      else if (sheet.id === 'add-item') fillSheet(sheet, from.closest('.dish'));
      sheet.querySelector('.sheet__body').scrollTop = 0;
      [sheet, scrim].forEach(function (el) { el.classList.remove('sheet--closing'); el.hidden = false; });
      // preventScroll: the sheet is still off-canvas mid-slide; plain focus() scrolls the page sideways.
      // The notifications drawer has no fields, so its close button takes focus instead.
      (sheet.querySelector('input') || sheet.querySelector('[data-sheet-close]')).focus({ preventScroll: true });
    } else {
      // Hide once the slide-out finishes. No animations (reduced motion) resolves at once;
      // reopening mid-close cancels them, which rejects and leaves the sheet open.
      [sheet, scrim].forEach(function (el) {
        el.classList.add('sheet--closing');
        Promise.all(el.getAnimations().map(function (a) { return a.finished; })).then(function () {
          if (!el.classList.contains('sheet--closing')) return;
          el.classList.remove('sheet--closing');
          el.hidden = true;
        }, function () {});
      });
      if (opener) opener.focus();
    }
    if (opener) opener.setAttribute('aria-expanded', on ? 'true' : 'false');
  }


  // Forced status update: picking a status reveals this button, pressing it logs the change.
  function applyButton(el) {
    var panel = el.closest('.panel');
    return panel && panel.querySelector('[data-status-apply]');
  }

  function applyStatus(btn) {
    var panel = btn.closest('.panel');
    var sel = panel.querySelector('.status-select');
    var log = panel.querySelector('#status-history');
    sel.setAttribute('data-status', sel.value);
    if (log) log.insertAdjacentHTML('afterbegin', '<div class="money__row"><span class="money__label">' + sel.value + ' · set by you</span><span class="money__value">Just now</span></div>');
    btn.hidden = true;
  }

  // Pane tabs (cook-storefront-edit stepper, cook-payments .tabs): one link per pane; the other panes stay [hidden].
  function showTab(link) {
    Array.prototype.forEach.call(link.parentNode.querySelectorAll('[data-tab]'), function (a) {
      var on = a === link;
      a.classList.toggle(a.classList.contains('tab') ? 'tab--on' : 'stepper__item--on', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
      document.getElementById(a.hash.slice(1)).hidden = !on;
    });
  }

  // Reports period filter: Today / Yesterday buttons plus a <details> dropdown
  // whose trigger takes the label of the period picked from it.
  function closePeriodMenus(except) {
    Array.prototype.forEach.call(document.querySelectorAll('.period__more[open]'), function (d) {
      if (!d.contains(except)) d.open = false;
    });
  }

  // Orders: rows carry data-when="today week month" and, on Orders only,
  // data-method="pickup|dinein" / data-flag="needs-action refunded". A row
  // shows when it matches the active period AND (no secondary filter, or it
  // matches the one active filter).
  // Two bars can jointly filter one set of rows (Orders: the period dropdown
  // in the page head plus the method/flag chips now inside the table panel),
  // so scope to .app-body__inner first — it wraps both. The dashboard rail
  // sits outside .app-body__inner as its own aside, so its bar falls through
  // to its own .panel instead and stays isolated from the orders table. The
  // notifications drawer is checked first: it sits outside the body entirely,
  // and on the dashboard its chips must not reach the rail's copy of the list.
  function applyOrderFilters(bar) {
    var root = (bar && (bar.closest('.sheet') || bar.closest('.app-body__inner') || bar.closest('.panel'))) || document;
    var periodBtn = root.querySelector('.period__opt--on[data-period]');
    var period = periodBtn && periodBtn.getAttribute('data-period');
    var filterBtn = root.querySelector('.period__opt--on[data-filter]');
    var filter = filterBtn && filterBtn.getAttribute('data-filter');
    Array.prototype.forEach.call(root.querySelectorAll('[data-when], [data-flag]'), function (row) {
      var okPeriod = !period || (row.getAttribute('data-when') || '').split(' ').indexOf(period) >= 0;
      var okFilter = !filter || row.getAttribute('data-method') === filter || (row.getAttribute('data-flag') || '').split(' ').indexOf(filter) >= 0;
      row.hidden = !(okPeriod && okFilter);
    });
  }

  function pickPeriod(btn) {
    var bar = btn.closest('.period__presets');
    var fromMenu = btn.classList.contains('period__item');
    Array.prototype.forEach.call(bar.querySelectorAll('.period__opt, .period__item'), function (b) {
      var on = b === btn || (fromMenu && b.tagName === 'SUMMARY');
      b.classList.toggle(b.classList.contains('period__item') ? 'period__item--on' : 'period__opt--on', on);
      if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (fromMenu) bar.querySelector('.period__current').textContent = btn.textContent;
    closePeriodMenus(null);
    applyOrderFilters(bar);

    // Date / Custom range menu items reveal their own picker in place of
    // filtering rows; picking anything else hides both pickers again.
    var toolbar = bar.closest('.period');
    if (toolbar) {
      var range = btn.getAttribute('data-range');
      Array.prototype.forEach.call(toolbar.querySelectorAll('.period__range'), function (r) {
        r.hidden = r.getAttribute('data-range') !== range;
      });
    }
  }

  // Secondary filter chips (Pickup / Dine-In / Needs Action / Refunded): click
  // to filter to that one, click again to clear back to all.
  // A bar carrying an All chip (data-filter="") is radio-style — All *is* the
  // cleared state, so one chip is always lit. Without one, clicking the active
  // chip clears back to showing everything.
  function pickFilter(btn) {
    var bar = btn.closest('.period__presets');
    var radio = bar.querySelector('.period__opt[data-filter=""]');
    var target = (!radio && btn.getAttribute('aria-pressed') === 'true') ? null : btn;
    Array.prototype.forEach.call(bar.querySelectorAll('.period__opt'), function (b) {
      var bOn = b === target;
      b.classList.toggle('period__opt--on', bOn);
      b.setAttribute('aria-pressed', bOn ? 'true' : 'false');
    });
    applyOrderFilters(bar);
  }

  // Storefront Pickup / Dine-in: the chosen option shows its [data-show] blocks and hides the other's.
  function setMode(btn) {
    var mode = btn.getAttribute('data-mode');
    Array.prototype.forEach.call(document.querySelectorAll('[data-mode]'), function (b) {
      var on = b.getAttribute('data-mode') === mode;
      b.classList.toggle('fulfil__opt--on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-show]'), function (n) {
      n.hidden = n.getAttribute('data-show') !== mode;
    });
  }

  // Deep links: cook-orders.html#today preselects a period, shop-storefront.html#dinein a method.
  var hash = /^#\w+$/.test(location.hash) && location.hash.slice(1);
  var preset = hash && document.querySelector('[data-period="' + hash + '"]');
  if (preset) pickPeriod(preset);
  var presetMode = hash && document.querySelector('[data-mode="' + hash + '"]');
  if (presetMode) setMode(presetMode);
  // customer-account.html#password opens that tab.
  var presetTab = hash && document.querySelector('[data-tab][href="#' + hash + '"]');
  if (presetTab) showTab(presetTab);

  // Conversations open at the newest message — again once images have loaded and grown the list.
  var chatBody = document.querySelector('.chat__body');
  if (chatBody) {
    chatBody.scrollTop = chatBody.scrollHeight;
    window.addEventListener('load', function () { chatBody.scrollTop = chatBody.scrollHeight; });
  }

  // Table sorting: click a header to sort ascending, click again to reverse.
  var MONTH = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;

  function sortKey(cell) {
    var text = cell ? cell.textContent.replace(/\s+/g, ' ').trim() : '';
    var num = text.replace(/[$,%\s]/g, '').replace('−', '-');
    if (num !== '' && !isNaN(num)) return +num;
    // ponytail: only full dates with a month name and year sort as dates;
    // relative ones ("Today", "Fri 12 Sep") sort as text. Add data-sort values if that matters.
    if (MONTH.test(text) && /\b\d{4}\b/.test(text)) {
      var date = Date.parse(text.replace(/·.*/, ''));
      if (!isNaN(date)) return date;
    }
    return text;
  }

  function sortable(th) {
    var label = th.textContent.trim();
    return label !== '' && !/^actions$/i.test(label);
  }

  function sortBy(th) {
    var body = th.closest('table').tBodies[0];
    if (!body) return;
    var heads = th.parentNode.cells;
    var col = Array.prototype.indexOf.call(heads, th);
    var dir = th.getAttribute('aria-sort') === 'ascending' ? -1 : 1;
    Array.prototype.forEach.call(heads, function (h) { h.removeAttribute('aria-sort'); });
    th.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');

    var rows = Array.prototype.slice.call(body.rows);
    rows.sort(function (a, b) {
      var x = sortKey(a.cells[col]), y = sortKey(b.cells[col]);
      if (typeof x === 'number' && typeof y === 'number') return dir * (x - y);
      return dir * String(x).localeCompare(String(y), undefined, { numeric: true });
    });
    rows.forEach(function (row) { body.appendChild(row); });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.table thead th'), function (th) {
    if (sortable(th)) th.tabIndex = 0;
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target : e.target.parentElement;
    if (!el) return;
    closePeriodMenus(el);
    var pick = el.closest('.period__opt[type="button"], .period__item');
    if (pick) return pick.hasAttribute('data-filter') ? pickFilter(pick) : pickPeriod(pick);
    var mode = el.closest('[data-mode]');
    if (mode) return setMode(mode);
    if (el.closest('[data-menu-open]')) return setMenu(true);
    if (el.closest('[data-menu-close]') || el.closest('.app-scrim')) return setMenu(false);
    var opens = el.closest('[data-sheet-open]');
    if (opens) return setSheet(true, opens);
    if (el.closest('[data-sheet-close]')) return setSheet(false);
    var apply = el.closest('[data-status-apply]');
    if (apply) return applyStatus(apply);
    var tab = el.closest('[data-tab]');
    if (tab) { e.preventDefault(); return showTab(tab); }
    var th = el.closest('.table thead th[tabindex]');
    if (th) return sortBy(th);
    // A row opens its detail page, unless the click was on a control inside it.
    var row = el.closest('tr[data-href]');
    if (row && !el.closest('a, button, select, input, label')) location.href = row.getAttribute('data-href');
  });

  // Status dropdown recolours itself. Paid is automatic, so its option is disabled.
  // On the order detail page the pick is only staged: the panel's apply button commits it.
  document.addEventListener('change', function (e) {
    if (!e.target.classList.contains('status-select')) return;
    e.target.setAttribute('data-status', e.target.value);
    var btn = applyButton(e.target);
    if (btn) btn.hidden = false;
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setMenu(false); closePeriodMenus(null); return setSheet(false); }
    var th = e.target.closest && e.target.closest('.table thead th[tabindex]');
    if (th && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      sortBy(th);
    }
  });

  // Storefront web address: checked against a small demo list of taken slugs.
  // Clears once the address is available again (or matches the Hearth's own
  // current one); Publish stays disabled while it's taken.
  var slugInput = document.getElementById('sf-slug');
  if (slugInput) {
    var slugWrap = document.getElementById('sf-slug-wrap');
    var slugError = document.getElementById('sf-slug-error');
    var slugErrorValue = document.getElementById('sf-slug-error-value');
    var publishBtn = document.getElementById('sf-publish');
    var takenSlugs = slugInput.getAttribute('data-taken').split(' ');
    var originalSlug = slugInput.getAttribute('data-original');
    var checkSlug = function () {
      var value = slugInput.value.trim().toLowerCase();
      var isTaken = value !== originalSlug && takenSlugs.indexOf(value) >= 0;
      slugWrap.classList.toggle('input-prefix--error', isTaken);
      slugError.hidden = !isTaken;
      if (isTaken) slugErrorValue.textContent = value;
      if (publishBtn) publishBtn.disabled = isTaken;
    };
    slugInput.addEventListener('input', checkSlug);
    checkSlug();
  }

  // Storefront Write a review: the posted review joins the top of the list. Browser
  // validation (required rating and text) runs first, so submit only fires when complete.
  var reviewForm = document.querySelector('[data-review-form]');
  if (reviewForm) reviewForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var list = document.querySelector('[data-review-list]');
    var card = list.querySelector('.panel').cloneNode(true);
    var fields = reviewForm.elements, stars = +fields.rating.value;
    card.querySelector('.table__strong').textContent = 'You';
    card.querySelector('.table__person-sub').textContent = 'Just now';
    card.querySelector('.dish__body').textContent = '★★★★★☆☆☆☆☆'.slice(5 - stars, 10 - stars) + ' ' + fields.text.value.trim();
    card.querySelector('.avatar img').src = 'assets/avatars/marisol.jpg';
    list.insertBefore(card, list.firstChild);
    reviewForm.reset();
    reviewForm.closest('[popover]').hidePopover();
  });

  // Search (shop-search): the filter panel and the sort select hide and reorder the
  // result cards by their data-* attributes. Every option shows how many Hearths it
  // would add, and whatever is switched on is listed above the results, removable.
  var results = document.querySelector('[data-results]');
  if (results) {
    var all = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
    var panel = document.querySelector('[data-filters]');
    var form = panel.querySelector('form');
    var openSwitch = panel.querySelector('[data-filter-open]');
    var range = panel.querySelector('[name="miles"]');
    var cards = all('.meal-card', results);
    var miles = function (n) { return 'Within ' + n + (n === 1 ? ' mile' : ' miles'); };

    // Map view shows the same cards as pins — List/Map is a radio pair the CSS
    // swaps on its own, so nothing below knows which view is showing. A pin sits
    // at its Hearth's data-miles and data-bearing from the centre, scaled so the
    // distance filter lands on the dashed ring; the box's own proportions come
    // from the element, since it is 4:3 wide, capped in height and square on a
    // phone. ponytail: bearings stand in for coordinates until the geocoder is
    // picked (Q-14) — swapping place() for a real projection is the whole change.
    var map = document.querySelector('[data-map]');
    var pinFor = {}, cardFor = {}, picked = cards[0];
    var pins = map ? all('[data-map-pin]', map) : [];
    pins.forEach(function (pin) { pinFor[pin.dataset.mapPin] = pin; });
    cards.forEach(function (card) { cardFor[card.dataset.name] = card; });

    var place = function () {
      if (!map || !map.clientHeight) return;
      var aspect = map.clientWidth / map.clientHeight, span = +range.value * 1.15;
      cards.forEach(function (card) {
        var pin = pinFor[card.dataset.name];
        if (!pin) return;
        var r = +card.dataset.miles / span, bearing = +card.dataset.bearing * Math.PI / 180;
        pin.style.left = (50 + Math.sin(bearing) * r * 50 / aspect) + '%';
        pin.style.top = (50 - Math.cos(bearing) * r * 50) + '%';
        pin.hidden = card.hidden;
      });
    };

    // The popup is the result card itself, cloned, so it can never drift from it.
    var select = function (card) {
      picked = card;
      pins.forEach(function (pin) {
        var on = !!card && pin === pinFor[card.dataset.name];
        pin.classList.toggle('map__pin--on', on);
        pin.setAttribute('aria-pressed', on);
      });
      map.querySelector('[data-map-preview]').hidden = !card;
      if (card) map.querySelector('[data-preview-card]').replaceChildren(card.cloneNode(true));
    };

    var state = function () {
      var values = function (name) { return all('[name="' + name + '"]:checked', form).map(function (i) { return i.value; }); };
      return {
        open: openSwitch.getAttribute('aria-checked') === 'true',
        miles: +range.value,
        when: +values('when')[0],
        fulfil: values('fulfil'),
        cuisine: values('cuisine')
      };
    };

    // Passes every filter, optionally ignoring one group — that group's option counts
    // answer "how many if I tick this too", so checked neighbours don't zero them out.
    var passes = function (card, s, skip) {
      var d = card.dataset;
      return (!s.open || d.open === 'true') && +d.miles <= s.miles && +d.earliest < s.when &&
        (skip === 'fulfil' || d.fulfil.split(' ').some(function (m) { return s.fulfil.indexOf(m) >= 0; })) &&
        (skip === 'cuisine' || !s.cuisine.length || s.cuisine.indexOf(d.cuisine) >= 0);
    };

    var setOpen = function (on) {
      openSwitch.setAttribute('aria-checked', on);
      openSwitch.classList.toggle('toggle--on', on);
    };

    var removable = function (label, undo) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip chip--on';
      b.setAttribute('aria-label', 'Remove filter: ' + label);
      b.textContent = label;
      b.insertAdjacentHTML('beforeend', '<svg class="chip__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>');
      b.addEventListener('click', function () { undo(); update(); });
      return b;
    };

    var update = function () {
      var s = state(), key = document.getElementById('sort').value, shown = 0;

      cards.forEach(function (card) {
        card.hidden = !passes(card, s);
        if (!card.hidden) shown++;
      });
      cards.slice().sort(function (a, b) {
        var x = a.dataset[key], y = b.dataset[key];
        return isNaN(x) ? x.localeCompare(y) : x - y;
      }).forEach(function (card) { results.appendChild(card); });

      if (map) {
        place();
        // Filtering the open popup away falls back to the nearest Hearth left.
        if (!picked || picked.hidden) select(cards.filter(function (c) { return !c.hidden; })[0] || null);
      }

      all('[name="fulfil"], [name="cuisine"]', form).forEach(function (input) {
        var n = cards.filter(function (card) {
          var own = input.name === 'cuisine' ? card.dataset.cuisine === input.value : card.dataset.fulfil.split(' ').indexOf(input.value) >= 0;
          return own && passes(card, s, input.name);
        }).length;
        var label = input.closest('label');
        label.querySelector('[data-count]').textContent = n;
        label.classList.toggle('filters__opt--none', !n && !input.checked);
      });
      panel.querySelector('[data-miles-out]').textContent = miles(s.miles);

      var list = document.querySelector('[data-active-list]');
      list.textContent = '';
      if (!s.open) list.appendChild(removable('Including paused Hearths', function () { setOpen(true); }));
      if (s.fulfil.length === 1) list.appendChild(removable(s.fulfil[0] === 'pickup' ? 'Pickup only' : 'Dine-in only', function () {
        all('[name="fulfil"]', form).forEach(function (i) { i.checked = true; });
      }));
      var when = form.querySelector('[name="when"]:checked');
      if (!when.defaultChecked) list.appendChild(removable(when.getAttribute('data-label'), function () {
        all('[name="when"]', form).forEach(function (i) { i.checked = i.defaultChecked; });
      }));
      if (range.value !== range.defaultValue) list.appendChild(removable(miles(s.miles), function () { range.value = range.defaultValue; }));
      s.cuisine.forEach(function (c) {
        list.appendChild(removable(c, function () { form.querySelector('[name="cuisine"][value="' + c + '"]').checked = false; }));
      });
      var active = list.children.length, badge = panel.querySelector('[data-filters-active]');
      document.querySelector('[data-active-filters]').hidden = !active;
      badge.textContent = active;
      badge.hidden = !active;

      var hearths = shown + (shown === 1 ? ' Hearth' : ' Hearths');
      document.querySelector('[data-results-count]').textContent = shown + (s.open ? ' Open' : '') + hearths.slice(String(shown).length) + ' ' + miles(s.miles).toLowerCase() + '.';
      panel.querySelector('[data-filters-done-label]').textContent = 'Show ' + hearths;
      all('[data-results-empty]').forEach(function (el) { el.hidden = shown > 0; });
    };

    form.addEventListener('input', function (e) {
      // Pickup and dine-in can't both be off — there would be nothing to show.
      if (e.target.name === 'fulfil' && !form.querySelector('[name="fulfil"]:checked')) e.target.checked = true;
      update();
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-filter-open]')) { setOpen(openSwitch.getAttribute('aria-checked') !== 'true'); update(); }
      else if (e.target.closest('[data-filters-clear]')) { form.reset(); setOpen(true); update(); }
      else if (e.target.closest('[data-filters-done]')) { panel.open = false; panel.scrollIntoView({ block: 'start' }); }
      else if (e.target.closest('[data-map-pin]')) select(cardFor[e.target.closest('[data-map-pin]').dataset.mapPin]);
      else if (e.target.closest('[data-preview-close]')) select(null);
    });
    document.addEventListener('keydown', function (e) {
      if (e.target === openSwitch && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openSwitch.click(); }
    });
    document.addEventListener('change', function (e) {
      if (e.target.id === 'sort') update();
    });

    // Stacked layout (1200px and narrower): the panel starts collapsed so results come
    // first. Side by side it stays open — the summary isn't a toggle there.
    var stacked = matchMedia('(max-width: 75rem)');
    panel.open = !stacked.matches;
    panel.addEventListener('toggle', function () { if (!stacked.matches) panel.open = true; });

    // Home and What's cooking search forms arrive with ?zip=…; textContent keeps it inert.
    var zip = new URLSearchParams(location.search).get('zip');
    if (zip) {
      document.getElementById('loc').value = zip;
      document.querySelector('[data-results-title]').textContent = 'Hearths near ' + zip;
      document.title = 'Hearths near ' + zip + ' — Hearthfare';
      if (map) map.querySelector('[data-map-here]').textContent = zip;
    }
    update();
    // The map is display:none in list view, so it has no size to measure until the
    // switch flips — that resize is the cue to place the pins.
    if (map) new ResizeObserver(place).observe(map);
  }

  // Cart (shop-cart): − / + and Remove change a line, then every total on the page follows.
  var cart = document.querySelector('[data-cart]');
  if (cart) {
    var money = function (n) { return '$' + n.toFixed(2); };
    var setText = function (sel, text) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) { el.textContent = text; });
    };

    var cartTotals = function () {
      var subtotal = 0, count = 0;
      Array.prototype.forEach.call(cart.querySelectorAll('[data-price]'), function (line) {
        var qty = +line.querySelector('.qty__value').textContent, price = +line.getAttribute('data-price');
        subtotal += qty * price;
        count += qty;
        line.querySelector('.cart-item__total').textContent = money(qty * price);
        line.querySelector('[data-qty="-1"]').disabled = qty <= 1;
        line.querySelector('[data-qty="1"]').disabled = qty >= +line.getAttribute('data-max');
      });
      // Same math as checkout: 7.75% sales tax; platform fee 6% of the subtotal, $2.50 minimum.
      var tax = Math.round(subtotal * 7.75) / 100;
      var fee = count ? Math.max(Math.round(subtotal * 6) / 100, 2.5) : 0;
      setText('[data-cart-subtotal]', money(subtotal));
      setText('[data-cart-tax]', money(tax));
      setText('[data-cart-fee]', money(fee));
      setText('[data-cart-total]', money(subtotal + tax + fee));
      setText('[data-cart-count]', count + (count === 1 ? ' item' : ' items'));
      setText('.cart__badge', count);
      Array.prototype.forEach.call(document.querySelectorAll('.cart'), function (c) { c.setAttribute('aria-label', 'Cart, ' + count + (count === 1 ? ' item' : ' items')); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-cart-full]'), function (el) { el.hidden = !count; });
      Array.prototype.forEach.call(document.querySelectorAll('[data-cart-empty]'), function (el) { el.hidden = count > 0; });
    };

    cart.addEventListener('click', function (e) {
      var step = e.target.closest('[data-qty]'), remove = e.target.closest('[data-remove]');
      if (!step && !remove) return;
      var line = e.target.closest('[data-price]');
      if (remove) line.remove();
      else {
        var value = line.querySelector('.qty__value');
        value.textContent = Math.min(+line.getAttribute('data-max'), Math.max(1, +value.textContent + +step.getAttribute('data-qty')));
      }
      cartTotals();
    });
    cartTotals();
  }

  // Date/time fields open their native picker on click instead of taking typed input.
  document.addEventListener('click', function (e) {
    var field = e.target.closest('input[type="date"], input[type="time"]');
    if (field && field.showPicker) field.showPicker();
  });
})();
