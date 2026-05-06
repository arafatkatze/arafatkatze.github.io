---
layout: page
title: Everything
permalink: /everything/
nav: false
description: A complete index of this site — every page, every essay, every project, every book, every interactive. Searchable.
---

{% comment %}
  Curated index of the hand-built surfaces — keeps the human-web pages on top,
  in the order Ara would introduce them.
{% endcomment %}
{% assign surfaces = "" | split: "" %}
{% assign surfaces_meta = "
  about|/|the bento home page, the front door
  start-here|/start-here/|a handcrafted tour for new visitors
  now|/now/|what I'm into right now (Sivers-style)
  uses|/uses/|the tools and gear I rely on
  colophon|/colophon/|how this site is made
  fortune|/fortune/|a single quote from the bookshelf, randomized
  moon|/moon/|the moon, today + on every essay's date
  sunset|/sunset/|a page whose background is the current sky
  where-is-ara|/where-is-ara/|a living dot on the globe
  this-week|/this-week/|one rotating question, one-sentence answers
  guestbook|/guestbook/|leave a single line, signed
  letters-to-strangers|/letters-to-strangers/|write one anonymous letter, receive one back
  atomic-letter|/atomic-letter/|a starting line for the letter you keep meaning to write
  words-i-underline|/words-i-underline/|searchable commonplace book of underlined quotes
  photos|/photos/|a scrapbook of moments
  sketch|/sketch/|a shared sheet of paper, one stroke each
  pixels|/pixels/|collaborative pixel art canvas
  pack|/pack/|cut a 21kg suitcase down to 18 — a packing puzzle
  travel|/travel/|the full pin map and stats
  reading|/reading/|the bookshelf
  blog|/blog/|all writing
  projects|/projects/|all projects
  repositories|/repositories/|open source contributions
  cv|/cv/|resume
" | strip | newline_to_br | replace: '<br />', "\n" | split: "\n" %}

<div class="ev-page">

  <p class="ev-eyebrow">everything</p>
  <h1 class="ev-title">All the doors at once.</h1>
  <p class="ev-rules">
    Every page on this site, in one place. Type to filter. Useful when you
    half-remember a thing and want to find it.
  </p>

  <input type="search" id="ev-search" class="ev-search"
         placeholder="filter — type 'love' or 'rilke' or 'pack'…" autocomplete="off" />

  <p class="ev-count" id="ev-count"></p>

  <!-- Surfaces / interactives -->
  <section class="ev-section" data-ev-section data-ev-kind="surface">
    <h2 class="ev-section__title">Surfaces &amp; interactives</h2>
    <ul class="ev-list">
      {% for line in surfaces_meta %}
        {% assign trimmed = line | strip %}
        {% if trimmed != "" %}
          {% assign parts = trimmed | split: "|" %}
          <li class="ev-row" data-ev-text="{{ parts[0] | downcase }} {{ parts[2] | downcase | escape }}">
            <a class="ev-row__link" href="{{ parts[1] | relative_url }}">
              <span class="ev-row__title">{{ parts[0] }}</span>
              <span class="ev-row__desc">{{ parts[2] }}</span>
              <span class="ev-row__path">{{ parts[1] }}</span>
            </a>
          </li>
        {% endif %}
      {% endfor %}
    </ul>
  </section>

  <!-- Essays -->
  {% if site.posts.size > 0 %}
    <section class="ev-section" data-ev-section data-ev-kind="essay">
      <h2 class="ev-section__title">Essays <span class="ev-section__count">{{ site.posts.size }}</span></h2>
      <ul class="ev-list">
        {% for post in site.posts %}
          {% assign tagstr = post.tags | join: ' ' %}
          <li class="ev-row" data-ev-text="{{ post.title | downcase | escape }} {{ post.description | default: '' | downcase | escape }} {{ tagstr | downcase | escape }}">
            <a class="ev-row__link" href="{{ post.url | relative_url }}">
              <span class="ev-row__title">{{ post.title }}</span>
              <span class="ev-row__desc">{{ post.date | date: "%-d %b %Y" }}{% if post.category %} · {{ post.category }}{% endif %}</span>
              <span class="ev-row__path">{{ post.url }}</span>
            </a>
          </li>
        {% endfor %}
      </ul>
    </section>
  {% endif %}

  <!-- Projects -->
  {% assign visible_projects = site.projects | where_exp: "p", "p.category != 'unpublished'" %}
  {% if visible_projects.size > 0 %}
    <section class="ev-section" data-ev-section data-ev-kind="project">
      <h2 class="ev-section__title">Projects <span class="ev-section__count">{{ visible_projects.size }}</span></h2>
      <ul class="ev-list">
        {% for proj in visible_projects %}
          <li class="ev-row" data-ev-text="{{ proj.title | downcase | escape }} {{ proj.description | default: '' | downcase | escape }} {{ proj.category | downcase }}">
            <a class="ev-row__link" href="{{ proj.url | relative_url }}">
              <span class="ev-row__title">{{ proj.title }}</span>
              <span class="ev-row__desc">{{ proj.description | default: proj.category }}</span>
              <span class="ev-row__path">{{ proj.url }}</span>
            </a>
          </li>
        {% endfor %}
      </ul>
    </section>
  {% endif %}

  <!-- Books -->
  {% if site.books.size > 0 %}
    <section class="ev-section" data-ev-section data-ev-kind="book">
      <h2 class="ev-section__title">Books <span class="ev-section__count">{{ site.books.size }}</span></h2>
      <ul class="ev-list">
        {% for book in site.books %}
          <li class="ev-row" data-ev-text="{{ book.title | downcase | escape }} {{ book.author | default: '' | downcase | escape }}">
            <a class="ev-row__link" href="{{ '/reading/' | relative_url }}">
              <span class="ev-row__title">{{ book.title }}</span>
              <span class="ev-row__desc">{{ book.author }}{% if book.status %} · {{ book.status | downcase }}{% endif %}</span>
              <span class="ev-row__path">/reading/</span>
            </a>
          </li>
        {% endfor %}
      </ul>
    </section>
  {% endif %}

  <p class="ev-empty" id="ev-empty" hidden>
    Nothing matches that. Try a shorter word, or
    <button type="button" class="ev-link" id="ev-clear">clear the filter</button>.
  </p>

  <p class="ev-meta">
    {{ surfaces_meta.size }} surfaces · {{ site.posts.size }} essays ·
    {{ visible_projects.size }} projects · {{ site.books.size }} books.
    Press <kbd>/</kbd> to focus the search.
  </p>

</div>

<script>
(function () {
  'use strict';

  var searchEl  = document.getElementById('ev-search');
  var countEl   = document.getElementById('ev-count');
  var emptyEl   = document.getElementById('ev-empty');
  var clearBtn  = document.getElementById('ev-clear');
  var sections  = Array.prototype.slice.call(document.querySelectorAll('[data-ev-section]'));
  var rows      = Array.prototype.slice.call(document.querySelectorAll('.ev-row'));

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function apply() {
    var q = (searchEl.value || '').toLowerCase().trim();
    var visible = 0;
    rows.forEach(function (el) {
      var hay = el.getAttribute('data-ev-text') || '';
      var match = !q || hay.indexOf(q) !== -1;
      el.hidden = !match;
      if (match) visible++;
    });
    sections.forEach(function (s) {
      var any = !!s.querySelector('.ev-row:not([hidden])');
      s.hidden = !any;
    });
    countEl.textContent = q
      ? visible + (visible === 1 ? ' match' : ' matches')
      : '';
    emptyEl.hidden = !q || visible !== 0;
  }

  searchEl.addEventListener('input', debounce(apply, 60));
  clearBtn.addEventListener('click', function () {
    searchEl.value = '';
    apply();
    searchEl.focus();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchEl.focus();
      searchEl.select();
    }
  });

  apply();
})();
</script>
