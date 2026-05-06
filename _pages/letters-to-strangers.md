---
layout: page
title: Letters to strangers
permalink: /letters-to-strangers/
nav: false
description: Write one anonymous letter to a stranger. Receive one back from the queue.
---

<div class="lts-page">

  <p class="lts-eyebrow">letters to strangers</p>

  <h1 class="lts-title">Write one. Receive one.</h1>

  <p class="lts-rules">
    A small experiment in human-web kindness. Write a single anonymous letter
    to a person you'll never meet. The moment you send it, you'll receive one
    back from the queue — written by someone else, days or months ago. Be
    kind, be a little brave. No names are stored. Postcrossing for the heart.
  </p>

  <!-- Compose -->
  <section class="lts-compose" id="lts-compose">
    <form id="lts-form" autocomplete="off">
      <textarea id="lts-msg" name="msg" class="lts-textarea"
                maxlength="900" rows="7" required
                placeholder="Dear stranger,&#10;&#10;Write what you wish someone had told you. Or what you've never said out loud. Or just say hi. There's no wrong letter."></textarea>
      <div class="lts-form-actions">
        <span class="lts-counter" id="lts-counter">0 / 900</span>
        <button type="submit" class="lts-submit">Send &nbsp;✉</button>
      </div>
    </form>
    <p class="lts-meta" id="lts-meta">loading queue…</p>
  </section>

  <!-- Exchange (revealed after submit) -->
  <section class="lts-exchange" id="lts-exchange" hidden>
    <p class="lts-ceremony" id="lts-ceremony">your letter is in the world.</p>

    <article class="lts-letter lts-letter--you">
      <header class="lts-letter__head">
        <span class="lts-letter__chip">You wrote</span>
        <span class="lts-letter__date" id="lts-you-date"></span>
      </header>
      <p class="lts-letter__body" id="lts-you-body"></p>
    </article>

    <p class="lts-divider"><span>and in return, the queue handed you</span></p>

    <article class="lts-letter lts-letter--them">
      <header class="lts-letter__head">
        <span class="lts-letter__chip">From a stranger</span>
        <span class="lts-letter__date" id="lts-them-date"></span>
      </header>
      <p class="lts-letter__body" id="lts-them-body"></p>
      <footer class="lts-letter__foot">
        <button type="button" class="lts-link" id="lts-another">give me another →</button>
      </footer>
    </article>

    <p class="lts-after">
      Want to write again? <a href="#lts-compose" id="lts-write-again">go back up</a>.
    </p>
  </section>

  <noscript>
    <p class="lts-noscript">
      The letter exchange needs JavaScript. If you'd rather just say hi the old-fashioned way: <a href="mailto:{{ site.email }}">email me</a>.
    </p>
  </noscript>

</div>

<script>
(function () {
  'use strict';

  var PANTRY_URL =
    'https://getpantry.cloud/apiv1/pantry/1fe0a904-31b9-467b-9667-7d46e6ab5773/basket/letters';

  var COOLDOWN_MS = 5 * 60 * 1000;          // 5 minutes between sends per browser
  var MAX_QUEUE   = 1000;
  var MIN_LEN     = 30;                     // require at least 30 chars
  var STORAGE_LAST = 'lts-last-submit';
  var STORAGE_SEEN = 'lts-seen';            // ids you've already received

  var formEl    = document.getElementById('lts-form');
  var msgEl     = document.getElementById('lts-msg');
  var counterEl = document.getElementById('lts-counter');
  var metaEl    = document.getElementById('lts-meta');
  var composeEl = document.getElementById('lts-compose');
  var exchangeEl = document.getElementById('lts-exchange');
  var ceremonyEl = document.getElementById('lts-ceremony');
  var youBodyEl  = document.getElementById('lts-you-body');
  var youDateEl  = document.getElementById('lts-you-date');
  var themBodyEl = document.getElementById('lts-them-body');
  var themDateEl = document.getElementById('lts-them-date');
  var anotherBtn = document.getElementById('lts-another');

  function escape(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function setMeta(text) { metaEl.textContent = text; }

  function fmtDate(ts) {
    var d = new Date(ts);
    var diff = Date.now() - ts;
    if (diff < 7 * 86400000) {
      var days = Math.floor(diff / 86400000);
      if (days < 1) return 'today';
      if (days === 1) return 'yesterday';
      return days + ' days ago';
    }
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getSeen() {
    try { return JSON.parse(localStorage.getItem(STORAGE_SEEN) || '[]'); }
    catch (e) { return []; }
  }
  function rememberSeen(id) {
    var seen = getSeen();
    if (seen.indexOf(id) === -1) seen.push(id);
    if (seen.length > 200) seen = seen.slice(-200);
    try { localStorage.setItem(STORAGE_SEEN, JSON.stringify(seen)); } catch (e) {}
  }

  function fetchQueue() {
    return fetch(PANTRY_URL, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && Array.isArray(data.letters)) return data.letters;
        return [];
      })
      .catch(function () { return null; });
  }

  function saveQueue(letters) {
    return fetch(PANTRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ letters: letters }),
    });
  }

  function pickStranger(letters, excludeId) {
    var seen = getSeen();
    var pool = letters.filter(function (l) {
      return l.id !== excludeId && seen.indexOf(l.id) === -1;
    });
    // If you've seen everything, allow re-pickup but still exclude your own
    if (pool.length === 0) {
      pool = letters.filter(function (l) { return l.id !== excludeId; });
    }
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function showStranger(letter) {
    if (!letter) {
      themBodyEl.textContent = "The queue is empty right now. You're the first letter — when someone writes back, they'll get yours.";
      themDateEl.textContent = '';
      anotherBtn.style.display = 'none';
      return;
    }
    rememberSeen(letter.id);
    themBodyEl.textContent = letter.msg;
    themDateEl.textContent = 'sent ' + fmtDate(letter.ts);
    anotherBtn.style.display = '';
  }

  // Initial queue size
  fetchQueue().then(function (letters) {
    if (letters === null) {
      setMeta("couldn't reach the queue — try again in a bit");
      return;
    }
    setMeta(letters.length + (letters.length === 1 ? ' letter' : ' letters') + ' in the queue');
  });

  // Live char counter
  msgEl.addEventListener('input', function () {
    var n = msgEl.value.length;
    counterEl.textContent = n + ' / 900';
    counterEl.classList.toggle('lts-counter--full',  n >= 900);
    counterEl.classList.toggle('lts-counter--short', n > 0 && n < MIN_LEN);
  });

  formEl.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var msg = (msgEl.value || '').trim();
    if (msg.length < MIN_LEN) {
      setMeta('please write at least ' + MIN_LEN + ' characters — say something real.');
      msgEl.focus();
      return;
    }

    var lastTs = parseInt(localStorage.getItem(STORAGE_LAST) || '0', 10);
    if (Date.now() - lastTs < COOLDOWN_MS) {
      var minsLeft = Math.ceil((COOLDOWN_MS - (Date.now() - lastTs)) / 60000);
      setMeta('one letter every 5 minutes please. ' + minsLeft + ' min left.');
      return;
    }

    var btn = formEl.querySelector('.lts-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    var myLetter = {
      id: 'l_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
      msg: msg.slice(0, 900),
      ts: Date.now()
    };

    fetchQueue().then(function (letters) {
      if (letters === null) letters = [];
      letters.push(myLetter);
      if (letters.length > MAX_QUEUE) letters = letters.slice(-MAX_QUEUE);
      return saveQueue(letters).then(function () {
        localStorage.setItem(STORAGE_LAST, String(Date.now()));

        // Reveal the exchange
        youBodyEl.textContent = myLetter.msg;
        youDateEl.textContent = 'sent today';
        var stranger = pickStranger(letters, myLetter.id);
        showStranger(stranger);

        composeEl.setAttribute('hidden', '');
        exchangeEl.removeAttribute('hidden');
        // smooth scroll
        exchangeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setMeta(letters.length + (letters.length === 1 ? ' letter' : ' letters') + ' in the queue');
      });
    }).catch(function () {
      setMeta("couldn't send — please try again");
    }).finally(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Send \u00a0\u2709'; }
    });
  });

  anotherBtn.addEventListener('click', function () {
    fetchQueue().then(function (letters) {
      if (letters === null || letters.length === 0) return;
      var myId = null;
      // best-effort: avoid re-showing the user's own letter (find the most-recent matching content)
      for (var i = letters.length - 1; i >= 0; i--) {
        if (letters[i].msg === youBodyEl.textContent) { myId = letters[i].id; break; }
      }
      var s = pickStranger(letters, myId);
      showStranger(s);
    });
  });

  document.getElementById('lts-write-again').addEventListener('click', function (ev) {
    ev.preventDefault();
    exchangeEl.setAttribute('hidden', '');
    composeEl.removeAttribute('hidden');
    msgEl.value = '';
    counterEl.textContent = '0 / 900';
    composeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    msgEl.focus();
  });
})();
</script>
