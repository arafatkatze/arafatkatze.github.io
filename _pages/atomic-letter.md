---
layout: page
title: Atomic letter
permalink: /atomic-letter/
nav: false
description: Pick a person, pick a constraint, get a starting line. Write the rest in your head — or on paper, if you're brave.
---

{% assign d = site.data.atomic_letter %}

<div class="al-page">

  <p class="al-eyebrow">atomic letter</p>
  <h1 class="al-title">A starting line for the letter you keep meaning to write.</h1>
  <p class="al-rules">
    Pick a <em>person</em>. Pick a <em>constraint</em>. The page hands you a single
    opening sentence — the hardest part of any real letter. The rest is up to you,
    in your head or on paper. You can roll again. You can leave the rest unwritten;
    sometimes the act of starting is enough.
  </p>

  <!-- Pickers -->
  <section class="al-pickers">

    <div class="al-picker">
      <p class="al-picker__label">to:</p>
      <div class="al-options" id="al-archetypes" role="radiogroup" aria-label="Person archetype">
        {% for a in d.archetypes %}
          <button type="button" class="al-chip" data-al-arch="{{ a.id }}"
                  data-al-label="{{ a.label | escape }}"
                  data-al-you="{{ a.you | escape }}"
                  role="radio" aria-checked="false">{{ a.label }}</button>
        {% endfor %}
      </div>
    </div>

    <div class="al-picker">
      <p class="al-picker__label">constraint:</p>
      <div class="al-options" id="al-constraints" role="radiogroup" aria-label="Constraint">
        {% for c in d.constraints %}
          <button type="button" class="al-chip" data-al-cons="{{ c.id }}"
                  data-al-label="{{ c.label | escape }}"
                  role="radio" aria-checked="false">{{ c.label }}</button>
        {% endfor %}
      </div>
    </div>

  </section>

  <!-- Generator -->
  <section class="al-generator">
    <button type="button" class="al-roll" id="al-roll">give me a starting line ✦</button>
    <p class="al-roll__hint">or press <kbd>space</kbd></p>
  </section>

  <!-- Output card -->
  <section class="al-output" id="al-output" hidden>
    <p class="al-output__meta">
      A letter to <span id="al-out-arch" class="al-output__chip">…</span>
      <span class="al-output__sep">·</span>
      <span id="al-out-cons" class="al-output__chip">…</span>
    </p>
    <blockquote class="al-output__line" id="al-out-line">…</blockquote>
    <p class="al-output__below">
      Now you write the rest. <button type="button" class="al-link" id="al-roll-again">give me another →</button>
    </p>
    <details class="al-output__more">
      <summary>How to use this</summary>
      <ul>
        <li>Open a notebook. Write the line at the top of a fresh page.</li>
        <li>Set a 7-minute timer. Don't edit. Don't lift the pen.</li>
        <li>If you stop, write the line again and keep going.</li>
        <li>You don't have to finish. You don't have to send. You don't have to keep it.</li>
      </ul>
    </details>
  </section>

  <p class="al-meta">
    Inspired by Natalie Goldberg's <em>Writing Down the Bones</em> and Mary Karr's
    insistence that the first sentence is the whole battle. New openers and
    archetypes get added when something good comes through. The pairing is random.
  </p>

</div>

<script>
(function () {
  'use strict';

  var ARCHETYPES = [
    {% for a in d.archetypes %}{ id: {{ a.id | jsonify }}, label: {{ a.label | jsonify }}, vocative: {{ a.vocative | jsonify }} }{% unless forloop.last %},{% endunless %}{% endfor %}
  ];
  var CONSTRAINTS = [
    {% for c in d.constraints %}{ id: {{ c.id | jsonify }}, label: {{ c.label | jsonify }} }{% unless forloop.last %},{% endunless %}{% endfor %}
  ];
  var OPENERS = [
    {% for o in d.openers %}{{ o | jsonify }}{% unless forloop.last %},{% endunless %}{% endfor %}
  ];

  var selectedArch  = null;
  var selectedCons  = null;
  var lastOpenerIdx = -1;

  var outEl     = document.getElementById('al-output');
  var outArchEl = document.getElementById('al-out-arch');
  var outConsEl = document.getElementById('al-out-cons');
  var outLineEl = document.getElementById('al-out-line');
  var rollBtn   = document.getElementById('al-roll');

  function setSelected(group, id, kind) {
    group.querySelectorAll('button.al-chip').forEach(function (b) {
      var active = b.getAttribute(kind) === id;
      b.classList.toggle('al-chip--active', active);
      b.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  }

  function pick(arr, exclude) {
    if (arr.length === 0) return null;
    if (arr.length === 1) return 0;
    var i;
    do { i = Math.floor(Math.random() * arr.length); }
    while (i === exclude);
    return i;
  }

  function findById(arr, id, key) {
    key = key || 'id';
    for (var i = 0; i < arr.length; i++) if (arr[i][key] === id) return arr[i];
    return null;
  }

  function fmtPersonForOpener(arch) {
    // Use the archetype's `vocative` form — phrased to follow "Dear ".
    if (!arch || !arch.vocative) return 'you';
    return arch.vocative;
  }

  function roll() {
    if (!selectedArch) {
      var ai = pick(ARCHETYPES, -1);
      selectedArch = ARCHETYPES[ai].id;
      setSelected(document.getElementById('al-archetypes'), selectedArch, 'data-al-arch');
    }
    if (!selectedCons) {
      var ci = pick(CONSTRAINTS, -1);
      selectedCons = CONSTRAINTS[ci].id;
      setSelected(document.getElementById('al-constraints'), selectedCons, 'data-al-cons');
    }

    var arch = findById(ARCHETYPES, selectedArch);
    var cons = findById(CONSTRAINTS, selectedCons);

    var oi = pick(OPENERS, lastOpenerIdx);
    lastOpenerIdx = oi;
    var template = OPENERS[oi];
    var line = template.replace('{person}', fmtPersonForOpener(arch));

    outArchEl.textContent = arch.label;
    outConsEl.textContent = cons.label;
    outLineEl.textContent = line;
    outEl.removeAttribute('hidden');
    // Subtle re-animate
    outEl.classList.remove('al-output--in');
    void outEl.offsetWidth;
    outEl.classList.add('al-output--in');
    // Smooth scroll
    outEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Wire chip pickers
  document.querySelectorAll('button.al-chip').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.hasAttribute('data-al-arch')) {
        selectedArch = b.getAttribute('data-al-arch');
        setSelected(document.getElementById('al-archetypes'), selectedArch, 'data-al-arch');
      } else if (b.hasAttribute('data-al-cons')) {
        selectedCons = b.getAttribute('data-al-cons');
        setSelected(document.getElementById('al-constraints'), selectedCons, 'data-al-cons');
      }
    });
  });

  rollBtn.addEventListener('click', roll);
  document.getElementById('al-roll-again').addEventListener('click', roll);

  document.addEventListener('keydown', function (e) {
    if (e.key === ' ' &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      roll();
    }
  });
})();
</script>
