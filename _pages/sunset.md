---
layout: default
title: Sunset
permalink: /sunset/
nav: false
description: A single page where the background is the current sunset where you are. Refresh through the day to watch the sky change.
---

<style>
  /* This page is a quiet single-purpose moment.
     We hide the navbar and footer chrome to let the sky breathe. */
  body.sunset-body {
    margin: 0;
    overflow-x: hidden;
    background: #1a1a1f;
  }
  body.sunset-body header,
  body.sunset-body footer,
  body.sunset-body .contact-fab,
  body.sunset-body progress,
  body.sunset-body .progress-container,
  body.sunset-body #navbar { display: none !important; }
  body.sunset-body .container.mt-5 {
    margin-top: 0 !important;
    padding: 0 !important;
    max-width: none !important;
  }

  .sunset-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background:
      radial-gradient(ellipse at 50% 110%, rgba(255, 255, 255, 0.04) 0%, transparent 50%),
      var(--sunset-gradient, linear-gradient(180deg, #1a1a1f 0%, #2a2a30 100%));
    color: #fff;
    transition: background 4s ease;
    padding: 2rem 1.75rem;
    font-family: "Fraunces", Georgia, serif;
    position: relative;
    overflow: hidden;
  }

  .sunset-page::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 70%, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0.18) 100%);
    pointer-events: none;
    transition: opacity 4s ease;
  }

  .sunset-top {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    color: rgba(255, 255, 255, 0.78);
    font-size: 0.78rem;
    letter-spacing: 0.04em;
  }

  .sunset-home {
    color: rgba(255, 255, 255, 0.78);
    text-decoration: none;
    font-style: italic;
    border-bottom: 1px dotted rgba(255, 255, 255, 0.45);

    &:hover { color: #fff; border-bottom-color: #fff; }
  }

  .sunset-time {
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.7);
  }

  .sunset-center {
    position: relative;
    z-index: 1;
    text-align: center;
    margin: auto 0;
    padding: 4rem 1rem;
  }

  .sunset-phase {
    display: block;
    font-style: italic;
    font-weight: 400;
    font-size: clamp(2.4rem, 6vw, 4rem);
    line-height: 1.15;
    letter-spacing: -0.015em;
    color: #fff;
    text-shadow: 0 2px 16px rgba(0, 0, 0, 0.3);
    margin: 0;
  }

  .sunset-where {
    display: block;
    font-style: italic;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.75);
    margin: 1.25rem 0 0 0;
  }

  .sunset-bottom {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.78rem;
    letter-spacing: 0.04em;
  }

  .sunset-bottom__note {
    font-style: italic;
    max-width: 28ch;
    line-height: 1.45;
  }

  .sunset-bottom__refresh {
    color: rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 0.45rem 0.9rem;
    border-radius: 999px;
    font-family: "Fraunces", Georgia, serif;
    font-style: italic;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);

    &:hover { background: rgba(255, 255, 255, 0.14); border-color: rgba(255, 255, 255, 0.3); }
  }

  // A very faint star-field for the night phases
  .sunset-stars {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0;
    transition: opacity 4s ease;
    background-image:
      radial-gradient(1px 1px at 12% 22%, rgba(255,255,255,0.7) 50%, transparent 51%),
      radial-gradient(1px 1px at 88% 14%, rgba(255,255,255,0.65) 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 30% 40%, rgba(255,255,255,0.85) 50%, transparent 51%),
      radial-gradient(1px 1px at 65% 60%, rgba(255,255,255,0.55) 50%, transparent 51%),
      radial-gradient(1px 1px at 22% 75%, rgba(255,255,255,0.6) 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 78% 82%, rgba(255,255,255,0.7) 50%, transparent 51%),
      radial-gradient(1px 1px at 50% 12%, rgba(255,255,255,0.55) 50%, transparent 51%),
      radial-gradient(1px 1px at 5% 55%, rgba(255,255,255,0.5) 50%, transparent 51%),
      radial-gradient(1px 1px at 95% 45%, rgba(255,255,255,0.6) 50%, transparent 51%);
  }

  .sunset-page.sunset-page--starry .sunset-stars { opacity: 1; }

  // The "sun" — only visible during day phases
  .sunset-sun {
    position: absolute;
    z-index: 0;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 4s ease, top 4s ease, background 4s ease, box-shadow 4s ease;
    background: radial-gradient(circle, var(--sun-color, #fff8e0) 0%, rgba(255,255,255,0) 65%);
    box-shadow: 0 0 120px var(--sun-glow, rgba(255, 200, 130, 0.4));
  }

  .sunset-page.sunset-page--day  .sunset-sun { opacity: 0.95; top: 30%; }
  .sunset-page.sunset-page--dusk .sunset-sun { opacity: 0.95; top: 65%; }
  .sunset-page.sunset-page--dawn .sunset-sun { opacity: 0.85; top: 65%; }

  @media (prefers-reduced-motion: reduce) {
    .sunset-page,
    .sunset-page::before,
    .sunset-stars,
    .sunset-sun {
      transition: none;
    }
  }
</style>

<div class="sunset-page" id="sunset-page">
  <div class="sunset-stars"></div>
  <div class="sunset-sun"></div>

  <div class="sunset-top">
    <a class="sunset-home" href="{{ '/' | relative_url }}">← back to ara</a>
    <span class="sunset-time" id="sunset-time">--:--</span>
  </div>

  <div class="sunset-center">
    <p class="sunset-phase" id="sunset-phase">…</p>
    <p class="sunset-where" id="sunset-where"></p>
  </div>

  <div class="sunset-bottom">
    <span class="sunset-bottom__note">
      Refresh whenever. The sky updates every minute, the gradient slides through the day.
    </span>
    <button type="button" class="sunset-bottom__refresh" id="sunset-tick" aria-label="Skip ahead one hour">tick &nbsp;→</button>
  </div>
</div>

<script>
  document.body.classList.add('sunset-body');

  (function () {
    'use strict';

    var pageEl   = document.getElementById('sunset-page');
    var phaseEl  = document.getElementById('sunset-phase');
    var whereEl  = document.getElementById('sunset-where');
    var timeEl   = document.getElementById('sunset-time');
    var tickBtn  = document.getElementById('sunset-tick');

    // Phases keyed by hour-of-day (0-23). Each has a phase name, a CSS gradient
    // for the sky, and a sun colour + glow. Smooth transitions between them
    // are handled by CSS via `transition: background 4s ease`.
    var PHASES = [
      { from: 0,  to: 4,  name: 'deep night',     mode: 'starry', grad: 'linear-gradient(180deg, #050614 0%, #0b0e25 50%, #1c1830 100%)',  sun: '#1a1a2e', glow: 'rgba(70, 80, 130, 0.3)' },
      { from: 4,  to: 5,  name: 'before dawn',    mode: 'starry', grad: 'linear-gradient(180deg, #0b1430 0%, #2a1f3e 50%, #4a2e3a 100%)',  sun: '#2a1f3e', glow: 'rgba(120, 80, 110, 0.4)' },
      { from: 5,  to: 6,  name: 'first light',    mode: 'dawn',   grad: 'linear-gradient(180deg, #1d2856 0%, #6b3a5c 45%, #d68a78 78%, #f3c89c 100%)', sun: '#ffd9a8', glow: 'rgba(255, 180, 130, 0.55)' },
      { from: 6,  to: 8,  name: 'morning glow',   mode: 'dawn',   grad: 'linear-gradient(180deg, #4a6fb5 0%, #b4a3c8 50%, #f5c6a0 100%)',  sun: '#fff3d0', glow: 'rgba(255, 220, 160, 0.55)' },
      { from: 8,  to: 11, name: 'morning blue',   mode: 'day',    grad: 'linear-gradient(180deg, #74a9d8 0%, #b6d4ec 60%, #e7f1f8 100%)',  sun: '#fffbe8', glow: 'rgba(255, 248, 220, 0.55)' },
      { from: 11, to: 15, name: 'high noon',      mode: 'day',    grad: 'linear-gradient(180deg, #4a8fcc 0%, #98c5e8 60%, #d8eaf6 100%)',  sun: '#ffffff', glow: 'rgba(255, 255, 255, 0.65)' },
      { from: 15, to: 17, name: 'afternoon',      mode: 'day',    grad: 'linear-gradient(180deg, #5a9bd0 0%, #b1cee4 50%, #e9d3b8 100%)',  sun: '#fff2c8', glow: 'rgba(255, 215, 150, 0.55)' },
      { from: 17, to: 18, name: 'golden hour',    mode: 'dusk',   grad: 'linear-gradient(180deg, #5a6db5 0%, #d68a4c 60%, #f3c46b 100%)',  sun: '#ffb96a', glow: 'rgba(255, 160, 80, 0.65)' },
      { from: 18, to: 19, name: 'sunset',         mode: 'dusk',   grad: 'linear-gradient(180deg, #2e2e6b 0%, #6b3a78 35%, #c14a5c 65%, #e88248 88%, #f3a86a 100%)', sun: '#e85b48', glow: 'rgba(232, 91, 72, 0.65)' },
      { from: 19, to: 20, name: 'last light',     mode: 'dusk',   grad: 'linear-gradient(180deg, #131432 0%, #3a2858 35%, #7a3a5e 65%, #b25a52 100%)',  sun: '#a04855', glow: 'rgba(160, 72, 85, 0.5)' },
      { from: 20, to: 22, name: 'twilight',       mode: 'starry', grad: 'linear-gradient(180deg, #060a25 0%, #1a1840 50%, #3a2050 100%)',  sun: '#3a2050', glow: 'rgba(80, 60, 110, 0.4)' },
      { from: 22, to: 24, name: 'late night',     mode: 'starry', grad: 'linear-gradient(180deg, #03051c 0%, #0a0d2a 50%, #181a35 100%)',  sun: '#0a0d2a', glow: 'rgba(50, 60, 100, 0.3)' }
    ];

    function phaseForHour(h) {
      h = ((h % 24) + 24) % 24;
      for (var i = 0; i < PHASES.length; i++) {
        if (h >= PHASES[i].from && h < PHASES[i].to) return PHASES[i];
      }
      return PHASES[0];
    }

    var offset = 0; // hours added by tick button

    function tzName() {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
      catch (e) { return ''; }
    }

    function fmtTime(d) {
      var h = d.getHours();
      var m = d.getMinutes();
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    function update() {
      var d = new Date();
      d.setHours(d.getHours() + offset);
      var h = d.getHours();
      var p = phaseForHour(h);

      pageEl.style.setProperty('--sunset-gradient', p.grad);
      pageEl.style.setProperty('--sun-color', p.sun);
      pageEl.style.setProperty('--sun-glow', p.glow);

      pageEl.classList.remove('sunset-page--starry', 'sunset-page--dawn', 'sunset-page--day', 'sunset-page--dusk');
      pageEl.classList.add('sunset-page--' + p.mode);

      phaseEl.textContent = p.name + '.';
      var tz = tzName();
      whereEl.textContent = tz ? 'in ' + tz.replace(/_/g, ' ') + (offset ? ' · ' + (offset > 0 ? '+' : '') + offset + 'h' : '') : '';
      timeEl.textContent = fmtTime(d);
    }

    update();
    setInterval(update, 60 * 1000); // every minute

    tickBtn.addEventListener('click', function () {
      offset = (offset + 1) % 24;
      update();
    });

    // Spacebar also ticks +1h, so people can play through the day
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        offset = (offset + 1) % 24;
        update();
      }
    });
  })();
</script>
