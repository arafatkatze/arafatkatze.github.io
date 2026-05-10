---
layout: page
title: Stories from my night sky
permalink: /nightsky/
description: 
nav: false
---

<div class="nightsky-page" id="nightsky-page">

  <header class="nightsky-hero">
    <p class="nightsky-sub">
      Every star here is a real one in the night sky, and it represents a person I know.
      The name and meaning are a portrait of who they are to me, but who they are stays mine.
      Hover over any star to read about them.
      <span class="nightsky-hint-mobile">Tap a star on mobile.</span>
    </p>
  </header>

  <div class="nightsky-stage" id="nightsky-stage" aria-label="Interactive night sky">
    <svg class="nightsky-svg" id="nightsky-svg"
         viewBox="0 0 1000 600"
         preserveAspectRatio="xMidYMid meet"
         role="img"
         aria-hidden="true"></svg>

    <div class="nightsky-tooltip" id="nightsky-tooltip" role="tooltip" aria-hidden="true"></div>

    <p class="nightsky-hint" id="nightsky-hint" aria-hidden="true">
      <strong id="nightsky-count"> hover any stars</strong>
    </p>

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
  "show_constellations": {{ site.data.nightsky.show_constellations | default: false | jsonify }},
  "people": {{ site.data.nightsky.people | jsonify }},
  "constellations": {{ site.data.nightsky.constellations | default: empty | jsonify }}
}
</script>

<script src="{{ '/assets/js/night-sky.js' | relative_url }}" defer></script>
