---
layout: default
title: Photography
permalink: /photography/
description: A vertical scroll of photos. Click any frame to open the lightbox.
nav: true
nav_order: 7
---

<!--
  NOTE: The image URLs below are temporary placeholders hot-linked from
  asemenza.net so I can iterate on the page layout. Replace these with my
  own photos (and the project title/description above) when ready.
-->

{% assign placeholder_base = "https://asemenza.net/photos/For%20God%20So%20Loved%20the%20World/" %}

<section class="photo-gallery" aria-label="Photography project">
  <header class="photo-gallery__intro">
    <p class="photo-gallery__eyebrow">Photographs</p>
    <h1 class="photo-gallery__title">For God So Loved the World</h1>
    <p class="photo-gallery__caption">
      Placeholder project — layout preview only. Photographs will be replaced with my own work.
    </p>
  </header>

  <div class="photo-gallery__stack" id="photo-gallery-stack">
    {% for i in (1..66) %}
      {% assign idx = i | prepend: "00" | slice: -2, 2 %}
      {% assign src = placeholder_base | append: "p-" | append: idx | append: ".jpg" %}
      <figure class="photo-gallery__frame" data-index="{{ forloop.index0 }}">
        <img
          class="photo-gallery__image"
          src="{{ src }}"
          alt="Photograph {{ i }}"
          loading="lazy"
          decoding="async"
        />
      </figure>
    {% endfor %}
  </div>
</section>

<div class="photo-lightbox" id="photo-lightbox" hidden aria-hidden="true" role="dialog" aria-modal="true" aria-label="Photograph viewer">
  <button class="photo-lightbox__close" type="button" data-photo-action="close" aria-label="Close viewer">&times;</button>
  <button class="photo-lightbox__nav photo-lightbox__nav--prev" type="button" data-photo-action="prev" aria-label="Previous photograph">&#8249;</button>
  <figure class="photo-lightbox__stage">
    <img class="photo-lightbox__image" id="photo-lightbox-image" alt="" />
    <figcaption class="photo-lightbox__counter" id="photo-lightbox-counter"></figcaption>
  </figure>
  <button class="photo-lightbox__nav photo-lightbox__nav--next" type="button" data-photo-action="next" aria-label="Next photograph">&#8250;</button>
</div>

<link rel="stylesheet" href="{{ '/assets/css/photography.css' | relative_url }}" />
<script src="{{ '/assets/js/photography.js' | relative_url }}" defer></script>
