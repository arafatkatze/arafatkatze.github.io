---
layout: page
title: Life
permalink: /projects/
description: Some of my favourite life stories and photos
nav: true
<<<<<<< HEAD
nav_order: 3
display_categories: [work, fun]
horizontal: false
=======
nav_order: 2
display_categories: [fun, work]
horizontal: true
>>>>>>> 9b6454ed (Initial commit with all changes)
---

<!-- pages/projects.md -->
<div class="projects">
{% if site.enable_project_categories and page.display_categories %}
  <!-- Display categorized projects -->
  {% for category in page.display_categories %}
  <a id="{{ category }}" href=".#{{ category }}">
    <h2 class="category">{{ category }}</h2>
  </a>
  {% assign categorized_projects = site.projects | where: "category", category %}
  {% assign sorted_projects = categorized_projects | sort: "importance" %}
  <!-- Generate cards for each project -->
<<<<<<< HEAD
  {% if page.horizontal %}
  <div class="container">
    <div class="row row-cols-1 row-cols-md-2">
    {% for project in sorted_projects %}
      {% include projects_horizontal.liquid %}
    {% endfor %}
=======
  {% if page.horizontal -%}
  <div class="container mb-5">
    <div class="row row-cols-2 g-3">
    {%- for project in sorted_projects -%}
      <div class="col mb-3">
        {% include projects_horizontal.html %}
      </div>
    {%- endfor %}
>>>>>>> 9b6454ed (Initial commit with all changes)
    </div>
  </div>
  {% else %}
  <div class="row row-cols-1 row-cols-md-3">
    {% for project in sorted_projects %}
      {% include projects.liquid %}
    {% endfor %}
  </div>
  {% endif %}
  {% endfor %}

{% else %}

<!-- Display projects without categories -->

{% assign sorted_projects = site.projects | sort: "importance" %}

  <!-- Generate cards for each project -->

{% if page.horizontal %}

  <div class="container">
    <div class="row row-cols-1 row-cols-md-2">
    {% for project in sorted_projects %}
      {% include projects_horizontal.liquid %}
    {% endfor %}
    </div>
  </div>
  {% else %}
  <div class="row row-cols-1 row-cols-md-3">
    {% for project in sorted_projects %}
      {% include projects.liquid %}
    {% endfor %}
  </div>
<<<<<<< HEAD
  {% endif %}
{% endif %}
</div>
=======
  {%- endif -%}
{%- endif -%}
</div>
>>>>>>> 9b6454ed (Initial commit with all changes)
