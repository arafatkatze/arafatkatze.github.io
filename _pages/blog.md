---
layout: default
permalink: /blog/
title: Writing
description: Essays, love letters, philosophy and travel stories — the wild west of my thoughts.
nav: true
nav_order: 1
pagination:
  enabled: true
  collection: posts
  permalink: /page/:num/
  per_page: 30
  sort_field: date
  sort_reverse: true
  trail:
    before: 1
    after: 3
---

<div class="post">

<div class="blog-hero">
  <div class="blog-hero-row">
    <h1>writing.</h1>
    <a class="blog-hero-rss" href="{{ '/feed.xml' | relative_url }}" title="Subscribe via RSS" aria-label="Subscribe via RSS">
      <i class="fa-solid fa-rss"></i> RSS
    </a>
  </div>
  <p>I have a blog that doesn't really adhere to any fixed themes. From philosophy essays to travel stories to love letters, it really is the wild west.</p>
</div>

{% if page.pagination.enabled %}
  {% assign postlist = paginator.posts %}
{% else %}
  {% assign postlist = site.posts %}
{% endif %}

<div class="blog-card-grid">
  {% for post in postlist %}

  {% assign mod = forloop.index0 | modulo: 5 %}
  <a class="blog-card{% if mod == 0 %} blog-card-wide{% endif %}" href="{% if post.redirect == blank %}{{ post.url | relative_url }}{% elsif post.redirect contains '://' %}{{ post.redirect }}{% else %}{{ post.redirect | relative_url }}{% endif %}"{% if post.redirect contains '://' %} target="_blank"{% endif %}>
    <div class="blog-card-inner">
      <span class="blog-card-arrow">&#8599;</span>
      <h3 class="blog-card-title">{{ post.title }}</h3>
      <p class="blog-card-excerpt">{{ post.content | strip_html | truncatewords: 35 }}</p>
    </div>
  </a>

  {% endfor %}
</div>

{% if page.pagination.enabled %}
{% include pagination.liquid %}
{% endif %}

</div>
