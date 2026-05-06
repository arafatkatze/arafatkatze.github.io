---
layout: page
title: Where is Ara
permalink: /where-is-ara/
nav: false
description: A living dot on the globe. Where I am right now, and the recent stops that got me here.
---

{% assign w = site.data.whereami %}
{% assign c = w.current %}

<div class="wia-page">

  <div class="wia-status">
    <div class="wia-status__chip wia-status__chip--{{ c.status | default: 'home' }}">
      <span class="wia-status__dot"></span>
      <span class="wia-status__where">
        <span class="wia-status__city">{{ c.city }}</span><span class="wia-status__country">, {{ c.country }}</span>
      </span>
      <span class="wia-status__sep">·</span>
      <span class="wia-status__verb">{{ c.status | default: 'home' }}</span>
      <span class="wia-status__sep">·</span>
      <span class="wia-status__since" data-wia-since="{{ c.since }}">since {{ c.since | date: "%b %Y" }}</span>
    </div>
    {% if c.note %}<p class="wia-status__note">"{{ c.note }}"</p>{% endif %}
  </div>

  <div class="wia-globe-wrap">
    <div id="wia-globe" data-lat="{{ c.lat }}" data-lng="{{ c.lng }}"></div>
    <div class="wia-globe-corners"></div>
    <div class="wia-globe-corners-bottom"></div>
  </div>

  {% if w.recent and w.recent.size > 0 %}
    <h2 class="wia-section">lately</h2>
    <ol class="wia-timeline">
      {% for stop in w.recent %}
        <li class="wia-stop">
          <span class="wia-stop__pin" aria-hidden="true">●</span>
          <div class="wia-stop__body">
            <div class="wia-stop__head">
              <span class="wia-stop__city">{{ stop.city }}</span>
              <span class="wia-stop__country">{{ stop.country }}</span>
            </div>
            <div class="wia-stop__dates">
              <span data-wia-relative="{{ stop.left | default: stop.arrived }}">
                {{ stop.arrived | date: "%-d %b" }}{% if stop.left %} — {{ stop.left | date: "%-d %b %Y" }}{% else %} {{ stop.arrived | date: "%Y" }}{% endif %}
              </span>
            </div>
            {% if stop.note %}<p class="wia-stop__note">{{ stop.note }}</p>{% endif %}
          </div>
        </li>
      {% endfor %}
    </ol>
  {% endif %}

  <p class="wia-meta">
    Want to be on this list? <a href="mailto:{{ site.email }}">Tell me where you are</a> — if our paths cross I'd love to know.
  </p>

</div>

<script src="//unpkg.com/globe.gl@2.41.4/dist/globe.gl.min.js"></script>
<script>
(function () {
  'use strict';

  // ── Friendly "since X" / "X ago" relative formatting (run FIRST so it runs
  // even if globe.gl fails to initialise on this device) ──
  function fmtAgo(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var diff = Date.now() - d.getTime();
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 1) return 'today';
    if (days < 7) return days + ' day' + (days === 1 ? '' : 's') + ' ago';
    if (days < 30) {
      var w = Math.floor(days / 7);
      return w + ' week' + (w === 1 ? '' : 's') + ' ago';
    }
    if (days < 365) {
      var m = Math.floor(days / 30);
      return m + ' month' + (m === 1 ? '' : 's') + ' ago';
    }
    var y = Math.floor(days / 365);
    return y + ' year' + (y === 1 ? '' : 's') + ' ago';
  }

  document.querySelectorAll('[data-wia-since]').forEach(function (el) {
    var iso = el.getAttribute('data-wia-since');
    if (iso) el.textContent = 'since ' + fmtAgo(iso);
  });
  document.querySelectorAll('[data-wia-relative]').forEach(function (el) {
    var iso = el.getAttribute('data-wia-relative');
    if (iso) {
      var ago = fmtAgo(iso);
      el.textContent = el.textContent.trim() + ' · ' + ago;
    }
  });

  // Bail gracefully if globe.gl didn't load (offline preview, blocked, etc.)
  if (typeof Globe !== 'function') {
    var c0 = document.getElementById('wia-globe');
    if (c0) c0.innerHTML = '<div class="wia-globe-fallback">Map unavailable in this view.</div>';
    return;
  }

  // Stops: current + recent — current rendered as a pulsing rose dot, others as small grey points.
  var current = {
    name: {{ c.city | jsonify }},
    country: {{ c.country | jsonify }},
    lat: {{ c.lat }},
    lng: {{ c.lng }},
    isCurrent: true,
    note: {{ c.note | default: "" | jsonify }}
  };

  var recent = [
    {% for s in w.recent %}{
      name: {{ s.city | jsonify }},
      country: {{ s.country | jsonify }},
      lat: {{ s.lat }},
      lng: {{ s.lng }},
      isCurrent: false,
      note: {{ s.note | default: "" | jsonify }}
    }{% unless forloop.last %},{% endunless %}{% endfor %}
  ];

  var allPoints = [current].concat(recent);

  var arcs = recent.map(function (s) {
    return {
      startLat: s.lat, startLng: s.lng,
      endLat: current.lat, endLng: current.lng
    };
  });

  var container = document.getElementById('wia-globe');
  if (!container) return;

  var themes = {
    dark: {
      globeImage: '//unpkg.com/three-globe/example/img/earth-night.jpg',
      atmosphereColor: '#e8a6a6',
      currentColor: '#c9485b',
      pastColor: 'rgba(232, 166, 166, 0.55)',
      arcColor: 'rgba(232, 166, 166, 0.32)'
    },
    light: {
      globeImage: '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      atmosphereColor: '#6bb3d9',
      currentColor: '#c9485b',
      pastColor: 'rgba(201, 72, 91, 0.6)',
      arcColor: 'rgba(201, 72, 91, 0.3)'
    }
  };

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  var t = themes[getTheme()] || themes.dark;

  var globe;
  try {
    globe = Globe()
    .globeImageUrl(t.globeImage)
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
    .atmosphereColor(t.atmosphereColor)
    .atmosphereAltitude(0.18)
    .pointsData(allPoints)
    .pointLat('lat')
    .pointLng('lng')
    .pointAltitude(function (d) { return d.isCurrent ? 0.12 : 0.04; })
    .pointRadius(function (d) { return d.isCurrent ? 0.7 : 0.28; })
    .pointColor(function (d) { return d.isCurrent ? t.currentColor : t.pastColor; })
    .pointLabel(function (d) {
      return '<div class="globe-tooltip"><strong>' + d.name + '</strong><br>' +
             '<span class="tt-country">' + d.country + (d.isCurrent ? ' · here now' : '') + '</span>' +
             (d.note ? '<div class="tt-note">' + d.note + '</div>' : '') + '</div>';
    })
    .arcsData(arcs)
    .arcColor(function () { return [t.arcColor, t.arcColor]; })
    .arcStroke(0.4)
    .arcAltitudeAutoScale(0.35)
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcDashAnimateTime(2400)
    .width(container.offsetWidth)
    .height(container.offsetHeight)
    (container);
  } catch (err) {
    container.innerHTML = '<div class="wia-globe-fallback">Map could not load (WebGL unavailable). Current location: <strong>' + current.name + ', ' + current.country + '</strong>.</div>';
    return;
  }

  globe.controls().autoRotate = false;
  globe.controls().enableDamping = true;
  globe.controls().dampingFactor = 0.1;

  // Spin straight to "here now"
  setTimeout(function () {
    globe.pointOfView({ lat: current.lat, lng: current.lng, altitude: 1.7 }, 1500);
  }, 100);

  // Re-theme if dark/light toggles
  var lastTheme = getTheme();
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      if (m.attributeName === 'data-theme') {
        var t2 = themes[getTheme()] || themes.dark;
        if (getTheme() !== lastTheme) {
          lastTheme = getTheme();
          globe.globeImageUrl(t2.globeImage)
               .atmosphereColor(t2.atmosphereColor)
               .pointColor(function (d) { return d.isCurrent ? t2.currentColor : t2.pastColor; })
               .arcColor(function () { return [t2.arcColor, t2.arcColor]; });
        }
      }
    });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  window.addEventListener('resize', function () {
    globe.width(container.offsetWidth).height(container.offsetHeight);
  });
})();
</script>
