/* ==========================================================================
   CheckinBliss — property.js

   DEVELOPER HANDOFF — Next.js
   ─────────────────────────────────────────────────────────────────────────
   Replace the PROPERTY object below with data from your API/CMS layer.
   In Next.js this becomes props passed from getStaticProps or
   getServerSideProps. The HTML <main data-*> attributes are rendered
   server-side; this script reads them at runtime so the booking math
   stays data-driven without a full page reload.

   Mapbox token: URL-restrict your public token in the Mapbox dashboard.
   ─────────────────────────────────────────────────────────────────────────
   ========================================================================== */

(function () {
  'use strict';

  /* ── MAPBOX ──────────────────────────────────────────────────────────────
     Public token — provided via window.__CB_MAPBOX_TOKEN__ from the host
     Next.js page (reads NEXT_PUBLIC_MAPBOX_TOKEN env var).
     URL-restrict to your domain in mapbox.com/account/tokens.
     ----------------------------------------------------------------------- */
  var MAPBOX_TOKEN = (typeof window !== 'undefined' && window.__CB_MAPBOX_TOKEN__) || '';
  var MAP_STYLE    = 'mapbox://styles/mapbox/light-v11';

  /* ── PROPERTY DATA ───────────────────────────────────────────────────────
     Single source of truth for this listing.
     In Next.js: drive this from your API response / CMS document.
     Schema mirrors the data-* attributes on <main class="prop-main">.
     ----------------------------------------------------------------------- */
  var PROPERTY = {
    id:          'lagoon-penthouse-vi',
    slug:        'the-lagoon-penthouse',
    name:        'The Lagoon Penthouse',
    location:    'Victoria Island, Lagos',
    currency:    'USD',
    nightlyRate: 450,     /* drives booking card and breakdown */
    maxGuests:   6,
    bedrooms:    3,
    bathrooms:   3,

    /* images[0] must match the listing-card thumbnail in lagos.html */
    images: [
      'assets/images/stays/lagos-lagoon-living.avif',
      'assets/images/stays/lagoon-penthouse-02.avif'
    ],

    /* Verified coordinates — update per property before going live */
    map: {
      apartment: {
        lng: 3.4219, lat: 6.4295,
        name: 'The Lagoon Penthouse',
        sub: 'Victoria Island, Lagos'
      },
      airport: {
        lng: 3.3212, lat: 6.5774,
        name: 'Murtala Muhammed International',
        sub: 'International terminal (LOS)'
      }
    },

    /* Optional extras — each carries price in USD and a display label */
    extras: {
      lateCheckout: { price: 60, label: 'Late checkout' }
    }
  };

  /* ── READ DATA ATTRIBUTES ────────────────────────────────────────────────
     <main data-nightly-rate="450" data-late-checkout-price="60" …>
     Server-rendered values win over the PROPERTY defaults above so the
     Next.js server can pass fresh pricing without re-deploying JS.
     ----------------------------------------------------------------------- */
  var propMain = document.querySelector('.prop-main');
  if (propMain) {
    if (propMain.dataset.nightlyRate)       PROPERTY.nightlyRate                  = parseInt(propMain.dataset.nightlyRate, 10);
    if (propMain.dataset.lateCheckoutPrice) PROPERTY.extras.lateCheckout.price    = parseInt(propMain.dataset.lateCheckoutPrice, 10);
    if (propMain.dataset.currency)          PROPERTY.currency                     = propMain.dataset.currency;
    if (propMain.dataset.securityDeposit)   PROPERTY.securityDeposit              = parseInt(propMain.dataset.securityDeposit, 10);
  }

  var NIGHTLY        = PROPERTY.nightlyRate;
  var LATE_CHECKOUT  = PROPERTY.extras.lateCheckout.price;
  var APARTMENT      = PROPERTY.map.apartment;
  var AIRPORT        = PROPERTY.map.airport;

  /* Sync static price labels to PROPERTY.nightlyRate so changing
     data-nightly-rate on <main> flows through without a JS rebuild. */
  var bcAmountEl   = document.querySelector('.bc-amount');
  var mbPriceEl    = document.querySelector('.mb-price strong');
  var formatted    = '$' + NIGHTLY.toLocaleString('en-US');
  if (bcAmountEl)  bcAmountEl.textContent  = formatted;
  if (mbPriceEl)   mbPriceEl.textContent   = formatted;
  var depositAmtEl = document.getElementById('bcDepositAmt');
  if (depositAmtEl) depositAmtEl.textContent = '$' + (PROPERTY.securityDeposit || 100).toLocaleString('en-US');

  /* ── MODALS ──────────────────────────────────────────────────────────────
     Focus-trapped, Escape closes, focus returns to the triggering button.
     ----------------------------------------------------------------------- */
  var lastTrigger = null;

  function openModal(modal, trigger) {
    lastTrigger = trigger || null;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var focusable = modal.querySelector('.modal-x');
    if (focusable) focusable.focus();
    document.addEventListener('keydown', onKeydown);
  }

  function closeModal(modal) {
    modal.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown);
    if (lastTrigger) { lastTrigger.focus(); lastTrigger = null; }
  }

  function onKeydown(e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal:not([hidden])').forEach(function (m) { closeModal(m); });
  }

  function wireModal(btnId, modalId) {
    var btn   = document.getElementById(btnId);
    var modal = document.getElementById(modalId);
    if (!btn || !modal) return;
    btn.addEventListener('click', function () { openModal(modal, btn); });
    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.closest('[data-close]')) closeModal(modal);
    });
  }

  wireModal('amenBtn',   'amenModal');
  wireModal('configBtn', 'configModal');

  /* Gallery button — wire to your lightbox / image carousel in Next.js */
  var galleryBtn = document.getElementById('galleryBtn');
  if (galleryBtn) {
    galleryBtn.addEventListener('click', function () {
      /* TODO: open full-screen gallery / lightbox component */
      console.log('Gallery: wire to your lightbox component. Images:', PROPERTY.images);
    });
  }

  /* ── BOOKING BREAKDOWN ───────────────────────────────────────────────────
     Recalculates on date change or when an extra is toggled.
     In Next.js: keep this calculation server-side too for the confirmation
     page; use these client values for instant feedback only.
     ----------------------------------------------------------------------- */
  var checkIn          = document.getElementById('checkIn');
  var checkOut         = document.getElementById('checkOut');
  var nightsLabel      = document.getElementById('bcNightsLabel');
  var nightsValue      = document.getElementById('bcNightsValue');
  var totalEl          = document.getElementById('bcTotal');
  var bcLateCheckoutLine  = document.getElementById('bcLateCheckoutLine');
  var bcLateCheckoutValue = document.getElementById('bcLateCheckoutValue');

  var lateCheckoutAdded = false;

  function money(n) {
    return '$' + n.toLocaleString('en-US');
  }

  function nightsBetween(a, b) {
    var d1 = new Date(a), d2 = new Date(b);
    if (isNaN(d1) || isNaN(d2)) return 0;
    var diff = Math.round((d2 - d1) / 86400000);
    return diff > 0 ? diff : 0;
  }

  function recalc() {
    var n = (checkIn && checkOut) ? nightsBetween(checkIn.value, checkOut.value) : 0;
    if (!n) return; /* no dates selected — preserve HTML initial state */

    var subtotal = NIGHTLY * n;
    var extras   = lateCheckoutAdded ? LATE_CHECKOUT : 0;
    var total    = subtotal + extras;

    if (nightsLabel)      nightsLabel.textContent      = money(NIGHTLY) + ' × ' + n + ' night' + (n === 1 ? '' : 's');
    if (nightsValue)      nightsValue.textContent      = money(subtotal);
    if (bcLateCheckoutValue && lateCheckoutAdded) bcLateCheckoutValue.textContent = money(LATE_CHECKOUT);
    if (totalEl)          totalEl.textContent          = money(total);
  }

  if (checkIn)  checkIn.addEventListener('change',  recalc);
  if (checkOut) checkOut.addEventListener('change', recalc);
  recalc();

  /* ── LATE CHECKOUT TOGGLE ────────────────────────────────────────────────
     Clicking $60 adds it to the breakdown and total; clicking again removes.
     ----------------------------------------------------------------------- */
  var lateCheckoutBtn  = document.getElementById('lateCheckoutBtn');
  var lateCheckoutNote = document.getElementById('lateCheckoutNote');

  if (lateCheckoutBtn) {
    lateCheckoutBtn.addEventListener('click', function () {
      lateCheckoutAdded = !lateCheckoutAdded;
      lateCheckoutBtn.setAttribute('aria-pressed', String(lateCheckoutAdded));
      if (bcLateCheckoutLine)  bcLateCheckoutLine.hidden  = !lateCheckoutAdded;
      if (lateCheckoutNote)    lateCheckoutNote.textContent = lateCheckoutAdded
        ? 'per stay · added'
        : 'per stay · tap to add';
      recalc();
    });
  }

  /* ── MAP ─────────────────────────────────────────────────────────────────
     Two pins: apartment + international airport.
     Brand-palette overrides match the listings map exactly.
     cooperativeGestures: true — scroll zooms only with Ctrl/Cmd held.
     ----------------------------------------------------------------------- */
  function pinEl(kind, label) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'cb-pin' + (kind === 'air' ? ' cb-pin-air' : '');
    el.setAttribute('aria-label', label);
    el.innerHTML = kind === 'air'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.2 20.5 12 15l1.8 5.5L12 22z"/><path d="M2.5 12.4 12 9.2l9.5 3.2-.5 1.8-9-1.4-9 1.4z"/><path d="M12 9.2V4.6a1.4 1.4 0 0 1 2.8 0"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.5 12 4l8.5 6.5"/><path d="M5.5 9.6V20h13V9.6"/><path d="M9.8 20v-5.4h4.4V20"/></svg>';
    return el;
  }

  function initMap() {
    var canvas   = document.getElementById('propMap');
    var fallback = document.getElementById('mapFallback');
    var ready    = window.mapboxgl && MAPBOX_TOKEN.indexOf('pk.') === 0;

    if (!canvas) return;
    if (!ready) { if (fallback) fallback.hidden = false; return; }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    var map = new mapboxgl.Map({
      container:           'propMap',
      style:               MAP_STYLE,
      center:              [(APARTMENT.lng + AIRPORT.lng) / 2, (APARTMENT.lat + AIRPORT.lat) / 2],
      zoom:                10.4,
      cooperativeGestures: true   /* Ctrl+scroll to zoom; plain scroll passes through page */
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    /* Brand-palette overrides — identical to listings.js */
    map.on('style.load', function () {
      map.getStyle().layers.forEach(function (layer) {
        var id = layer.id;
        if (layer.type === 'background') {
          map.setPaintProperty(id, 'background-color', '#E9ECE2');
        }
        if (layer.type === 'fill') {
          if (id.indexOf('water') !== -1) {
            map.setPaintProperty(id, 'fill-color', '#C0CBB4');
          } else if (id.indexOf('building') !== -1) {
            map.setPaintProperty(id, 'fill-color', '#D4D8CA');
          } else if (
            id.indexOf('park')     !== -1 ||
            id.indexOf('landuse')  !== -1 ||
            id.indexOf('grass')    !== -1 ||
            id.indexOf('wood')     !== -1 ||
            id.indexOf('scrub')    !== -1 ||
            id.indexOf('national') !== -1
          ) {
            map.setPaintProperty(id, 'fill-color', '#D8DDD0');
          }
        }
      });
    });

    /* Place pins, then fit both into view */
    [[APARTMENT, 'home'], [AIRPORT, 'air']].forEach(function (pair) {
      var p = pair[0], kind = pair[1];
      new mapboxgl.Marker({ element: pinEl(kind, p.name), anchor: 'bottom' })
        .setLngLat([p.lng, p.lat])
        .setPopup(new mapboxgl.Popup({ offset: 22 })
          .setHTML('<strong>' + p.name + '</strong><span>' + p.sub + '</span>'))
        .addTo(map);
    });

    map.on('load', function () {
      var b = new mapboxgl.LngLatBounds()
        .extend([APARTMENT.lng, APARTMENT.lat])
        .extend([AIRPORT.lng,   AIRPORT.lat]);
      map.fitBounds(b, { padding: 110, duration: 0 });
    });
  }

  initMap();

  /* ── MOBILE RESERVE BAR ──────────────────────────────────────────────────
     Slides out of view once the footer enters the viewport.
     ----------------------------------------------------------------------- */
  var mobileBook = document.getElementById('mobileBook');
  var foot       = document.querySelector('.site-footer');

  if (mobileBook && foot && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        mobileBook.style.transform = entry.isIntersecting ? 'translateY(100%)' : 'translateY(0)';
      });
    }, { rootMargin: '0px' }).observe(foot);
    mobileBook.style.transition = 'transform .25s ease';
  }

  /* ── ROUTE LINE ANIMATION ────────────────────────────────────────────────
     Injects a green fill span into each connecting leg line, then reveals
     it via IntersectionObserver as each leg scrolls into view.
     ----------------------------------------------------------------------- */
  document.querySelectorAll('.leg:not(.leg-last) .leg-line').forEach(function (line) {
    var fill = document.createElement('span');
    fill.className = 'leg-fill';
    fill.setAttribute('aria-hidden', 'true');
    line.appendChild(fill);
  });

  if ('IntersectionObserver' in window) {
    var legObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-passed');
        legObs.unobserve(entry.target);
      });
    }, { threshold: 0.35 });

    document.querySelectorAll('.leg').forEach(function (leg) { legObs.observe(leg); });
  }

})();
