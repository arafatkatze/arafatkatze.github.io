---
layout: page
title: Travel
permalink: /travel/
description: Places I've been lucky enough to explore
nav: true
nav_order: 5
---

<style>
  .travel-wrapper {
    position: relative;
    background: #0a0a0f;
    border-radius: 8px;
    overflow: hidden;
    margin: -1rem 0 2rem;
    border: 1px solid rgba(232, 166, 166, 0.15);
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
    background: rgba(10, 10, 15, 0.7);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    padding: 8px 14px;
    border-radius: 4px;
    border: 1px solid rgba(232, 166, 166, 0.2);
  }

  .travel-hud-title {
    font-size: 0.7rem;
    letter-spacing: 3px;
    color: #e8a6a6;
    text-transform: uppercase;
    margin: 0;
    font-weight: 600;
  }

  .travel-hud-sub {
    font-size: 0.6rem;
    color: rgba(232, 166, 166, 0.5);
    letter-spacing: 1px;
    margin: 2px 0 0;
  }

  .travel-hud-status {
    font-size: 0.6rem;
    color: #4ade80;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-align: right;
    margin: 0;
  }

  .travel-hud-date {
    font-size: 0.6rem;
    color: rgba(232, 166, 166, 0.4);
    text-align: right;
    margin: 2px 0 0;
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
      rgba(0, 0, 0, 0.03) 3px,
      rgba(0, 0, 0, 0.03) 6px
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
    border-color: rgba(232, 166, 166, 0.25);
    border-style: solid;
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
    border-color: rgba(232, 166, 166, 0.25);
    border-style: solid;
  }
  .travel-corners-bottom::before {
    bottom: 8px; left: 8px;
    border-width: 0 0 2px 2px;
  }
  .travel-corners-bottom::after {
    bottom: 8px; right: 8px;
    border-width: 0 2px 2px 0;
  }

  .travel-dest-panel {
    background: #0a0a0f;
    border: 1px solid rgba(232, 166, 166, 0.15);
    border-radius: 8px;
    margin-top: 1.5rem;
    overflow: hidden;
  }

  .travel-dest-header {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.65rem;
    letter-spacing: 3px;
    color: #e8a6a6;
    text-transform: uppercase;
    padding: 14px 20px 10px;
    border-bottom: 1px solid rgba(232, 166, 166, 0.1);
    margin: 0;
    font-weight: 600;
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
    border-bottom: 1px solid rgba(232, 166, 166, 0.06);
    transition: background 0.2s;
    cursor: pointer;
    font-family: 'Courier New', Courier, monospace;
  }

  .travel-dest-item:hover {
    background: rgba(232, 166, 166, 0.05);
  }

  .travel-dest-marker {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #e8a6a6;
    margin-right: 14px;
    flex-shrink: 0;
    box-shadow: 0 0 6px rgba(232, 166, 166, 0.4);
  }

  .travel-dest-name {
    font-size: 0.85rem;
    color: #d4d4d4;
    flex: 1;
  }

  .travel-dest-country {
    font-size: 0.7rem;
    color: rgba(232, 166, 166, 0.5);
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .travel-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin-top: 1.5rem;
  }

  .travel-stat-card {
    background: #0a0a0f;
    border: 1px solid rgba(232, 166, 166, 0.15);
    border-radius: 8px;
    padding: 16px 20px;
    font-family: 'Courier New', Courier, monospace;
    text-align: center;
  }

  .travel-stat-num {
    font-size: 1.6rem;
    color: #e8a6a6;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 4px;
  }

  .travel-stat-label {
    font-size: 0.6rem;
    color: rgba(232, 166, 166, 0.45);
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .globe-tooltip {
    background: rgba(10, 10, 15, 0.92) !important;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(232, 166, 166, 0.3) !important;
    border-radius: 6px !important;
    padding: 10px 14px !important;
    font-family: 'Courier New', Courier, monospace !important;
    color: #d4d4d4 !important;
    font-size: 0.8rem !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6) !important;
    pointer-events: none;
    max-width: 220px;
    line-height: 1.4;
  }
  .globe-tooltip strong {
    color: #e8a6a6;
    font-weight: 600;
  }
  .globe-tooltip .tt-country {
    color: rgba(232, 166, 166, 0.5);
    font-size: 0.65rem;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .globe-tooltip .tt-note {
    color: #999;
    font-size: 0.72rem;
    margin-top: 3px;
  }

</style>

*The globe takes a few seconds to load.*

I travel full-time with just a carry-on. 30+ countries, one 18kg suitcase. If you're curious how I fit my entire life into a single bag, [try packing it yourself](/pack/).

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

  var globe = Globe()
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
    .pointsData(destinations)
    .pointLat('lat')
    .pointLng('lng')
    .pointAltitude(0.06)
    .pointRadius(0.35)
    .pointColor(function() { return '#e8a6a6'; })
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
    .labelColor(function() { return 'rgba(232, 166, 166, 0.75)'; })
    .labelResolution(2)
    .labelAltitude(0.01)
    .arcsData(arcsData)
    .arcColor(function() { return ['rgba(232, 166, 166, 0.3)', 'rgba(232, 166, 166, 0.3)']; })
    .arcAltitudeAutoScale(0.3)
    .arcStroke(0.4)
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcDashAnimateTime(2000)
    .atmosphereColor('#e8a6a6')
    .atmosphereAltitude(0.2)
    .width(containerEl.offsetWidth)
    .height(containerEl.offsetHeight)
    (containerEl);

  globe.controls().autoRotate = true;
  globe.controls().autoRotateSpeed = 0.4;
  globe.controls().enableDamping = true;
  globe.controls().dampingFactor = 0.1;

  globe.pointOfView({ lat: 30, lng: -40, altitude: 2.2 });

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
