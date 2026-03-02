---
layout: page
title: Travel
permalink: /travel/
description: Places I've been lucky enough to explore
nav: true
nav_order: 5
---

<style>
  .travel-page {
    --tw-bg: #0a0a0f;
    --tw-border: rgba(232, 166, 166, 0.15);
    --tw-accent: #e8a6a6;
    --tw-accent-dim: rgba(232, 166, 166, 0.5);
    --tw-accent-border: rgba(232, 166, 166, 0.2);
    --tw-accent-glow: rgba(232, 166, 166, 0.4);
    --tw-accent-faint: rgba(232, 166, 166, 0.06);
    --tw-accent-hover: rgba(232, 166, 166, 0.05);
    --tw-accent-label: rgba(232, 166, 166, 0.75);
    --tw-accent-arc: rgba(232, 166, 166, 0.3);
    --tw-text: #d4d4d4;
    --tw-text-dim: #999;
    --tw-hud-bg: rgba(10, 10, 15, 0.7);
    --tw-status: #4ade80;
    --tw-scanline: rgba(0, 0, 0, 0.03);
    --tw-tooltip-bg: rgba(10, 10, 15, 0.92);
    --tw-tooltip-shadow: rgba(0, 0, 0, 0.6);
    --tw-corner: rgba(232, 166, 166, 0.25);
  }

  html[data-theme="light"] .travel-page {
    --tw-bg: #f5efe9;
    --tw-border: rgba(160, 120, 80, 0.18);
    --tw-accent: #b87333;
    --tw-accent-dim: rgba(184, 115, 51, 0.45);
    --tw-accent-border: rgba(184, 115, 51, 0.22);
    --tw-accent-glow: rgba(184, 115, 51, 0.3);
    --tw-accent-faint: rgba(184, 115, 51, 0.08);
    --tw-accent-hover: rgba(184, 115, 51, 0.06);
    --tw-accent-label: rgba(140, 90, 40, 0.85);
    --tw-accent-arc: rgba(184, 115, 51, 0.35);
    --tw-text: #4a3f36;
    --tw-text-dim: #8a7b6f;
    --tw-hud-bg: rgba(245, 239, 233, 0.85);
    --tw-status: #389e0d;
    --tw-scanline: rgba(180, 150, 120, 0.03);
    --tw-tooltip-bg: rgba(245, 239, 233, 0.95);
    --tw-tooltip-shadow: rgba(100, 80, 60, 0.2);
    --tw-corner: rgba(184, 115, 51, 0.2);
  }

  .travel-wrapper {
    position: relative;
    background: var(--tw-bg);
    border-radius: 8px;
    overflow: hidden;
    margin: -1rem 0 2rem;
    border: 1px solid var(--tw-border);
    transition: background 0.5s ease, border-color 0.5s ease;
  }

  .travel-hud {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    pointer-events: none;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    font-family: 'Courier New', Courier, monospace;
  }

  .travel-hud-left,
  .travel-hud-right {
    background: var(--tw-hud-bg);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    padding: 8px 14px;
    border-radius: 4px;
    border: 1px solid var(--tw-accent-border);
    transition: background 0.5s ease, border-color 0.5s ease;
  }

  .travel-hud-title {
    font-size: 0.7rem;
    letter-spacing: 3px;
    color: var(--tw-accent);
    text-transform: uppercase;
    margin: 0;
    font-weight: 600;
    transition: color 0.5s ease;
  }

  .travel-hud-sub {
    font-size: 0.6rem;
    color: var(--tw-accent-dim);
    letter-spacing: 1px;
    margin: 2px 0 0;
    transition: color 0.5s ease;
  }

  .travel-hud-status {
    font-size: 0.6rem;
    color: var(--tw-status);
    letter-spacing: 2px;
    text-transform: uppercase;
    text-align: right;
    margin: 0;
    transition: color 0.5s ease;
  }

  .travel-hud-date {
    font-size: 0.6rem;
    color: var(--tw-accent-dim);
    text-align: right;
    margin: 2px 0 0;
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

  @media (max-width: 767px) {
    #globe-container {
      height: 400px;
    }
    .travel-celestial-sun { width: 40px !important; height: 40px !important; }
    .travel-celestial-moon { width: 30px !important; height: 30px !important; }
  }

  .travel-scanline {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 5;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      var(--tw-scanline) 3px,
      var(--tw-scanline) 6px
    );
    opacity: 0.4;
  }

  .travel-corners {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 6;
    pointer-events: none;
  }
  .travel-corners::before,
  .travel-corners::after {
    content: '';
    position: absolute;
    width: 30px;
    height: 30px;
    border-color: var(--tw-corner);
    border-style: solid;
    transition: border-color 0.5s ease;
  }
  .travel-corners::before {
    top: 8px; left: 8px;
    border-width: 2px 0 0 2px;
  }
  .travel-corners::after {
    top: 8px; right: 8px;
    border-width: 2px 2px 0 0;
  }
  .travel-corners-bottom {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 40px;
    z-index: 6;
    pointer-events: none;
  }
  .travel-corners-bottom::before,
  .travel-corners-bottom::after {
    content: '';
    position: absolute;
    width: 30px;
    height: 30px;
    border-color: var(--tw-corner);
    border-style: solid;
    transition: border-color 0.5s ease;
  }
  .travel-corners-bottom::before {
    bottom: 8px; left: 8px;
    border-width: 0 0 2px 2px;
  }
  .travel-corners-bottom::after {
    bottom: 8px; right: 8px;
    border-width: 0 2px 2px 0;
  }

  /* --- Celestial bodies --- */

  .travel-celestial-sun {
    position: absolute;
    top: 55px;
    left: 50%;
    margin-left: 80px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: radial-gradient(circle, #fffbe8 0%, #ffd866 30%, #faad14 65%, transparent 100%);
    box-shadow:
      0 0 25px 10px rgba(255, 216, 102, 0.55),
      0 0 55px 22px rgba(250, 173, 20, 0.28),
      0 0 100px 40px rgba(250, 173, 20, 0.12);
    z-index: 4;
    pointer-events: none;
    opacity: 0;
    transform: scale(0.5) translateY(10px);
    transition: opacity 0.6s ease, transform 0.6s ease;
    animation: sunPulse 5s ease-in-out infinite alternate;
  }

  html[data-theme="light"] .travel-celestial-sun {
    opacity: 1;
    transform: scale(1) translateY(0);
  }

  @keyframes sunPulse {
    0% { box-shadow: 0 0 25px 10px rgba(255,216,102,0.55), 0 0 55px 22px rgba(250,173,20,0.28), 0 0 100px 40px rgba(250,173,20,0.12); }
    100% { box-shadow: 0 0 30px 14px rgba(255,216,102,0.65), 0 0 65px 28px rgba(250,173,20,0.35), 0 0 110px 48px rgba(250,173,20,0.18); }
  }

  .travel-celestial-sun::before {
    content: '';
    position: absolute;
    top: -15px; left: -15px;
    right: -15px; bottom: -15px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,220,120,0.15) 0%, transparent 70%);
    animation: sunRays 4s ease-in-out infinite alternate;
  }

  @keyframes sunRays {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(1.3); opacity: 1; }
  }

  .travel-celestial-moon {
    position: absolute;
    top: 55px;
    left: 50%;
    margin-left: 80px;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: radial-gradient(circle at 60% 38%, #f0f0ec 0%, #d4d4d0 45%, #a8a8a4 90%);
    box-shadow:
      0 0 15px 5px rgba(200, 200, 220, 0.35),
      0 0 40px 15px rgba(180, 180, 210, 0.18),
      0 0 70px 28px rgba(180, 180, 210, 0.07);
    z-index: 4;
    pointer-events: none;
    opacity: 1;
    transform: scale(1) translateY(0);
    transition: opacity 0.6s ease, transform 0.6s ease;
    animation: moonGlow 6s ease-in-out infinite alternate;
  }

  html[data-theme="light"] .travel-celestial-moon {
    opacity: 0;
    transform: scale(0.5) translateY(10px);
  }

  @keyframes moonGlow {
    0% { box-shadow: 0 0 15px 5px rgba(200,200,220,0.35), 0 0 40px 15px rgba(180,180,210,0.18), 0 0 70px 28px rgba(180,180,210,0.07); }
    100% { box-shadow: 0 0 18px 7px rgba(200,200,220,0.45), 0 0 45px 18px rgba(180,180,210,0.25), 0 0 80px 32px rgba(180,180,210,0.1); }
  }

  .travel-celestial-moon::before {
    content: '';
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(160, 160, 155, 0.4);
    top: 30%;
    left: 25%;
  }
  .travel-celestial-moon::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(160, 160, 155, 0.3);
    top: 55%;
    left: 55%;
  }

  /* --- Stats & destinations --- */

  .travel-dest-panel {
    background: var(--tw-bg);
    border: 1px solid var(--tw-border);
    border-radius: 8px;
    margin-top: 1.5rem;
    overflow: hidden;
    transition: background 0.5s ease, border-color 0.5s ease;
  }

  .travel-dest-header {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.65rem;
    letter-spacing: 3px;
    color: var(--tw-accent);
    text-transform: uppercase;
    padding: 14px 20px 10px;
    border-bottom: 1px solid var(--tw-accent-faint);
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
    border-bottom: 1px solid var(--tw-accent-faint);
    transition: background 0.2s, border-color 0.5s ease;
    cursor: pointer;
    font-family: 'Courier New', Courier, monospace;
  }

  .travel-dest-item:hover {
    background: var(--tw-accent-hover);
  }

  .travel-dest-marker {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tw-accent);
    margin-right: 14px;
    flex-shrink: 0;
    box-shadow: 0 0 6px var(--tw-accent-glow);
    transition: background 0.5s ease, box-shadow 0.5s ease;
  }

  .travel-dest-name {
    font-size: 0.85rem;
    color: var(--tw-text);
    flex: 1;
    transition: color 0.5s ease;
  }

  .travel-dest-country {
    font-size: 0.7rem;
    color: var(--tw-accent-dim);
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
    background: var(--tw-bg);
    border: 1px solid var(--tw-border);
    border-radius: 8px;
    padding: 16px 20px;
    font-family: 'Courier New', Courier, monospace;
    text-align: center;
    transition: background 0.5s ease, border-color 0.5s ease;
  }

  .travel-stat-num {
    font-size: 1.6rem;
    color: var(--tw-accent);
    font-weight: 700;
    line-height: 1;
    margin-bottom: 4px;
    transition: color 0.5s ease;
  }

  .travel-stat-label {
    font-size: 0.6rem;
    color: var(--tw-accent-dim);
    letter-spacing: 2px;
    text-transform: uppercase;
    transition: color 0.5s ease;
  }

  .globe-tooltip {
    background: var(--tw-tooltip-bg) !important;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid var(--tw-accent-border) !important;
    border-radius: 6px !important;
    padding: 10px 14px !important;
    font-family: 'Courier New', Courier, monospace !important;
    color: var(--tw-text) !important;
    font-size: 0.8rem !important;
    box-shadow: 0 4px 20px var(--tw-tooltip-shadow) !important;
    pointer-events: none;
    max-width: 220px;
    line-height: 1.4;
  }
  .globe-tooltip strong {
    color: var(--tw-accent);
    font-weight: 600;
  }
  .globe-tooltip .tt-country {
    color: var(--tw-accent-dim);
    font-size: 0.65rem;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .globe-tooltip .tt-note {
    color: var(--tw-text-dim);
    font-size: 0.72rem;
    margin-top: 3px;
  }
</style>

<div class="travel-page">

<div class="travel-wrapper">
  <div class="travel-hud">
    <div class="travel-hud-left">
      <p class="travel-hud-title">Travel Log</p>
      <p class="travel-hud-sub" id="travel-count">loading...</p>
    </div>
    <div class="travel-hud-right">
      <p class="travel-hud-status">● system online</p>
      <p class="travel-hud-date" id="travel-date"></p>
    </div>
  </div>
  <div class="travel-celestial-sun"></div>
  <div class="travel-celestial-moon"></div>
  <div class="travel-scanline"></div>
  <div class="travel-corners"></div>
  <div class="travel-corners-bottom"></div>
  <div id="globe-container"></div>
</div>

<div class="travel-stats" id="travel-stats"></div>

<div class="travel-dest-panel">
  <p class="travel-dest-header">Destinations</p>
  <ul class="travel-dest-list" id="travel-dest-list"></ul>
</div>

</div>

<script src="//unpkg.com/globe.gl@2.41.4/dist/globe.gl.min.js"></script>
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
    destinations.length + ' locations · ' + countries.length + ' countries';

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

  var arcsData = [];
  for (var i = 0; i < destinations.length - 1; i++) {
    arcsData.push({
      startLat: destinations[i].lat,
      startLng: destinations[i].lng,
      endLat: destinations[i + 1].lat,
      endLng: destinations[i + 1].lng
    });
  }

  var preloadDay = new Image();
  preloadDay.src = '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
  var preloadNight = new Image();
  preloadNight.src = '//unpkg.com/three-globe/example/img/earth-night.jpg';

  function makeLightBg() {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(256, 256, 0, 256, 256, 362);
    g.addColorStop(0, '#ede4da');
    g.addColorStop(0.6, '#f0e8e0');
    g.addColorStop(1, '#f5efe9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    return c.toDataURL();
  }

  var lightBgUrl = makeLightBg();

  var themes = {
    dark: {
      globeImage: '//unpkg.com/three-globe/example/img/earth-night.jpg',
      bgImage: '//unpkg.com/three-globe/example/img/night-sky.png',
      pointColor: '#e8a6a6',
      labelColor: 'rgba(232, 166, 166, 0.75)',
      arcColor: 'rgba(232, 166, 166, 0.3)',
      atmosphereColor: '#e8a6a6',
      atmosphereAltitude: 0.2
    },
    light: {
      globeImage: '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      bgImage: lightBgUrl,
      pointColor: '#b87333',
      labelColor: 'rgba(140, 90, 40, 0.85)',
      arcColor: 'rgba(184, 115, 51, 0.35)',
      atmosphereColor: '#6bb3d9',
      atmosphereAltitude: 0.18
    }
  };

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  var currentTheme = getTheme();
  var t = themes[currentTheme] || themes.dark;

  var globe = Globe()
    .globeImageUrl(t.globeImage)
    .backgroundImageUrl(t.bgImage)
    .pointsData(destinations)
    .pointLat('lat')
    .pointLng('lng')
    .pointAltitude(0.06)
    .pointRadius(0.35)
    .pointColor(function() { return t.pointColor; })
    .pointLabel(function(d) {
      return '<div class="globe-tooltip">' +
        '<strong>' + d.name + '</strong><br>' +
        '<span class="tt-country">' + d.country + '</span>' +
        (d.note ? '<div class="tt-note">' + d.note + '</div>' : '') +
        '</div>';
    })
    .labelsData(destinations)
    .labelLat('lat')
    .labelLng('lng')
    .labelText('name')
    .labelSize(1.2)
    .labelDotRadius(0.4)
    .labelDotOrientation(function() { return 'right'; })
    .labelColor(function() { return t.labelColor; })
    .labelResolution(2)
    .labelAltitude(0.01)
    .arcsData(arcsData)
    .arcColor(function() { return [t.arcColor, t.arcColor]; })
    .arcAltitudeAutoScale(0.3)
    .arcStroke(0.4)
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcDashAnimateTime(2000)
    .atmosphereColor(t.atmosphereColor)
    .atmosphereAltitude(t.atmosphereAltitude)
    .width(containerEl.offsetWidth)
    .height(containerEl.offsetHeight)
    (containerEl);

  globe.controls().autoRotate = true;
  globe.controls().autoRotateSpeed = 0.4;
  globe.controls().enableDamping = true;
  globe.controls().dampingFactor = 0.1;

  globe.pointOfView({ lat: 30, lng: -40, altitude: 2.2 });

  function applyGlobeTheme(theme) {
    var t = themes[theme] || themes.dark;
    globe
      .globeImageUrl(t.globeImage)
      .backgroundImageUrl(t.bgImage)
      .pointColor(function() { return t.pointColor; })
      .labelColor(function() { return t.labelColor; })
      .arcColor(function() { return [t.arcColor, t.arcColor]; })
      .atmosphereColor(t.atmosphereColor)
      .atmosphereAltitude(t.atmosphereAltitude);
  }

  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.attributeName === 'data-theme') {
        var newTheme = getTheme();
        if (newTheme !== currentTheme) {
          currentTheme = newTheme;
          applyGlobeTheme(newTheme);
        }
      }
    });
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  window.addEventListener('resize', function() {
    globe.width(containerEl.offsetWidth);
    globe.height(containerEl.offsetHeight);
  });

  function flyToPoint(d) {
    globe.controls().autoRotate = false;
    globe.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 1200);
    setTimeout(function() {
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.2;
    }, 4000);
  }

  var listEl = document.getElementById('travel-dest-list');
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

  globe.onPointClick(function(point) { flyToPoint(point); });
});
</script>
