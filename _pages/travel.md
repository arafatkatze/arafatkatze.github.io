---
layout: page
title: Travel
permalink: /travel/
description: Places I've been lucky enough to explore
nav: true
nav_order: 6
---

<style>
  .travel-page {
    --tw-card-bg: #0a0a0f;
    --tw-card-border: rgba(232, 166, 166, 0.15);
    --tw-card-accent: #e8a6a6;
    --tw-card-accent-dim: rgba(232, 166, 166, 0.5);
    --tw-card-accent-faint: rgba(232, 166, 166, 0.06);
    --tw-card-accent-hover: rgba(232, 166, 166, 0.05);
    --tw-card-accent-glow: rgba(232, 166, 166, 0.4);
    --tw-card-text: #d4d4d4;
    --tw-globe-bg: #111116;
    --tw-globe-surface: #1a1a22;
    --tw-globe-land: rgba(232, 166, 166, 0.55);
    --tw-globe-grid: rgba(232, 166, 166, 0.12);
    --tw-globe-hint: rgba(232, 166, 166, 0.45);
  }

  html[data-theme="light"] .travel-page {
    --tw-card-bg: #ffffff;
    --tw-card-border: rgba(0, 0, 0, 0.1);
    --tw-card-accent: #b87333;
    --tw-card-accent-dim: rgba(184, 115, 51, 0.45);
    --tw-card-accent-faint: rgba(184, 115, 51, 0.08);
    --tw-card-accent-hover: rgba(184, 115, 51, 0.06);
    --tw-card-accent-glow: rgba(184, 115, 51, 0.3);
    --tw-card-text: #3a3a3a;
    --tw-globe-bg: #f4f4f1;
    --tw-globe-surface: #ffffff;
    --tw-globe-land: rgba(30, 30, 30, 0.85);
    --tw-globe-grid: rgba(0, 0, 0, 0.12);
    --tw-globe-hint: rgba(0, 0, 0, 0.4);
  }

  .travel-wrapper {
    position: relative;
    background: var(--tw-globe-bg);
    border-radius: 8px;
    overflow: hidden;
    margin: -1rem 0 2rem;
    border: 1px solid var(--tw-card-border);
    transition: background 0.5s ease, border-color 0.5s ease;
  }

  .travel-hud {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    pointer-events: none;
    padding: 18px 22px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .travel-hud-left,
  .travel-hud-right {
    background: transparent;
    padding: 0;
    border: none;
  }

  .travel-hud-title {
    font-family: Georgia, 'Times New Roman', Times, serif;
    font-size: 1.35rem;
    letter-spacing: 0;
    color: var(--tw-card-text);
    text-transform: none;
    margin: 0;
    font-weight: 600;
    transition: color 0.5s ease;
  }

  .travel-hud-sub {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.65rem;
    color: var(--tw-card-accent-dim);
    letter-spacing: 0.5px;
    margin: 4px 0 0;
    transition: color 0.5s ease;
  }

  .travel-hud-status {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.65rem;
    color: var(--tw-card-accent);
    letter-spacing: 1px;
    text-align: right;
    margin: 0;
    transition: color 0.5s ease;
  }

  .travel-hud-date {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.6rem;
    color: var(--tw-card-accent-dim);
    text-align: right;
    margin: 4px 0 0;
    transition: color 0.5s ease;
  }

  #globe-container {
    width: 100%;
    height: 560px;
    cursor: grab;
  }
  #globe-container:active {
    cursor: grabbing;
  }
  #globe-container canvas {
    outline: none;
  }

  .travel-globe-hint {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 16px;
    z-index: 10;
    text-align: center;
    pointer-events: none;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.7rem;
    letter-spacing: 0.5px;
    color: var(--tw-globe-hint);
    transition: color 0.5s ease, opacity 0.4s ease;
  }

  .travel-globe-hint.is-hidden {
    opacity: 0;
  }

  @media (max-width: 767px) {
    #globe-container {
      height: 400px;
    }
    .travel-hud-title {
      font-size: 1.1rem;
    }
  }

  /* --- Stats & destinations (theme-responsive) --- */

  .travel-dest-panel {
    background: var(--tw-card-bg);
    border: 1px solid var(--tw-card-border);
    border-radius: 8px;
    margin-top: 1.5rem;
    overflow: hidden;
    transition: background 0.5s ease, border-color 0.5s ease;
  }

  .travel-dest-header {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.65rem;
    letter-spacing: 3px;
    color: var(--tw-card-accent);
    text-transform: uppercase;
    padding: 14px 20px 10px;
    border-bottom: 1px solid var(--tw-card-accent-faint);
    margin: 0;
    font-weight: 600;
    transition: color 0.5s ease, border-color 0.5s ease;
  }

  .travel-dest-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .travel-dest-item {
    display: flex;
    align-items: center;
    padding: 12px 20px;
    border-bottom: 1px solid var(--tw-card-accent-faint);
    transition: background 0.2s;
    cursor: pointer;
    font-family: 'Courier New', Courier, monospace;
  }

  .travel-dest-item:hover {
    background: var(--tw-card-accent-hover);
  }

  .travel-dest-marker {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tw-card-accent);
    margin-right: 14px;
    flex-shrink: 0;
    box-shadow: 0 0 6px var(--tw-card-accent-glow);
    transition: background 0.5s ease, box-shadow 0.5s ease;
  }

  .travel-dest-name {
    font-size: 0.85rem;
    color: var(--tw-card-text);
    flex: 1;
    transition: color 0.5s ease;
  }

  .travel-dest-country {
    font-size: 0.7rem;
    color: var(--tw-card-accent-dim);
    letter-spacing: 1px;
    text-transform: uppercase;
    transition: color 0.5s ease;
  }

  .travel-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin-top: 1.5rem;
  }

  .travel-stat-card {
    background: var(--tw-card-bg);
    border: 1px solid var(--tw-card-border);
    border-radius: 8px;
    padding: 16px 20px;
    font-family: 'Courier New', Courier, monospace;
    text-align: center;
    transition: background 0.5s ease, border-color 0.5s ease;
  }

  .travel-stat-num {
    font-size: 1.6rem;
    color: var(--tw-card-accent);
    font-weight: 700;
    line-height: 1;
    margin-bottom: 4px;
    transition: color 0.5s ease;
  }

  .travel-stat-label {
    font-size: 0.6rem;
    color: var(--tw-card-accent-dim);
    letter-spacing: 2px;
    text-transform: uppercase;
    transition: color 0.5s ease;
  }

  .globe-tooltip {
    background: rgba(255, 255, 255, 0.95) !important;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(0, 0, 0, 0.12) !important;
    border-radius: 4px !important;
    padding: 8px 12px !important;
    font-family: Georgia, 'Times New Roman', Times, serif !important;
    color: #222 !important;
    font-size: 0.85rem !important;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12) !important;
    pointer-events: none;
    max-width: 220px;
    line-height: 1.35;
  }
  html[data-theme="dark"] .globe-tooltip,
  html:not([data-theme="light"]) .globe-tooltip {
    background: rgba(20, 20, 28, 0.94) !important;
    border: 1px solid rgba(232, 166, 166, 0.25) !important;
    color: #e8e8e8 !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
  }
  .globe-tooltip strong {
    color: inherit;
    font-weight: 600;
  }
  .globe-tooltip .tt-country {
    font-family: 'Courier New', Courier, monospace;
    color: rgba(0, 0, 0, 0.45);
    font-size: 0.65rem;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  html[data-theme="dark"] .globe-tooltip .tt-country,
  html:not([data-theme="light"]) .globe-tooltip .tt-country {
    color: rgba(232, 166, 166, 0.55);
  }
  .globe-tooltip .tt-note {
    color: #777;
    font-size: 0.72rem;
    margin-top: 3px;
  }

</style>

*Drag the globe to spin it — click a destination to fly there.*

I [used to travel](https://arafatkatze.github.io/philosophy/2026/01/05/travelling.html) full-time with just a carry-on. 30+ countries, one 18kg suitcase. If you're curious how I fit my entire life into a single bag, [try packing it yourself](/pack/).

<div class="travel-page">

<div class="travel-wrapper">
  <div class="travel-hud">
    <div class="travel-hud-left">
      <p class="travel-hud-title">Travel Log</p>
      <p class="travel-hud-sub" id="travel-count">loading...</p>
    </div>
    <div class="travel-hud-right">
      <p class="travel-hud-status" id="travel-status">loading map…</p>
      <p class="travel-hud-date" id="travel-date"></p>
    </div>
  </div>
  <div id="globe-container"></div>
  <p class="travel-globe-hint" id="travel-globe-hint">drag the globe to spin it</p>
</div>

<div class="travel-stats" id="travel-stats"></div>

<div class="travel-dest-panel">
  <p class="travel-dest-header">Destinations</p>
  <ul class="travel-dest-list" id="travel-dest-list"></ul>
</div>

</div>

<script src="//unpkg.com/globe.gl@2.41.4/dist/globe.gl.min.js"></script>
<script src="//unpkg.com/topojson-client@3/dist/topojson-client.min.js"></script>
<script>
document.addEventListener("DOMContentLoaded", function () {
  var destinations = [
    { name: "Hong Kong", country: "Hong Kong", lat: 22.3193, lng: 114.1694 },
    { name: "Zurich", country: "Switzerland", lat: 47.3769, lng: 8.5417 },
    { name: "Geneva", country: "Switzerland", lat: 46.2044, lng: 6.1432 },
    { name: "Udaipur", country: "India", lat: 24.5854, lng: 73.7125 },
    { name: "Delhi", country: "India", lat: 28.6139, lng: 77.2090 },
    { name: "Kharagpur", country: "India", lat: 22.3460, lng: 87.2320 },
    { name: "Calgary", country: "Canada", lat: 51.0447, lng: -114.0719 },
    { name: "Montreal", country: "Canada", lat: 45.5017, lng: -73.5673 },
    { name: "Mont-Tremblant", country: "Canada", lat: 46.2088, lng: -74.5844 },
    { name: "Ottawa", country: "Canada", lat: 45.4215, lng: -75.6972 },
    { name: "Vancouver", country: "Canada", lat: 49.2827, lng: -123.1207 },
    { name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832 },
    { name: "Antigua Guatemala", country: "Guatemala", lat: 14.5586, lng: -90.7295 },
    { name: "Sao Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333 },
    { name: "La Libertad", country: "El Salvador", lat: 13.4884, lng: -89.3222 },
    { name: "Amsterdam", country: "Netherlands", lat: 52.3676, lng: 4.9041 },
    { name: "Brussels", country: "Belgium", lat: 50.8503, lng: 4.3517 },
    { name: "Bruges", country: "Belgium", lat: 51.2093, lng: 3.2247 },
    { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
    { name: "Annecy", country: "France", lat: 45.8992, lng: 6.1294 },
    { name: "Munich", country: "Germany", lat: 48.1351, lng: 11.5820 },
    { name: "Berlin", country: "Germany", lat: 52.5200, lng: 13.4050 },
    { name: "Oslo", country: "Norway", lat: 59.9139, lng: 10.7522 },
    { name: "Sofia", country: "Bulgaria", lat: 42.6977, lng: 23.3219 },
    { name: "Botevgrad", country: "Bulgaria", lat: 42.9079, lng: 23.7926 },
    { name: "Tirana", country: "Albania", lat: 41.3275, lng: 19.8187 },
    { name: "Kyiv", country: "Ukraine", lat: 50.4501, lng: 30.5234 },
    { name: "Krakow", country: "Poland", lat: 50.0647, lng: 19.9450 },
    { name: "Minsk", country: "Belarus", lat: 53.9006, lng: 27.5590 },
    { name: "Vietnam", country: "Vietnam", lat: 21.0285, lng: 105.8542 },
    { name: "Tbilisi", country: "Georgia", lat: 41.7151, lng: 44.8271 },
    { name: "Belgrade", country: "Serbia", lat: 44.7866, lng: 20.4489 },
    { name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964 },
    { name: "Vienna", country: "Austria", lat: 48.2082, lng: 16.3738 },
    { name: "Prague", country: "Czech Republic", lat: 50.0755, lng: 14.4378 },
    { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
    { name: "Doha", country: "Qatar", lat: 25.2854, lng: 51.5310 },
    { name: "San Francisco", country: "USA", lat: 37.7749, lng: -122.4194 },
    { name: "San Jose", country: "Costa Rica", lat: 9.9281, lng: -84.0907 },
    { name: "Florianopolis", country: "Brazil", lat: -27.5954, lng: -48.5480 },
    { name: "Recife", country: "Brazil", lat: -8.0476, lng: -34.8770 },
    { name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lng: -43.1729 },
    { name: "London", country: "UK", lat: 51.5074, lng: -0.1278 },
    { name: "Vatican City", country: "Vatican City", lat: 41.9029, lng: 12.4534 },
    { name: "Florence", country: "Italy", lat: 43.7696, lng: 11.2558 },
    { name: "Istanbul", country: "Turkey", lat: 41.0082, lng: 28.9784 },
    { name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708 }
  ];

  var today = new Date();
  var dateStr = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
  document.getElementById('travel-date').textContent = dateStr;

  var countries = [];
  destinations.forEach(function(d) {
    if (countries.indexOf(d.country) === -1) countries.push(d.country);
  });
  document.getElementById('travel-count').textContent =
    destinations.length + ' locations · ' + countries.length + ' countries · spin to explore';

  var continents = { "North America": 0, "South America": 0, "Europe": 0, "Asia": 0 };
  var continentMap = {
    "Canada": "North America", "Guatemala": "North America", "El Salvador": "North America",
    "Brazil": "South America",
    "Switzerland": "Europe", "Netherlands": "Europe", "Belgium": "Europe",
    "France": "Europe", "Germany": "Europe", "Norway": "Europe",
    "Bulgaria": "Europe", "Albania": "Europe", "Ukraine": "Europe",
    "Poland": "Europe", "Belarus": "Europe", "Georgia": "Europe",
    "Serbia": "Europe", "Italy": "Europe", "Austria": "Europe", "Czech Republic": "Europe",
    "USA": "North America", "Costa Rica": "North America",
    "UK": "Europe", "Vatican City": "Europe", "Turkey": "Europe",
    "Hong Kong": "Asia", "India": "Asia", "Vietnam": "Asia",
    "Japan": "Asia", "Qatar": "Asia", "UAE": "Asia"
  };
  destinations.forEach(function(d) {
    var c = continentMap[d.country];
    if (c) continents[c]++;
  });

  var statsEl = document.getElementById('travel-stats');
  statsEl.innerHTML =
    '<div class="travel-stat-card"><div class="travel-stat-num">' + destinations.length +
    '</div><div class="travel-stat-label">Locations</div></div>' +
    '<div class="travel-stat-card"><div class="travel-stat-num">' + countries.length +
    '</div><div class="travel-stat-label">Countries</div></div>' +
    '<div class="travel-stat-card"><div class="travel-stat-num">' + Object.keys(continents).length +
    '</div><div class="travel-stat-label">Continents</div></div>';

  var containerEl = document.getElementById('globe-container');
  var hintEl = document.getElementById('travel-globe-hint');
  var statusEl = document.getElementById('travel-status');

  var arcsData = [];
  for (var i = 0; i < destinations.length - 1; i++) {
    arcsData.push({
      startLat: destinations[i].lat,
      startLng: destinations[i].lng,
      endLat: destinations[i + 1].lat,
      endLng: destinations[i + 1].lng
    });
  }

  // Build destination list first so the page stays useful even if WebGL fails
  var listEl = document.getElementById('travel-dest-list');
  var globe = null;

  function hideHint() {
    if (hintEl) hintEl.classList.add('is-hidden');
  }

  function flyToPoint(d) {
    hideHint();
    if (!globe) return;
    globe.controls().autoRotate = false;
    globe.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.45 }, 1100);
    setTimeout(function() {
      if (!globe) return;
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.2;
    }, 4000);
  }

  destinations.forEach(function(d) {
    var li = document.createElement('li');
    li.className = 'travel-dest-item';
    li.innerHTML =
      '<span class="travel-dest-marker"></span>' +
      '<span class="travel-dest-name">' + d.name + '</span>' +
      '<span class="travel-dest-country">' + d.country + '</span>';
    li.addEventListener('click', function() { flyToPoint(d); });
    listEl.appendChild(li);
  });

  // Graticule as arrays of [lng, lat] (GeoJSON order)
  function createGraticule(stepDeg) {
    var step = stepDeg || 20;
    var paths = [];
    var lat, lng, coords;

    for (lng = -180; lng <= 180; lng += step) {
      coords = [];
      for (lat = -90; lat <= 90; lat += 5) coords.push([lng, lat]);
      paths.push(coords);
    }
    for (lat = -80; lat <= 80; lat += step) {
      coords = [];
      for (lng = -180; lng <= 180; lng += 5) coords.push([lng, lat]);
      paths.push(coords);
    }
    return paths;
  }

  function solidTexture(hex) {
    var c = document.createElement('canvas');
    c.width = 8;
    c.height = 8;
    var ctx = c.getContext('2d');
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, 8, 8);
    return c.toDataURL('image/png');
  }

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function themeColors(theme) {
    if (theme === 'light') {
      return {
        background: '#f3f3f0',
        surface: '#fafafa',
        landStroke: 'rgba(15, 15, 15, 0.92)',
        landFill: 'rgba(0, 0, 0, 0.025)',
        grid: 'rgba(0, 0, 0, 0.16)',
        point: '#d35400',
        arc: ['rgba(180, 90, 40, 0.4)', 'rgba(180, 90, 40, 0.12)'],
        atmosphere: '#bdbdbd'
      };
    }
    return {
      background: '#0e0e14',
      surface: '#18181f',
      landStroke: 'rgba(232, 166, 166, 0.85)',
      landFill: 'rgba(232, 166, 166, 0.06)',
      grid: 'rgba(232, 166, 166, 0.18)',
      point: '#e8a6a6',
      arc: ['rgba(232, 166, 166, 0.4)', 'rgba(232, 166, 166, 0.12)'],
      atmosphere: '#4a353c'
    };
  }

  var currentTheme = getTheme();
  var t = themeColors(currentTheme);
  var landFeatures = null;
  var graticule = createGraticule(20);

  try {
    globe = new Globe(containerEl)
      .globeImageUrl(solidTexture(t.surface))
      .backgroundColor(t.background)
      .showGlobe(true)
      .showAtmosphere(true)
      .atmosphereColor(t.atmosphere)
      .atmosphereAltitude(0.08)
      .pointsData(destinations)
      .pointLat('lat')
      .pointLng('lng')
      .pointAltitude(0.015)
      .pointRadius(0.32)
      .pointColor(function() { return t.point; })
      .pointLabel(function(d) {
        return '<div class="globe-tooltip">' +
          '<strong>' + d.name + '</strong><br>' +
          '<span class="tt-country">' + d.country + '</span>' +
          (d.note ? '<div class="tt-note">' + d.note + '</div>' : '') +
          '</div>';
      })
      .arcsData(arcsData)
      .arcColor(function() { return t.arc; })
      .arcAltitudeAutoScale(0.22)
      .arcStroke(0.3)
      .arcDashLength(0.45)
      .arcDashGap(0.3)
      .arcDashAnimateTime(3000)
      .pathPointLng(function(p) { return p[0]; })
      .pathPointLat(function(p) { return p[1]; })
      .pathPointAlt(function() { return 0; })
      .pathColor(function() { return t.grid; })
      .pathStroke(0.45)
      .pathAltitude(0.001)
      .pathsData(graticule)
      .width(containerEl.offsetWidth)
      .height(containerEl.offsetHeight);

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.35;
    globe.controls().enableDamping = true;
    globe.controls().dampingFactor = 0.08;
    globe.pointOfView({ lat: 20, lng: 20, altitude: 2.0 });
    globe.onPointClick(function(point) { flyToPoint(point); });
    containerEl.addEventListener('pointerdown', hideHint);
    statusEl.textContent = destinations.length + ' pins';
  } catch (err) {
    console.error('Travel globe failed to initialize', err);
    statusEl.textContent = 'globe unavailable';
  }

  function applyTheme(theme) {
    if (!globe) return;
    t = themeColors(theme);
    try {
      globe
        .globeImageUrl(solidTexture(t.surface))
        .backgroundColor(t.background)
        .atmosphereColor(t.atmosphere)
        .pointColor(function() { return t.point; })
        .arcColor(function() { return t.arc; })
        .pathColor(function() { return t.grid; });

      if (landFeatures) {
        globe
          .polygonCapColor(function() { return t.landFill; })
          .polygonSideColor(function() { return 'rgba(0,0,0,0)'; })
          .polygonStrokeColor(function() { return t.landStroke; });
      }
    } catch (err) {
      console.warn('Travel globe theme update failed', err);
    }
  }

  if (globe && typeof topojson !== 'undefined') {
    fetch('//cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')
      .then(function(res) { return res.json(); })
      .then(function(world) {
        var land = topojson.feature(world, world.objects.land);
        landFeatures = land.type === 'FeatureCollection' ? land.features : [land];
        globe
          .polygonsData(landFeatures)
          .polygonCapColor(function() { return t.landFill; })
          .polygonSideColor(function() { return 'rgba(0,0,0,0)'; })
          .polygonStrokeColor(function() { return t.landStroke; })
          .polygonAltitude(0.006)
          .polygonStrokeWidth(0.4)
          .polygonsTransitionDuration(0);
      })
      .catch(function(err) {
        console.warn('Land outlines failed to load', err);
      });
  }

  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.attributeName === 'data-theme') {
        var newTheme = getTheme();
        if (newTheme !== currentTheme) {
          currentTheme = newTheme;
          applyTheme(newTheme);
        }
      }
    });
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  window.addEventListener('resize', function() {
    if (!globe) return;
    globe.width(containerEl.offsetWidth);
    globe.height(containerEl.offsetHeight);
  });
});
</script>
