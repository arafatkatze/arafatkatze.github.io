---
layout: default
title: Projects
permalink: /projects/
description: Some of my favourite life stories and photos
nav: true
nav_order: 3
display_categories: [art, work]
---

<div class="post">

<div class="blog-hero">
  <h1>projects.</h1>
</div>

{% for category in page.display_categories %}
  {% assign cat_projects = site.projects | where: "category", category | sort: "importance" %}
  {% if cat_projects.size > 0 %}
  <section class="project-category-section">
    <h2 class="project-category-title">{{ category | capitalize }}</h2>
    <div class="project-card-grid">
      {% for project in cat_projects %}
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
  </section>
  {% endif %}
{% endfor %}

</div>
