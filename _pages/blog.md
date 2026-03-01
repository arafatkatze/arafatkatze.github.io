---
layout: default
permalink: /blog/
title: Blog
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

{% if page.pagination.enabled %}
  {% assign postlist = paginator.posts %}
{% else %}
  {% assign postlist = site.posts %}
{% endif %}

<div class="blog-card-grid">
  {% for post in postlist %}

  {% if post.external_source == blank %}
    {% assign read_time = post.content | number_of_words | divided_by: 180 | plus: 1 %}
  {% else %}
    {% assign read_time = post.feed_content | strip_html | number_of_words | divided_by: 180 | plus: 1 %}
  {% endif %}

  <a class="blog-card" href="{% if post.redirect == blank %}{{ post.url | relative_url }}{% elsif post.redirect contains '://' %}{{ post.redirect }}{% else %}{{ post.redirect | relative_url }}{% endif %}"{% if post.redirect contains '://' %} target="_blank"{% endif %}>
    <div class="blog-card-inner">
      <span class="blog-card-meta">
        {{ read_time }} min read &middot; {{ post.date | date: '%B %-d, %Y' }}
      </span>
      <h3 class="blog-card-title">{{ post.title }}</h3>
      {% if post.description %}
        <p class="blog-card-description">{{ post.description }}</p>
      {% endif %}
    </div>
  </a>

  {% endfor %}
</div>

{% if page.pagination.enabled %}
{% include pagination.liquid %}
{% endif %}

</div>
