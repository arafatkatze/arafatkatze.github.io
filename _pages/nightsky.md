---
layout: page
title: stars
permalink: /nightsky/
description: stories from my night sky — people who shaped me, plotted as stars.
nav: true
nav_order: 7
---

<div class="nightsky-page" id="nightsky-page">

  <header class="nightsky-hero">
    <h1 class="nightsky-title">Stories from my night sky.</h1>
    <p class="nightsky-sub">
      Every star here is someone I know. Hover on a bright one to read a little of their story.
      <span class="nightsky-hint-mobile">Tap a star on mobile.</span>
    </p>
  </header>

  <div class="nightsky-stage" id="nightsky-stage" aria-label="Interactive night sky">
    <svg class="nightsky-svg" id="nightsky-svg"
         viewBox="0 0 1000 600"
         preserveAspectRatio="xMidYMid slice"
         role="img"
         aria-hidden="true"></svg>

    <div class="nightsky-tooltip" id="nightsky-tooltip" role="tooltip" aria-hidden="true"></div>

    <button class="nightsky-reset" id="nightsky-reset" type="button" aria-label="Reshuffle the ambient stars" title="Reshuffle the ambient stars">↻</button>
  </div>

  <section class="nightsky-list" aria-label="All stars">
    <h2 class="nightsky-list-title">All the stars.</h2>
    <ol class="nightsky-list-grid" id="nightsky-list-grid"></ol>
  </section>

  <div class="nightsky-modal" id="nightsky-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="nightsky-modal-title">
    <div class="nightsky-modal-overlay" data-nightsky-close></div>
    <div class="nightsky-modal-card" id="nightsky-modal-card" tabindex="-1"></div>
  </div>

</div>

{% comment %} People + constellations injected as JSON for the JS layer to read. {% endcomment %}
<script id="nightsky-data" type="application/json">
{
  "people": {{ site.data.nightsky.people | jsonify }},
  "constellations": {{ site.data.nightsky.constellations | default: empty | jsonify }}
}
</script>

<script src="{{ '/assets/js/night-sky.js' | relative_url }}" defer></script>
