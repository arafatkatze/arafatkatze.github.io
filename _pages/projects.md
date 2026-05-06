---
layout: default
title: Projects
permalink: /projects/
description: Some of my favourite life stories and photos
nav: true
nav_order: 2
display_categories: [art, fun, work]
---

<div class="post">

<div class="blog-hero">
  <h1>projects.</h1>
  <p>Some of my favourite life stories and photos. Art, travel, work — it's all here.</p>
</div>

{% assign all_projects = "" | split: "" %}
{% for category in page.display_categories %}
  {% assign cat_projects = site.projects | where: "category", category %}
  {% assign all_projects = all_projects | concat: cat_projects %}
{% endfor %}
{% assign sorted_projects = all_projects | sort: "importance" %}

<div class="project-card-grid">
  {% for project in sorted_projects %}
  <a class="project-card" href="{% if project.redirect %}{{ project.redirect }}{% else %}{{ project.url | relative_url }}{% endif %}">
    {% if project.img %}
    <div class="project-card-img">
      <img src="{{ project.img | relative_url }}" alt="{{ project.title }}" loading="lazy" />
    </div>
    {% endif %}
    <div class="project-card-inner">
      <span class="project-card-label">Projects &middot; {{ project.category | capitalize }}</span>
      <span class="blog-card-arrow">&#8599;</span>
      <h3 class="project-card-title">{{ project.title }}</h3>
      {% if project.description and project.description != "" %}
        <p class="project-card-description">{{ project.description }}</p>
      {% endif %}
    </div>
  </a>
  {% endfor %}
</div>

</div>
