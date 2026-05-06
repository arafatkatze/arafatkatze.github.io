---
layout: page
title: Moon
permalink: /moon/
nav: false
description: The moon, right now. Pick a date and see what it looked like. The moons of every essay on this site.
---

<div class="moon-page">

  <p class="moon-eyebrow">moon</p>
  <h1 class="moon-title">What the sky was doing.</h1>
  <p class="moon-rules">
    The moon is the most reliable thing in our lives. Each essay on this site
    has a tiny moon next to its date — the actual phase of the moon on the day
    it was written. Click any to land here. Pick a date below to look up any
    other day.
  </p>

  <!-- Today's moon (big, dramatic) -->
  <section class="moon-now">
    <div class="moon-now__visual" id="moon-now-visual">
      {% include moon_phase.liquid date=site.time size=180 %}
    </div>
    <div class="moon-now__body">
      <p class="moon-now__chip" id="moon-now-chip">today</p>
      <p class="moon-now__name" id="moon-now-name">…</p>
      <p class="moon-now__when" id="moon-now-when">{{ site.time | date: "%A, %-d %B %Y" }}</p>
    </div>
  </section>

  <!-- Lookup -->
  <section class="moon-lookup">
    <label for="moon-input" class="moon-lookup__label">Pick any date:</label>
    <input type="date" id="moon-input" class="moon-lookup__input" value="{{ site.time | date: '%Y-%m-%d' }}" />
  </section>

  <!-- Moons of every essay -->
  {% if site.posts.size > 0 %}
    <h2 class="moon-section">moons of essays</h2>
    <ul class="moon-essays">
      {% for post in site.posts %}
        <li class="moon-essay">
          <a class="moon-essay__link" href="{{ post.url | relative_url }}">
            <span class="moon-essay__moon">
              {% include moon_phase.liquid date=post.date size=44 %}
            </span>
            <span class="moon-essay__body">
              <span class="moon-essay__title">{{ post.title }}</span>
              <span class="moon-essay__date">{{ post.date | date: "%-d %b %Y" }}</span>
            </span>
          </a>
        </li>
      {% endfor %}
    </ul>
  {% endif %}

  <p class="moon-meta">
    Phase math by synodic month (29.5306 days), reckoned from the new moon of
    6 January 2000. Accurate to within a day or two — close enough to know if
    the night was loud or quiet.
  </p>

</div>

<script>
(function () {
  'use strict';

  // Same constants as the liquid include
  var SYNODIC = 29.5305882 * 86400;       // seconds
  var REF_NEW_MOON_UNIX = 947182440;       // 2000-01-06 18:14:00 UTC

  var PHASES = [
    { name: 'new moon',        glyph: 'new'             },
    { name: 'waxing crescent', glyph: 'waxing-crescent' },
    { name: 'first quarter',   glyph: 'first-quarter'   },
    { name: 'waxing gibbous',  glyph: 'waxing-gibbous'  },
    { name: 'full moon',       glyph: 'full'            },
    { name: 'waning gibbous',  glyph: 'waning-gibbous'  },
    { name: 'last quarter',    glyph: 'last-quarter'    },
    { name: 'waning crescent', glyph: 'waning-crescent' }
  ];

  function phaseFor(unixSec) {
    var diff = unixSec - REF_NEW_MOON_UNIX;
    var frac = ((diff % SYNODIC) + SYNODIC) % SYNODIC / SYNODIC;
    // Same buckets as the liquid include (in fractions of 1)
    if (frac < 0.031 || frac >= 0.969) return { i: 0, frac: frac };
    if (frac < 0.219) return { i: 1, frac: frac };
    if (frac < 0.281) return { i: 2, frac: frac };
    if (frac < 0.469) return { i: 3, frac: frac };
    if (frac < 0.531) return { i: 4, frac: frac };
    if (frac < 0.719) return { i: 5, frac: frac };
    if (frac < 0.781) return { i: 6, frac: frac };
    return { i: 7, frac: frac };
  }

  function svgFor(glyph) {
    var common = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="moon-phase__svg" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="48" fill="#fdf3d8" stroke="rgba(232, 200, 200, 0.35)" stroke-width="1.2" />';
    switch (glyph) {
      case 'new':
        return common + '<circle cx="50" cy="50" r="48" fill="#13131c" /></svg>';
      case 'full':
        return common + '<circle cx="38" cy="42" r="3.5" fill="rgba(0,0,0,0.08)" />' +
               '<circle cx="60" cy="55" r="2.4" fill="rgba(0,0,0,0.07)" />' +
               '<circle cx="55" cy="32" r="1.8" fill="rgba(0,0,0,0.06)" /></svg>';
      case 'first-quarter':
        return common + '<path d="M50,4 A46,46 0 0 0 50,96 L50,4 Z" fill="#1a1a26" /></svg>';
      case 'last-quarter':
        return common + '<path d="M50,4 A46,46 0 0 1 50,96 L50,4 Z" fill="#1a1a26" /></svg>';
      case 'waxing-crescent':
        return common + '<path d="M50,4 A46,46 0 0 0 50,96 A22,46 0 0 0 50,4 Z" fill="#1a1a26" /></svg>';
      case 'waning-crescent':
        return common + '<path d="M50,4 A46,46 0 0 1 50,96 A22,46 0 0 1 50,4 Z" fill="#1a1a26" /></svg>';
      case 'waxing-gibbous':
        return common + '<path d="M50,4 A46,46 0 0 0 50,96 A22,46 0 0 1 50,4 Z" fill="#1a1a26" /></svg>';
      case 'waning-gibbous':
        return common + '<path d="M50,4 A46,46 0 0 1 50,96 A22,46 0 0 0 50,4 Z" fill="#1a1a26" /></svg>';
    }
    return '';
  }

  function renderMoon(date) {
    var unix = Math.floor(date.getTime() / 1000);
    var p = phaseFor(unix);
    var name = PHASES[p.i].name;
    var glyph = PHASES[p.i].glyph;
    var pct = (p.frac * 100).toFixed(1);

    var visual = document.getElementById('moon-now-visual');
    if (visual) {
      visual.innerHTML =
        '<span class="moon-phase moon-phase--' + glyph + '" title="' + name + ' · ' + pct + '% through the cycle" role="img" aria-label="Moon phase: ' + name + '">' +
        svgFor(glyph).replace('class="moon-phase__svg"', 'class="moon-phase__svg" width="180" height="180"') +
        '</span>';
    }

    var nameEl = document.getElementById('moon-now-name');
    var whenEl = document.getElementById('moon-now-when');
    var chipEl = document.getElementById('moon-now-chip');
    if (nameEl) nameEl.textContent = name + '.';
    if (whenEl) {
      var fmt = date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      whenEl.textContent = fmt + ' · ' + pct + '% through the cycle';
    }
    if (chipEl) {
      var todayStr = new Date().toISOString().slice(0, 10);
      var dateStr  = date.toISOString().slice(0, 10);
      chipEl.textContent = (todayStr === dateStr) ? 'today' : 'on this date';
    }
  }

  var input = document.getElementById('moon-input');

  // Honour ?d=YYYY-MM-DD permalinks
  var qd = new URLSearchParams(location.search).get('d');
  var initial = qd && /^\d{4}-\d{2}-\d{2}$/.test(qd) ? new Date(qd + 'T12:00:00Z') : new Date();
  if (qd) input.value = initial.toISOString().slice(0, 10);
  renderMoon(initial);

  input.addEventListener('change', function () {
    if (!input.value) return;
    var d = new Date(input.value + 'T12:00:00Z');
    if (!isNaN(d.getTime())) {
      renderMoon(d);
      // Update URL so it can be shared
      var url = new URL(location.href);
      url.searchParams.set('d', input.value);
      history.replaceState(null, '', url.pathname + url.search);
    }
  });
})();
</script>
