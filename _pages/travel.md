---
layout: page
title: Travel
permalink: /travel/
description: Places I've been lucky enough to explore
nav: true
nav_order: 5
map: true
---

<style>
  .travel-wrapper {
    position: relative;
    background: #0d0d0d;
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
    z-index: 1000;
    pointer-events: none;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    font-family: 'Courier New', Courier, monospace;
  }

  .travel-hud-left,
  .travel-hud-right {
    background: rgba(13, 13, 13, 0.75);
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

  #travel-map {
    width: 100%;
    height: 500px;
    background: #0d0d0d;
    z-index: 1;
  }

  @media (min-width: 768px) {
    #travel-map {
      height: 520px;
    }
  }

  .travel-scanline {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.04) 2px,
      rgba(0, 0, 0, 0.04) 4px
    );
    opacity: 0.5;
  }

  .travel-corners {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 998;
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
    z-index: 998;
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
    background: #0d0d0d;
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
    background: #0d0d0d;
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

  .leaflet-tile-pane {
    filter: saturate(0.3) brightness(0.6);
  }

  .travel-pulse-marker {
    width: 14px;
    height: 14px;
    background: #e8a6a6;
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(232, 166, 166, 0.7), 0 0 20px rgba(232, 166, 166, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.5);
    animation: travel-pulse 2s ease-in-out infinite;
    cursor: pointer;
  }

  @keyframes travel-pulse {
    0%, 100% { box-shadow: 0 0 10px rgba(232, 166, 166, 0.7), 0 0 20px rgba(232, 166, 166, 0.3); }
    50% { box-shadow: 0 0 14px rgba(232, 166, 166, 0.9), 0 0 28px rgba(232, 166, 166, 0.5); }
  }

  .travel-popup .leaflet-popup-content-wrapper {
    background: rgba(13, 13, 13, 0.92);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(232, 166, 166, 0.25);
    border-radius: 6px;
    color: #d4d4d4;
    font-family: 'Courier New', Courier, monospace;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }
  .travel-popup .leaflet-popup-content {
    margin: 10px 14px;
    font-size: 0.8rem;
    line-height: 1.4;
  }
  .travel-popup .leaflet-popup-content strong {
    color: #e8a6a6;
    font-weight: 600;
  }
  .travel-popup .leaflet-popup-tip {
    background: rgba(13, 13, 13, 0.92);
    border: 1px solid rgba(232, 166, 166, 0.25);
    border-top: none;
    border-left: none;
  }
  .travel-popup .leaflet-popup-close-button {
    color: rgba(232, 166, 166, 0.6);
  }
  .travel-popup .leaflet-popup-close-button:hover {
    color: #e8a6a6;
  }
</style>

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
  <div id="travel-map"></div>
</div>

<div class="travel-stats" id="travel-stats"></div>

<div class="travel-dest-panel">
  <p class="travel-dest-header">Destinations</p>
  <ul class="travel-dest-list" id="travel-dest-list"></ul>
</div>

<script>
document.addEventListener("DOMContentLoaded", function () {
  var destinations = [
    { name: "San Francisco", country: "USA", lat: 37.7749, lng: -122.4194, note: "Home base — where I build and create" },
    { name: "Banff", country: "Canada", lat: 51.1784, lng: -115.5708, note: "The Rockies — skiing, summits, and sunsets" },
    { name: "Calgary", country: "Canada", lat: 51.0447, lng: -114.0719, note: "Gateway to the mountains" },
    { name: "Vancouver", country: "Canada", lat: 49.2827, lng: -123.1207, note: "West coast beauty" },
    { name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832, note: "Canada's big city energy" },
    { name: "Recife", country: "Brazil", lat: -8.0476, lng: -34.8770, note: "The trip that changed my life" },
    { name: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333, note: "Brazil's vibrant heart" },
    { name: "New Delhi", country: "India", lat: 28.6139, lng: 77.2090, note: "Roots and heritage" },
    { name: "Mumbai", country: "India", lat: 19.0760, lng: 72.8777, note: "City of dreams" },
    { name: "New York", country: "USA", lat: 40.7128, lng: -74.0060, note: "The city that never sleeps" },
    { name: "Los Angeles", country: "USA", lat: 34.0522, lng: -118.2437, note: "Sunshine and creativity" },
    { name: "London", country: "UK", lat: 51.5074, lng: -0.1278, note: "History meets modernity" },
    { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522, note: "The city of light" },
    { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, note: "Where tradition meets the future" },
    { name: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018, note: "Sensory overload in the best way" }
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

  var statsEl = document.getElementById('travel-stats');
  var continents = { "North America": 0, "South America": 0, "Europe": 0, "Asia": 0 };
  var continentMap = {
    "USA": "North America", "Canada": "North America",
    "Brazil": "South America",
    "India": "Asia", "Japan": "Asia", "Thailand": "Asia",
    "UK": "Europe", "France": "Europe"
  };
  destinations.forEach(function(d) {
    var c = continentMap[d.country];
    if (c) continents[c]++;
  });
  var statsHTML = '<div class="travel-stat-card"><div class="travel-stat-num">' +
    destinations.length + '</div><div class="travel-stat-label">Locations</div></div>' +
    '<div class="travel-stat-card"><div class="travel-stat-num">' +
    countries.length + '</div><div class="travel-stat-label">Countries</div></div>' +
    '<div class="travel-stat-card"><div class="travel-stat-num">' +
    Object.keys(continents).length + '</div><div class="travel-stat-label">Continents</div></div>';
  statsEl.innerHTML = statsHTML;

  var map = L.map('travel-map', {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 12,
    zoomControl: false,
    attributionControl: false
  });

  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  var markerIcon = L.divIcon({
    className: 'travel-pulse-marker',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10]
  });

  var markers = [];
  destinations.forEach(function(d, i) {
    var marker = L.marker([d.lat, d.lng], { icon: markerIcon })
      .addTo(map)
      .bindPopup(
        '<strong>' + d.name + '</strong><br>' +
        '<span style="color:rgba(232,166,166,0.5);font-size:0.7rem;letter-spacing:1px;">' +
        d.country.toUpperCase() + '</span>' +
        (d.note ? '<br><span style="color:#999;font-size:0.75rem;">' + d.note + '</span>' : ''),
        { className: 'travel-popup', maxWidth: 220 }
      );
    markers.push(marker);
  });

  var listEl = document.getElementById('travel-dest-list');
  destinations.forEach(function(d, i) {
    var li = document.createElement('li');
    li.className = 'travel-dest-item';
    li.innerHTML =
      '<span class="travel-dest-marker"></span>' +
      '<span class="travel-dest-name">' + d.name + '</span>' +
      '<span class="travel-dest-country">' + d.country + '</span>';
    li.addEventListener('click', function() {
      map.flyTo([d.lat, d.lng], 6, { duration: 1.2 });
      setTimeout(function() { markers[i].openPopup(); }, 1300);
    });
    listEl.appendChild(li);
  });
});
</script>
