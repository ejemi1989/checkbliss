(function () {

  /* ── CONFIG — Mapbox public token injected by the host page ──
     The token is provided via window.__CB_MAPBOX_TOKEN__ from the
     Next.js server component (reads NEXT_PUBLIC_MAPBOX_TOKEN env var).
     For local dev, set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local.
     IMPORTANT: Restrict the token to your domain in mapbox.com/account/tokens. */
  var MAPBOX_TOKEN = (typeof window !== 'undefined' && window.__CB_MAPBOX_TOKEN__) || '';

  /* ── REFS ──────────────────────────────────────────*/
  var cards     = Array.from(document.querySelectorAll('.pcard'));
  var totalEl   = document.getElementById('filterTotal');
  var noResults = document.getElementById('noResults');
  var grid      = document.getElementById('listingsGrid');
  var filterBtn = document.getElementById('filterBtn');
  var filterPanel = document.getElementById('filterPanel');
  var mapToggle   = document.getElementById('mapToggle');
  var mapLabel    = document.getElementById('mapToggleLabel');
  var mapFallback = document.getElementById('mapFallback');

  var activeFilter = 'all';

  /* ── FAVOURITE BUTTONS ─────────────────────────────*/
  var heartSVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

  cards.forEach(function (card) {
    var img = card.querySelector('.pcard-img');
    if (!img) return;
    var btn = document.createElement('button');
    btn.className = 'fav-btn';
    btn.setAttribute('aria-label', 'Save to favourites');
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = heartSVG;
    img.appendChild(btn);

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!pressed));
      btn.setAttribute('aria-label', pressed ? 'Save to favourites' : 'Remove from favourites');
    });
  });

  /* ── FILTER ────────────────────────────────────────*/
  function cardVisible(card) {
    var beds = parseInt(card.dataset.beds, 10) || 0;
    var tags = card.dataset.tags || '';
    switch (activeFilter) {
      case 'all':       return true;
      case '1-2-beds':  return beds >= 1 && beds <= 2;
      case '3-4-beds':  return beds >= 3 && beds <= 4;
      case '5-plus':    return beds >= 5;
      case 'pool':      return tags.indexOf('pool') !== -1;
      case 'gym':       return tags.indexOf('gym') !== -1;
      case 'workspace': return tags.indexOf('workspace') !== -1;
      default:          return true;
    }
  }

  function applyFilter() {
    var visible = 0;
    cards.forEach(function (card) {
      var show = cardVisible(card);
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (totalEl) totalEl.textContent = visible;
    if (noResults) noResults.classList.toggle('show', visible === 0);
  }

  document.querySelectorAll('.fchip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.fchip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      applyFilter();
    });
  });

  /* ── SORT ──────────────────────────────────────────*/
  document.querySelectorAll('.schip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.schip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      var by = chip.dataset.sort;
      if (by === 'featured') return;
      var sorted = cards.slice().sort(function (a, b) {
        var pa = parseInt(a.dataset.price, 10) || 0;
        var pb = parseInt(b.dataset.price, 10) || 0;
        return by === 'price-asc' ? pa - pb : pb - pa;
      });
      sorted.forEach(function (c) {
        if (noResults) grid.insertBefore(c, noResults);
        else grid.appendChild(c);
      });
    });
  });

  /* ── FILTER PANEL TOGGLE ───────────────────────────*/
  if (filterBtn && filterPanel) {
    filterBtn.addEventListener('click', function () {
      var isOpen = filterBtn.getAttribute('aria-expanded') === 'true';
      filterBtn.setAttribute('aria-expanded', String(!isOpen));
      filterPanel.hidden = isOpen;
    });
  }

  /* ── MAP TOGGLE (mobile) ───────────────────────────*/
  if (mapToggle) {
    mapToggle.addEventListener('click', function () {
      var isOpen = mapToggle.getAttribute('aria-pressed') === 'true';
      mapToggle.setAttribute('aria-pressed', String(!isOpen));
      document.body.classList.toggle('map-open', !isOpen);
      if (mapLabel) mapLabel.textContent = isOpen ? 'Show map' : 'Hide map';
      if (map) setTimeout(function () { map.resize(); }, 50);
    });
  }

  /* ── MAPBOX ────────────────────────────────────────*/
  var map = null;

  if (!MAPBOX_TOKEN || typeof mapboxgl === 'undefined') {
    if (mapFallback) mapFallback.hidden = false;
    return;
  }

  mapboxgl.accessToken = MAPBOX_TOKEN;

  var firstCard = cards.find(function (c) { return c.dataset.lat && c.dataset.lng; });
  var center = firstCard
    ? [parseFloat(firstCard.dataset.lng), parseFloat(firstCard.dataset.lat)]
    : [3.4219, 6.4295];

  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: center,
    zoom: 12,
    attributionControl: false,
    cooperativeGestures: true
  });

  map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

  var markers = {};

  map.on('style.load', function () {

    /* ── Brand-palette overrides ─────────────────────────── */
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

    /* ── House-icon markers ───────────────────────────────── */
    var houseIcon = '<svg viewBox="0 0 20 18" width="15" height="13" fill="currentColor" aria-hidden="true"><path d="M10 1L0 9h2v8h6v-5h4v5h6V9h2z"/></svg>';

    cards.forEach(function (card) {
      var lat   = parseFloat(card.dataset.lat);
      var lng   = parseFloat(card.dataset.lng);
      var id    = card.dataset.id;
      var price = card.dataset.price;
      if (!lat || !lng || !id) return;

      var el = document.createElement('button');
      el.className = 'cb-marker';
      el.innerHTML = houseIcon;
      var titleEl = card.querySelector('.pcard-title');
      el.setAttribute('aria-label', (titleEl ? titleEl.textContent.trim() : 'Property') + ' — $' + price + ' / night');
      el.setAttribute('title', '$' + price + ' / night');

      new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map);

      markers[id] = el;

      el.addEventListener('click', function () {
        cards.forEach(function (c) { c.classList.remove('is-active'); });
        card.classList.add('is-active');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(function () { card.classList.remove('is-active'); }, 2500);
      });
    });

    cards.forEach(function (card) {
      var id = card.dataset.id;
      card.addEventListener('mouseenter', function () {
        if (markers[id]) markers[id].classList.add('is-active');
      });
      card.addEventListener('mouseleave', function () {
        if (markers[id]) markers[id].classList.remove('is-active');
      });
    });

  });

})();
