---
layout: page
title: Words I underline
permalink: /words-i-underline/
nav: false
description: A commonplace book of quotes from books I've loved. Searchable. Some come with a note from me.
---

{% assign quotes = site.data.underlines %}

{% comment %} Build the unique tag list for the chip bar. {% endcomment %}
{% assign all_tags = "" | split: "" %}
{% for q in quotes %}
  {% if q.tags %}
    {% for t in q.tags %}{% assign all_tags = all_tags | push: t %}{% endfor %}
  {% endif %}
{% endfor %}
{% assign all_tags = all_tags | uniq | sort %}

<div class="wiu-page">

  <p class="wiu-eyebrow">words I underline</p>

  <h1 class="wiu-title">A commonplace book.</h1>

  <p class="wiu-rules">
    Quotes I've underlined, dog-eared, or copied into a paper notebook over the years.
    Mostly pulled from the books on <a href="{{ '/reading/' | relative_url }}">/reading</a>,
    plus a few borrowed classics that have lived in the margins. Type to filter,
    click a tag to narrow. Some come with a single line about why they stuck.
  </p>

  <div class="wiu-controls">
    <label for="wiu-search" class="sr-only">Filter quotes</label>
    <input type="search" id="wiu-search" class="wiu-search"
           placeholder="filter by word, author, or book…" autocomplete="off" />
    <span class="wiu-count" id="wiu-count">{{ quotes.size }} quotes</span>
  </div>

  {% if all_tags.size > 0 %}
    <div class="wiu-tagbar" role="tablist" aria-label="Filter by tag">
      <button type="button" class="wiu-tag wiu-tag--active" data-wiu-tag="" role="tab" aria-selected="true">all</button>
      {% for t in all_tags %}
        <button type="button" class="wiu-tag" data-wiu-tag="{{ t }}" role="tab" aria-selected="false">{{ t }}</button>
      {% endfor %}
    </div>
  {% endif %}

  <ol class="wiu-list" id="wiu-list">
    {% for q in quotes %}
      <li class="wiu-quote"
          data-wiu-text="{{ q.text | downcase | strip | escape }}"
          data-wiu-author="{{ q.author | downcase | strip | escape }}"
          data-wiu-source="{{ q.source | default: '' | downcase | strip | escape }}"
          data-wiu-tags="{{ q.tags | join: ',' }}">
        <blockquote class="wiu-quote__body">{{ q.text }}</blockquote>
        <p class="wiu-quote__attrib">
          <span class="wiu-quote__author">{{ q.author }}</span>
          {% if q.source %}<span class="wiu-quote__sep">·</span><span class="wiu-quote__source">{{ q.source }}</span>{% endif %}
        </p>
        {% if q.why %}
          <p class="wiu-quote__why"><span class="wiu-quote__why-label">why this hit:</span> {{ q.why }}</p>
        {% endif %}
        {% if q.tags and q.tags.size > 0 %}
          <p class="wiu-quote__tags">
            {% for t in q.tags %}<span class="wiu-quote__tag">{{ t }}</span>{% endfor %}
          </p>
        {% endif %}
      </li>
    {% endfor %}
  </ol>

  <p class="wiu-empty" id="wiu-empty" hidden>
    No matches. Try a different word, or <button type="button" class="wiu-link" id="wiu-clear">clear the filter</button>.
  </p>

  <p class="wiu-meta">
    {{ quotes.size }} quotes from {{ all_tags.size }} themes. Curated by hand. New ones get added when something stops me mid-paragraph.
  </p>

</div>

<script>
(function () {
  'use strict';

  var listEl    = document.getElementById('wiu-list');
  var searchEl  = document.getElementById('wiu-search');
  var countEl   = document.getElementById('wiu-count');
  var emptyEl   = document.getElementById('wiu-empty');
  var clearBtn  = document.getElementById('wiu-clear');
  var quotes    = Array.prototype.slice.call(listEl.querySelectorAll('.wiu-quote'));
  var tagBtns   = Array.prototype.slice.call(document.querySelectorAll('[data-wiu-tag]'));

  var activeTag = '';
  var query = '';

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function apply() {
    var q = query.toLowerCase().trim();
    var visible = 0;
    quotes.forEach(function (el) {
      var text = el.getAttribute('data-wiu-text')   || '';
      var auth = el.getAttribute('data-wiu-author') || '';
      var src  = el.getAttribute('data-wiu-source') || '';
      var tags = (el.getAttribute('data-wiu-tags')  || '').split(',');
      var matchQ   = !q || text.indexOf(q) !== -1 || auth.indexOf(q) !== -1 || src.indexOf(q) !== -1;
      var matchTag = !activeTag || tags.indexOf(activeTag) !== -1;
      var show = matchQ && matchTag;
      el.hidden = !show;
      if (show) visible++;
    });
    countEl.textContent = visible + (visible === 1 ? ' quote' : ' quotes');
    emptyEl.hidden = visible !== 0;
  }

  searchEl.addEventListener('input', debounce(function () {
    query = searchEl.value;
    apply();
  }, 80));

  tagBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeTag = btn.getAttribute('data-wiu-tag') || '';
      tagBtns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('wiu-tag--active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      apply();
      // smooth scroll back up so the new view is visible
      document.getElementById('wiu-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  clearBtn.addEventListener('click', function () {
    searchEl.value = '';
    query = '';
    activeTag = '';
    tagBtns.forEach(function (b) {
      var on = !b.getAttribute('data-wiu-tag');
      b.classList.toggle('wiu-tag--active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    apply();
    searchEl.focus();
  });

  // Also: pressing "/" anywhere focuses the search
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchEl.focus();
      searchEl.select();
    }
  });
})();
</script>
