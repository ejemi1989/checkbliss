;(function () {
  'use strict';

  // ─── Business rule constants ──────────────────────────────────────────────────
  var searchEl     = document.querySelector('.search');
  var ADVANCE_DAYS = parseInt(searchEl && searchEl.dataset.advanceDays, 10) || 14;
  var MIN_NIGHTS   = parseInt(searchEl && searchEl.dataset.minNights,   10) || 2;

  // ─── State ────────────────────────────────────────────────────────────────────
  var viewYear, viewMonth;
  var startDate = null;
  var endDate   = null;
  var hoverDate = null;

  // ─── DOM refs ─────────────────────────────────────────────────────────────────
  var panel     = document.getElementById('calPanel');
  var datesBtn  = document.getElementById('datesBtn');
  var datesTxt  = document.getElementById('datesBtnText');
  var prevBtn   = document.getElementById('calPrev');
  var nextBtn   = document.getElementById('calNext');
  var monthsEl  = document.getElementById('calMonths');
  var hintEl    = document.getElementById('calHint');
  var clearBtn  = document.getElementById('calClear');
  var applyBtn  = document.getElementById('calApply');
  var closeBtn  = document.getElementById('calClose');
  var searchBtn = document.getElementById('searchBtn');

  if (!panel || !datesBtn) return;

  // ─── Select placeholder colour ────────────────────────────────────────────────
  // Shows muted colour when nothing is chosen, ink colour once a value is selected
  function syncSelectColour(sel) {
    sel.classList.toggle('has-value', !!sel.value);
  }
  ['searchDest', 'searchGuests'].forEach(function (id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.addEventListener('change', function () { syncSelectColour(sel); });
    syncSelectColour(sel); // set initial state
  });

  // ─── Date helpers ─────────────────────────────────────────────────────────────
  function today() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function minBookingDate() {
    var d = today();
    d.setDate(d.getDate() + ADVANCE_DAYS);
    return d;
  }

  function sameDay(a, b) {
    return a && b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth()    === b.getMonth()    &&
      a.getDate()     === b.getDate();
  }

  function fmtMonthYear(y, m) {
    return new Date(y, m, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  }

  function fmtShort(dt) {
    if (!dt) return '';
    return dt.toLocaleString('en-GB', { day: 'numeric', month: 'short' });
  }

  function daysInMonth(y, m)  { return new Date(y, m + 1, 0).getDate(); }

  function firstDayOfWeek(y, m) {
    return (new Date(y, m, 1).getDay() + 6) % 7; // Mon = 0
  }

  function shiftMonth(y, m, delta) {
    var d = new Date(y, m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  }

  function isoDate(d) { return d.toISOString().slice(0, 10); }

  // ─── Render (called only on month change or selection change) ─────────────────
  var DOW_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  function render() {
    monthsEl.innerHTML = '';
    // Mobile: render 6 months stacked vertically — no arrows, just scroll
    // Desktop: render 2 months side by side with prev/next arrows
    var mobile = window.innerWidth < 640;
    var count  = mobile ? 6 : 2;
    for (var i = 0; i < count; i++) {
      var nm = shiftMonth(viewYear, viewMonth, i);
      monthsEl.appendChild(buildMonth(nm.y, nm.m));
    }
    updateRangeClasses();
    updateHint();
    updateControls();
  }

  function buildMonth(y, m) {
    var wrap = document.createElement('div');
    wrap.className = 'cal-month';

    var head = document.createElement('div');
    head.className = 'cal-month-head';
    head.textContent = fmtMonthYear(y, m);
    wrap.appendChild(head);

    var dowRow = document.createElement('div');
    dowRow.className = 'cal-dow';
    DOW_LABELS.forEach(function (lbl) {
      var s = document.createElement('span');
      s.textContent = lbl;
      dowRow.appendChild(s);
    });
    wrap.appendChild(dowRow);

    var grid   = document.createElement('div');
    grid.className = 'cal-grid';

    var offset = firstDayOfWeek(y, m);
    var total  = daysInMonth(y, m);
    var min    = minBookingDate();

    for (var e = 0; e < offset; e++) {
      var empty = document.createElement('div');
      empty.className = 'cal-day cal-day--empty';
      grid.appendChild(empty);
    }

    for (var day = 1; day <= total; day++) {
      var dt   = new Date(y, m, day);
      var cell = document.createElement('div');
      cell.textContent = day;
      if (dt < min) {
        cell.className = 'cal-day cal-day--blocked';
      } else {
        cell.className     = 'cal-day';
        cell.dataset.ts    = dt.getTime().toString();
      }
      grid.appendChild(cell);
    }

    wrap.appendChild(grid);
    return wrap;
  }

  // ─── Range classes — updates CSS classes only, no DOM rebuild ─────────────────
  function updateRangeClasses() {
    var cells    = monthsEl.querySelectorAll('.cal-day[data-ts]');
    var rangeEnd = endDate || hoverDate;

    cells.forEach(function (cell) {
      var dt = new Date(parseInt(cell.dataset.ts, 10));
      cell.classList.remove('cal-day--range', 'cal-day--start', 'cal-day--end', 'cal-day--sel');

      if (startDate && rangeEnd) {
        var lo = startDate <= rangeEnd ? startDate : rangeEnd;
        var hi = startDate <= rangeEnd ? rangeEnd  : startDate;
        if (dt > lo && dt < hi) cell.classList.add('cal-day--range');
      }
      if (sameDay(dt, startDate)) cell.classList.add(endDate ? 'cal-day--start' : 'cal-day--sel');
      if (sameDay(dt, endDate))   cell.classList.add('cal-day--end');
    });
  }

  // ─── Event delegation on months container ────────────────────────────────────
  // Single listeners on the container — no per-cell listeners, no DOM rebuild on hover

  monthsEl.addEventListener('click', function (e) {
    var cell = e.target.closest && e.target.closest('.cal-day');
    if (!cell || !cell.dataset.ts) return;
    handleDayClick(new Date(parseInt(cell.dataset.ts, 10)));
  });

  monthsEl.addEventListener('mouseover', function (e) {
    if (!startDate || endDate) return;
    var cell = e.target.closest && e.target.closest('.cal-day');
    if (!cell || !cell.dataset.ts) return;
    var dt = new Date(parseInt(cell.dataset.ts, 10));
    if (sameDay(dt, hoverDate)) return; // already on this cell
    hoverDate = dt;
    updateRangeClasses();
  });

  monthsEl.addEventListener('mouseleave', function () {
    if (!startDate || endDate || !hoverDate) return;
    hoverDate = null;
    updateRangeClasses();
  });

  // ─── Day click ────────────────────────────────────────────────────────────────
  function handleDayClick(dt) {
    // Start a new selection if: nothing selected, range already complete, or clicked before start
    if (!startDate || endDate || dt < startDate) {
      startDate = dt;
      endDate   = null;
      hoverDate = null;
      render();
      return;
    }

    var nights = Math.round((dt - startDate) / 86400000);
    if (nights < MIN_NIGHTS) {
      showError('Minimum stay is ' + MIN_NIGHTS + ' nights');
      return;
    }

    endDate   = dt;
    hoverDate = null;
    render();
  }

  // ─── Hint / error ─────────────────────────────────────────────────────────────
  var errorTimer;

  function showError(msg) {
    hintEl.textContent = msg;
    hintEl.classList.add('cal-hint--error');
    clearTimeout(errorTimer);
    errorTimer = setTimeout(function () {
      hintEl.classList.remove('cal-hint--error');
      updateHint();
    }, 3000);
  }

  function updateHint() {
    if (hintEl.classList.contains('cal-hint--error')) return;
    if (!startDate) {
      hintEl.textContent = 'Select check-in date';
    } else if (!endDate) {
      hintEl.textContent = 'Select check-out (min ' + MIN_NIGHTS + ' nights)';
    } else {
      var n = Math.round((endDate - startDate) / 86400000);
      hintEl.textContent = n + ' night' + (n !== 1 ? 's' : '');
    }
  }

  function updateControls() {
    applyBtn.disabled = !(startDate && endDate);
    clearBtn.hidden   = !(startDate || endDate);
  }

  // ─── Dates button label ───────────────────────────────────────────────────────
  function updateDatesBtnLabel() {
    if (startDate && endDate) {
      datesTxt.textContent    = fmtShort(startDate) + ' – ' + fmtShort(endDate);
      datesBtn.dataset.active = 'true';
    } else {
      datesTxt.textContent = 'Add dates';
      delete datesBtn.dataset.active;
    }
  }

  // ─── Panel open / close / position ───────────────────────────────────────────
  function openPanel() {
    if (!viewYear) {
      var min   = minBookingDate();
      viewYear  = min.getFullYear();
      viewMonth = min.getMonth();
    }
    render();
    panel.hidden = false;
    positionPanel();
    datesBtn.setAttribute('aria-expanded', 'true');
    // Prevent body scroll when calendar is full-screen on mobile
    if (window.innerWidth < 640) document.body.style.overflow = 'hidden';
  }

  function closePanel() {
    panel.hidden = true;
    datesBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function positionPanel() {
    if (window.innerWidth < 640) return; // full-screen on mobile — CSS handles it

    var trigger = datesBtn.closest('.field') || datesBtn;
    var rect    = trigger.getBoundingClientRect();
    var vw      = window.innerWidth;
    var vh      = window.innerHeight;

    var pw = panel.offsetWidth  || 648;
    var ph = panel.offsetHeight || 340;

    var top  = rect.bottom + 8;
    var left = rect.left;

    if (left + pw > vw - 12) left = vw - pw - 12;
    if (left < 12) left = 12;
    if (top + ph > vh - 12) top = rect.top - ph - 8;
    if (top < 12) top = 12;

    panel.style.top  = top  + 'px';
    panel.style.left = left + 'px';
  }

  // ─── Event listeners ──────────────────────────────────────────────────────────
  datesBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    panel.hidden ? openPanel() : closePanel();
  });

  prevBtn.addEventListener('click', function () {
    var nm  = shiftMonth(viewYear, viewMonth, -1);
    var min = minBookingDate();
    if (new Date(nm.y, nm.m, 1) < new Date(min.getFullYear(), min.getMonth(), 1)) return;
    viewYear  = nm.y;
    viewMonth = nm.m;
    render();
  });

  nextBtn.addEventListener('click', function () {
    var nm    = shiftMonth(viewYear, viewMonth, 1);
    viewYear  = nm.y;
    viewMonth = nm.m;
    render();
  });

  clearBtn.addEventListener('click', function () {
    startDate = null;
    endDate   = null;
    hoverDate = null;
    render();
    updateDatesBtnLabel();
  });

  applyBtn.addEventListener('click', function () {
    updateDatesBtnLabel();
    closePanel();
  });

  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  // Close on outside click (desktop)
  document.addEventListener('click', function (e) {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== datesBtn) {
      closePanel();
    }
  });

  // Escape key
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && !panel.hidden) closePanel();
  });

  // Reposition on scroll / resize (desktop only)
  window.addEventListener('scroll', function () {
    if (!panel.hidden && window.innerWidth >= 640) positionPanel();
  }, { passive: true });

  window.addEventListener('resize', function () {
    if (!panel.hidden) { render(); positionPanel(); }
  });

  // ─── Search ───────────────────────────────────────────────────────────────────
  if (searchBtn) searchBtn.addEventListener('click', handleSearch);

  function handleSearch() {
    /*
     * ── Developer handoff ──────────────────────────────────────────────────────
     *
     *  Variables at search time:
     *    dest      {string}  "lagos" | "abuja" | "" (empty = not selected)
     *    checkIn   {Date}    startDate — midnight local time, or null
     *    checkOut  {Date}    endDate   — midnight local time, or null
     *    nights    {number}  nights between check-in and check-out, or 0
     *    guests    {string}  "1"–"6" or "" (empty = not selected)
     *
     *  Routing pattern:
     *    var url = dest + '.html?in=' + isoDate(checkIn) + '&out=' + isoDate(checkOut);
     *    if (guests) url += '&guests=' + guests;
     *    window.location.href = url;
     *
     *  Constants:
     *    ADVANCE_DAYS  {number}  14 — minimum days ahead bookings are accepted
     *    MIN_NIGHTS    {number}  2  — minimum nights per stay
     *
     * ──────────────────────────────────────────────────────────────────────────
     */

    var destEl   = document.getElementById('searchDest');
    var guestsEl = document.getElementById('searchGuests');
    var dest     = destEl   ? destEl.value   : '';
    var guests   = guestsEl ? guestsEl.value : '';
    var checkIn  = startDate;
    var checkOut = endDate;
    var nights   = (checkIn && checkOut) ? Math.round((checkOut - checkIn) / 86400000) : 0;

    if (!dest)             { if (destEl)  destEl.focus();  return; }
    if (!checkIn || !checkOut) { openPanel(); return; }

    var url = dest + '.html?in=' + isoDate(checkIn) + '&out=' + isoDate(checkOut);
    if (guests) url += '&guests=' + guests;
    window.location.href = url;
  }

}());
