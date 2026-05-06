---
layout: page
title: This week
permalink: /this-week/
nav: false
description: One question. Open all week. Answers from anyone who wanders in.
---

{% assign tw = site.data.this_week %}

<div class="tw-page">

  <p class="tw-eyebrow">this week</p>

  <h1 class="tw-question" id="tw-question">
    {% if tw.force_index %}
      {{ tw.questions[tw.force_index] }}
    {% else %}
      {{ tw.questions[0] }}
    {% endif %}
  </h1>

  <p class="tw-rules">
    One sentence. Signed by your name and (optionally) your city. Anyone can read,
    anyone can answer, the board resets when a new question rotates in. Be kind.
  </p>

  <form id="tw-form" class="tw-form" autocomplete="off">
    <div class="tw-form-row">
      <input id="tw-name" name="name" class="tw-input tw-input--name" type="text"
             maxlength="32" placeholder="Name or initials" required />
      <input id="tw-city" name="city" class="tw-input tw-input--city" type="text"
             maxlength="32" placeholder="City (optional)" />
    </div>
    <textarea id="tw-msg" name="msg" class="tw-input tw-input--msg"
              maxlength="200" placeholder="One sentence." required rows="2"></textarea>
    <div class="tw-form-actions">
      <span class="tw-counter" id="tw-counter">0 / 200</span>
      <button type="submit" class="tw-submit">Answer &nbsp;→</button>
    </div>
  </form>

  <p class="tw-meta" id="tw-meta">loading answers…</p>

  <ol class="tw-list" id="tw-list" aria-live="polite"></ol>

  <noscript>
    <p class="tw-noscript">
      The board needs JavaScript to load and submit answers. If you'd rather just say hi the old-fashioned way: <a href="mailto:{{ site.email }}">email me</a>.
    </p>
  </noscript>

  <p class="tw-archive-meta" id="tw-archive-meta"></p>

</div>

<script>
(function () {
  'use strict';

  // --- Question rotation: pick by ISO week so it changes once a week and is
  //     deterministic for everyone. Force a specific index from front matter
  //     by setting `force_index` in _data/this_week.yml.
  var QUESTIONS = [
    {% for q in tw.questions %}{{ q | jsonify }}{% unless forloop.last %},{% endunless %}{% endfor %}
  ];
  var FORCE_INDEX = {{ tw.force_index | default: "null" }};

  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    var dayNum = (t.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    t.setUTCDate(t.getUTCDate() - dayNum + 3); // nearest Thursday
    var firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    var diff = (t - firstThursday) / 86400000;
    return 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  }

  function isoYearWeek(d) {
    var t = new Date(d.getTime());
    var dayNum = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - dayNum + 3);
    return t.getUTCFullYear() + '-W' + String(isoWeek(d)).padStart(2, '0');
  }

  var now = new Date();
  var weekKey = isoYearWeek(now);
  var qIndex = FORCE_INDEX !== null && FORCE_INDEX !== '' && !isNaN(FORCE_INDEX)
    ? FORCE_INDEX
    : (isoWeek(now) % QUESTIONS.length);

  var qEl = document.getElementById('tw-question');
  qEl.textContent = QUESTIONS[qIndex];

  // --- Backend: pantry.cloud basket. Schema: { weekKey, qIndex, answers: [...] }
  var PANTRY_URL =
    'https://getpantry.cloud/apiv1/pantry/1fe0a904-31b9-467b-9667-7d46e6ab5773/basket/thisweek';

  var COOLDOWN_MS = 60 * 1000;
  var STORAGE_LAST = 'tw-last-submit';

  var listEl    = document.getElementById('tw-list');
  var formEl    = document.getElementById('tw-form');
  var nameEl    = document.getElementById('tw-name');
  var cityEl    = document.getElementById('tw-city');
  var msgEl     = document.getElementById('tw-msg');
  var metaEl    = document.getElementById('tw-meta');
  var archiveEl = document.getElementById('tw-archive-meta');
  var counterEl = document.getElementById('tw-counter');

  function escape(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtRelative(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' h ago';
    if (diff < 7 * 86400000) return Math.floor(diff / 86400000) + ' d ago';
    return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  function setMeta(text) { metaEl.textContent = text; }

  function render(answers) {
    listEl.innerHTML = '';
    var slice = (answers || []).slice().reverse();
    slice.forEach(function (a) {
      var li = document.createElement('li');
      li.className = 'tw-answer';
      var who = escape(a.name) + (a.city ? ' <span class="tw-answer__city">' + escape(a.city) + '</span>' : '');
      li.innerHTML =
        '<p class="tw-answer__msg">' + escape(a.msg) + '</p>' +
        '<p class="tw-answer__meta">' +
          '<span class="tw-answer__who">' + who + '</span>' +
          '<span class="tw-answer__when">' + fmtRelative(a.ts) + '</span>' +
        '</p>';
      listEl.appendChild(li);
    });
    setMeta(slice.length === 0
      ? 'no answers yet — go first.'
      : slice.length + (slice.length === 1 ? ' answer' : ' answers'));
  }

  function fetchBasket() {
    return fetch(PANTRY_URL, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.weekKey !== weekKey) {
          // New week — archive note for the curious
          if (data && data.weekKey && Array.isArray(data.answers) && data.answers.length > 0) {
            archiveEl.textContent =
              'Last week (' + data.weekKey + ') had ' + data.answers.length +
              (data.answers.length === 1 ? ' answer' : ' answers') +
              '. The board resets every Monday.';
          }
          return { weekKey: weekKey, qIndex: qIndex, answers: [] };
        }
        return data;
      })
      .catch(function () { return null; });
  }

  function saveBasket(state) {
    return fetch(PANTRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
  }

  // Initial load
  fetchBasket().then(function (state) {
    if (state === null) { setMeta("couldn't reach the board — try again in a bit"); return; }
    render(state.answers || []);
  });

  // Live counter
  msgEl.addEventListener('input', function () {
    counterEl.textContent = msgEl.value.length + ' / 200';
    counterEl.classList.toggle('tw-counter--full', msgEl.value.length >= 200);
  });

  formEl.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = (nameEl.value || '').trim();
    var city = (cityEl.value || '').trim();
    var msg  = (msgEl.value  || '').trim();
    if (!name || !msg) return;

    var lastTs = parseInt(localStorage.getItem(STORAGE_LAST) || '0', 10);
    if (Date.now() - lastTs < COOLDOWN_MS) {
      setMeta('please wait a moment between answers…');
      return;
    }

    var btn = formEl.querySelector('.tw-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Posting…'; }

    fetchBasket().then(function (state) {
      if (state === null) state = { weekKey: weekKey, qIndex: qIndex, answers: [] };
      state.answers.push({
        name: name.slice(0, 32),
        city: city.slice(0, 32),
        msg:  msg.slice(0, 200),
        ts:   Date.now()
      });
      if (state.answers.length > 500) state.answers = state.answers.slice(-500);
      state.weekKey = weekKey;
      state.qIndex  = qIndex;
      return saveBasket(state).then(function () {
        localStorage.setItem(STORAGE_LAST, String(Date.now()));
        msgEl.value = '';
        counterEl.textContent = '0 / 200';
        render(state.answers);
        setMeta('thank you for the line. ' + state.answers.length +
          (state.answers.length === 1 ? ' answer' : ' answers'));
      });
    })
    .catch(function () { setMeta("couldn't save — please try again"); })
    .finally(function () { if (btn) { btn.disabled = false; btn.textContent = 'Answer \u00a0\u2192'; } });
  });
})();
</script>
