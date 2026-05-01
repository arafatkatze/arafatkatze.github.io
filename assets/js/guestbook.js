/* Guestbook — text sibling of /pixels. Persists to pantry.cloud (no account
 * required for visitors; the basket id is shared with the pixel board pantry).
 * Entries are append-only with simple in-page rate-limit & length caps.
 */
(function () {
  'use strict';

  var PANTRY_URL =
    'https://getpantry.cloud/apiv1/pantry/1fe0a904-31b9-467b-9667-7d46e6ab5773/basket/guestbook';

  var MAX_ENTRIES_RENDERED = 200;
  var COOLDOWN_MS = 30 * 1000; // 30 s between submissions per browser
  var STORAGE_LAST = 'gb-last-submit';

  var listEl = document.getElementById('guestbook-list');
  var formEl = document.getElementById('guestbook-form');
  var nameEl = document.getElementById('gb-name');
  var msgEl  = document.getElementById('gb-msg');
  var metaEl = document.getElementById('guestbook-meta');

  if (!listEl || !formEl) return;

  function escape(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtRelative(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' h ago';
    if (diff < 7 * 86400000) return Math.floor(diff / 86400000) + ' d ago';
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function setMeta(text) {
    if (metaEl) metaEl.textContent = text;
  }

  function render(entries) {
    listEl.innerHTML = '';
    var slice = entries.slice(-MAX_ENTRIES_RENDERED).reverse();
    for (var i = 0; i < slice.length; i++) {
      var e = slice[i];
      var li = document.createElement('li');
      li.className = 'guestbook-entry';
      li.innerHTML =
        '<span class="guestbook-entry__msg">' + escape(e.msg) + '</span>' +
        '<span class="guestbook-entry__meta">' +
          '<span class="guestbook-entry__name">' + escape(e.name) + '</span>' +
          '<span class="guestbook-entry__when">' + fmtRelative(e.ts) + '</span>' +
        '</span>';
      listEl.appendChild(li);
    }
    setMeta(entries.length + (entries.length === 1 ? ' entry' : ' entries'));
  }

  function fetchEntries() {
    return fetch(PANTRY_URL, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && Array.isArray(data.entries)) return data.entries;
        return [];
      })
      .catch(function () { return null; });
  }

  function saveEntries(entries) {
    return fetch(PANTRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: entries }),
    });
  }

  // Initial load
  fetchEntries().then(function (entries) {
    if (entries === null) {
      setMeta("couldn't reach the guestbook — try again in a bit");
      return;
    }
    render(entries);
  });

  formEl.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = (nameEl.value || '').trim();
    var msg  = (msgEl.value  || '').trim();
    if (!name || !msg) return;

    var lastTs = parseInt(localStorage.getItem(STORAGE_LAST) || '0', 10);
    if (Date.now() - lastTs < COOLDOWN_MS) {
      setMeta('please wait a moment between entries…');
      return;
    }

    var btn = formEl.querySelector('.guestbook-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Signing…'; }

    fetchEntries().then(function (entries) {
      if (entries === null) entries = [];
      entries.push({ name: name.slice(0, 32), msg: msg.slice(0, 180), ts: Date.now() });
      // Keep the basket bounded
      if (entries.length > 1000) entries = entries.slice(-1000);
      return saveEntries(entries).then(function () {
        localStorage.setItem(STORAGE_LAST, String(Date.now()));
        msgEl.value = '';
        render(entries);
        setMeta('thank you for the line. ' + entries.length + (entries.length === 1 ? ' entry' : ' entries'));
      });
    })
    .catch(function () {
      setMeta("couldn't save — please try again");
    })
    .finally(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Sign \u00a0\u2192'; }
    });
  });
})();
