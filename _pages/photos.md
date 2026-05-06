---
layout: page
title: Photos
permalink: /photos/
nav: false
description: A scrapbook of moments — skiing, travel, art, and the people who made each one matter.
---

<p class="photos-intro">
  A scrapbook of moments. Each photo lives somewhere else on this site too — in a
  <a href="{{ '/projects/' | relative_url }}">project</a> page or an
  <a href="{{ '/blog/' | relative_url }}">essay</a> — but pulling them all into one
  surface lets the eye wander.
</p>

<div class="photo-grid">
  {% assign photos = site.data.photos %}
  {% for p in photos %}
    <a class="photo-card" href="{{ p.link | relative_url }}" title="{{ p.caption | escape }}">
      <img src="{{ p.url }}" alt="{{ p.caption | escape }}" loading="lazy" />
      <div class="photo-card-meta">
        <span class="photo-card-caption">{{ p.caption }}</span>
        <span class="photo-card-where">{{ p.where }}</span>
      </div>
    </a>
  {% endfor %}
</div>
