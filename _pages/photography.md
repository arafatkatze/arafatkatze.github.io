---
layout: default
title: Photography
permalink: /photography/
description: A full-bleed grid of photographs, grouped by project.
nav: true
nav_order: 7
---

<!--
  Project list lives in _data/photography.yml. Each entry becomes a pill in
  the bar below and renders its own grid. URL `?project=<slug>` deep-links
  directly to a project.
-->

<section class="photo-gallery" aria-label="Photography projects">
  <header class="photo-gallery__intro">
    <p class="photo-gallery__eyebrow">Photographs</p>
    <h1 class="photo-gallery__title" id="photo-gallery-title">{{ site.data.photography.projects[0].title }}</h1>
    <p class="photo-gallery__caption" id="photo-gallery-caption" hidden></p>
  </header>

  <div class="photo-gallery__projects-wrap" data-overflow="false">
    <button
      type="button"
      class="photo-gallery__nudge photo-gallery__nudge--prev"
      data-photo-nudge="prev"
      aria-label="Scroll projects left"
      tabindex="-1"
      hidden
    >&#8249;</button>

    <nav class="photo-gallery__projects" id="photo-gallery-projects" aria-label="Projects" role="tablist">
      {% for project in site.data.photography.projects %}
        <button
          class="photo-gallery__pill{% if forloop.first %} is-active{% endif %}"
          type="button"
          role="tab"
          data-project-slug="{{ project.slug }}"
          aria-selected="{% if forloop.first %}true{% else %}false{% endif %}"
        >{{ project.title }}</button>
      {% endfor %}
    </nav>

    <button
      type="button"
      class="photo-gallery__nudge photo-gallery__nudge--next"
      data-photo-nudge="next"
      aria-label="Scroll projects right"
      tabindex="-1"
      hidden
    >&#8250;</button>
  </div>

  <div class="photo-gallery__stack" id="photo-gallery-stack" aria-live="polite" data-default-slug="{{ site.data.photography.projects[0].slug }}">
    {%- comment -%}
      Server-render the default project's grid so the page paints with photos
      already in place -- no empty-to-populated pop on first load. The JS
      controller detects this pre-rendered grid via data-default-slug and
      just attaches click/keyboard handlers instead of re-rendering.
    {%- endcomment -%}
    {%- assign default_project = site.data.photography.projects[0] -%}
    {%- if default_project.images -%}
      {%- for url in default_project.images -%}
        <figure class="photo-gallery__frame" data-index="{{ forloop.index0 }}" tabindex="0" role="button" aria-label="Open photograph {{ forloop.index }}">
          <img class="photo-gallery__image" src="{{ url }}" alt="Photograph {{ forloop.index }}" loading="lazy" decoding="async" />
        </figure>
      {%- endfor -%}
    {%- endif -%}
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

<script id="photo-projects-data" type="application/json">
{
  "projects": [
    {%- for project in site.data.photography.projects -%}
      {
        "slug": {{ project.slug | jsonify }},
        "title": {{ project.title | jsonify }},
        "description": {{ project.description | default: "" | jsonify }},
        "images": [
          {%- if project.images -%}
            {%- for url in project.images -%}
              {{ url | jsonify }}{% unless forloop.last %},{% endunless %}
            {%- endfor -%}
          {%- else -%}
            {%- assign start = project.image_start | default: 1 -%}
            {%- assign end = project.image_end | default: 1 -%}
            {%- assign prefix = project.image_prefix | default: "p-" -%}
            {%- for i in (start..end) -%}
              {%- assign idx = i | prepend: "00" | slice: -2, 2 -%}
              {%- capture url -%}{{ project.image_base }}{{ prefix }}{{ idx }}.jpg{%- endcapture -%}
              {{ url | jsonify }}{% unless forloop.last %},{% endunless %}
            {%- endfor -%}
          {%- endif -%}
        ]
      }{% unless forloop.last %},{% endunless %}
    {%- endfor -%}
  ]
}
</script>

<link rel="stylesheet" href="{{ '/assets/css/photography.css' | relative_url }}" />
<script src="{{ '/assets/js/photography.js' | relative_url }}" defer></script>
