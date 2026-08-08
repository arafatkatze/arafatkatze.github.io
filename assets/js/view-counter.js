(function () {
  var config = window.__viewCounterConfig;
  if (!config || !config.url) {
    return;
  }

  var SESSION_KEY = "site-view-counted";
  var displayEl = document.getElementById("site-view-counter");

  function formatCount(count) {
    return Number(count).toLocaleString("en-US");
  }

  function updateDisplay(count) {
    if (displayEl) {
      displayEl.textContent = formatCount(count);
    }
  }

  function saveCount(count) {
    return fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: count }),
    });
  }

  function recordView(current) {
    var next = current + 1;
    updateDisplay(next);
    sessionStorage.setItem(SESSION_KEY, "1");
    return saveCount(next).catch(function () {
      updateDisplay(current);
      sessionStorage.removeItem(SESSION_KEY);
    });
  }

  fetch(config.url, { headers: { Accept: "application/json" } })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      var current = Number(data && data.count);
      if (!Number.isFinite(current) || current < config.initial) {
        current = config.initial;
      }

      updateDisplay(current);

      if (sessionStorage.getItem(SESSION_KEY)) {
        return;
      }

      return recordView(current);
    })
    .catch(function () {
      updateDisplay(config.initial);
    });
})();
