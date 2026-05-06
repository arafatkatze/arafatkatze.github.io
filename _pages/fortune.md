---
layout: page
title: Fortune
permalink: /fortune/
nav: false
description: A single line, served at random. Bookmark it, return when you need a sentence to land on.
---

<noscript>
  <p class="fortune-noscript">
    The fortune cooks live behind a sliver of JavaScript. If you'd rather just
    read the source, the bookshelf is at <a href="{{ '/reading/' | relative_url }}">/reading</a>.
  </p>
</noscript>

<div class="fortune-frame">
  <blockquote class="fortune" id="fortune">
    <p class="fortune__text" id="fortune-text">&hellip;</p>
    <footer class="fortune__attrib" id="fortune-attrib">
      <span class="fortune__author" id="fortune-author"></span>
      <span class="fortune__source-sep">·</span>
      <span class="fortune__source" id="fortune-source"></span>
    </footer>
  </blockquote>

  <div class="fortune-actions">
    <button type="button" class="fortune-btn" id="fortune-again" aria-label="Get another fortune">
      <span aria-hidden="true">↻</span>&nbsp;again
    </button>
    <a class="fortune-link" id="fortune-share" href="?" aria-label="Permalink to this fortune">
      permalink
    </a>
    <a class="fortune-link" href="{{ '/reading/' | relative_url }}">visit the shelf →</a>
  </div>
</div>

<script>
  (function () {
    'use strict';

    var FORTUNES = [
      {% for f in site.data.fortunes %}{
        text:   {{ f.text   | jsonify }},
        author: {{ f.author | jsonify }},
        source: {{ f.source | jsonify }}
      }{% unless forloop.last %},{% endunless %}{% endfor %}
    ];

    var textEl   = document.getElementById('fortune-text');
    var authorEl = document.getElementById('fortune-author');
    var sourceEl = document.getElementById('fortune-source');
    var btnEl    = document.getElementById('fortune-again');
    var shareEl  = document.getElementById('fortune-share');
    var frameEl  = document.querySelector('.fortune');

    var lastIdx = -1;

    function pick() {
      if (FORTUNES.length === 0) return null;
      if (FORTUNES.length === 1) return 0;
      var i;
      do {
        i = Math.floor(Math.random() * FORTUNES.length);
      } while (i === lastIdx);
      lastIdx = i;
      return i;
    }

    function show(i, animate) {
      var f = FORTUNES[i];
      if (!f) return;
      if (animate) {
        frameEl.classList.remove('fortune--in');
        // force reflow then re-add
        void frameEl.offsetWidth;
      }
      textEl.textContent = '\u201C' + f.text + '\u201D';
      authorEl.textContent = f.author;
      sourceEl.textContent = f.source ? '\u2009' + f.source : '';
      if (shareEl) {
        var url = new URL(location.href);
        url.searchParams.set('q', String(i));
        shareEl.setAttribute('href', url.pathname + url.search);
      }
      if (animate) frameEl.classList.add('fortune--in');
    }

    function showRandom(animate) {
      var i = pick();
      if (i !== null) show(i, animate);
    }

    // Honour ?q=<index> for shareable permalinks
    var qParam = new URLSearchParams(location.search).get('q');
    var initial = qParam !== null ? parseInt(qParam, 10) : NaN;
    if (!isNaN(initial) && initial >= 0 && initial < FORTUNES.length) {
      lastIdx = initial;
      show(initial, false);
    } else {
      showRandom(false);
    }

    btnEl.addEventListener('click', function () { showRandom(true); });
    document.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter' || e.code === 'Space') {
        if (document.activeElement === btnEl) return; // let the button handle
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        showRandom(true);
      }
    });
  })();
</script>
