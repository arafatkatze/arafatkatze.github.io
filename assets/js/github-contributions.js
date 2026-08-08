/**
 * Renders a GitHub-style contribution heatmap for the trailing twelve months.
 *
 * Each graph paints twice: first from the snapshot committed to this repo (so
 * something is on screen immediately, even offline), then from GitHub's live
 * numbers when they are reachable. Live responses are cached in localStorage so
 * repeat visits do not re-fetch on every page load.
 */
(function () {
  "use strict";

  if (window.__githubContributionsLoaded) return;
  window.__githubContributionsLoaded = true;

  var LIVE_ENDPOINT = "https://github-contributions-api.jogruber.de/v4/";
  var LIVE_CACHE_TTL = 6 * 60 * 60 * 1000;
  var DAY_MS = 24 * 60 * 60 * 1000;
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function toDate(iso) {
    return new Date(iso + "T00:00:00Z");
  }

  function toISO(date) {
    return date.toISOString().slice(0, 10);
  }

  function addDays(date, days) {
    return new Date(date.getTime() + days * DAY_MS);
  }

  function formatDay(date) {
    return WEEKDAYS[date.getUTCDay()] + ", " + MONTHS[date.getUTCMonth()] + " " + date.getUTCDate() + ", " + date.getUTCFullYear();
  }

  function formatShort(date) {
    return MONTHS[date.getUTCMonth()] + " " + date.getUTCDate() + ", " + date.getUTCFullYear();
  }

  function formatNumber(value) {
    return value.toLocaleString("en-US");
  }

  function plural(value, word) {
    return value + " " + word + (value === 1 ? "" : "s");
  }

  /** GitHub-style bucket edges: quartiles across the days with any activity. */
  function thresholds(counts) {
    var active = counts
      .filter(function (count) {
        return count > 0;
      })
      .sort(function (a, b) {
        return a - b;
      });
    if (!active.length) return [1, 2, 3];
    function percentile(fraction) {
      return active[Math.min(Math.round(fraction * (active.length - 1)), active.length - 1)];
    }
    var edges = [percentile(0.25), percentile(0.5), percentile(0.75)];
    for (var i = 1; i < edges.length; i++) {
      edges[i] = Math.max(edges[i], edges[i - 1] + 1);
    }
    return edges;
  }

  function levelFor(count, edges) {
    if (count <= 0) return 0;
    if (count <= edges[0]) return 1;
    if (count <= edges[1]) return 2;
    if (count <= edges[2]) return 3;
    return 4;
  }

  function streaks(counts) {
    var longest = 0;
    var running = 0;
    for (var i = 0; i < counts.length; i++) {
      running = counts[i] > 0 ? running + 1 : 0;
      if (running > longest) longest = running;
    }
    // Today may not have any activity yet, so it does not break the streak.
    var current = 0;
    for (var j = counts.length - 1; j >= 0; j--) {
      if (counts[j] > 0) current++;
      else if (j !== counts.length - 1) break;
    }
    return { longest: longest, current: current };
  }

  function normalize(payload) {
    if (!payload || !Array.isArray(payload.counts) || !payload.counts.length || !payload.start_date) {
      return null;
    }
    var counts = payload.counts.map(function (count) {
      return typeof count === "number" && count > 0 ? count : 0;
    });
    var start = toDate(payload.start_date);
    return {
      start: start,
      end: addDays(start, counts.length - 1),
      counts: counts,
      total: counts.reduce(function (sum, count) {
        return sum + count;
      }, 0),
      updatedAt: payload.updated_at || null,
    };
  }

  /** Converts the live API payload into the same shape as the snapshot file. */
  function fromLivePayload(payload) {
    if (!payload || !Array.isArray(payload.contributions) || payload.contributions.length < 300) {
      return null;
    }
    var days = payload.contributions
      .filter(function (day) {
        return day && typeof day.date === "string";
      })
      .sort(function (a, b) {
        return a.date < b.date ? -1 : 1;
      });
    if (!days.length) return null;

    var today = toISO(new Date());
    var byDate = {};
    days.forEach(function (day) {
      if (day.date <= today) byDate[day.date] = day.count || 0;
    });

    var dates = Object.keys(byDate).sort();
    if (dates.length < 300) return null;

    var start = toDate(dates[0]);
    var end = toDate(dates[dates.length - 1]);
    var span = Math.round((end - start) / DAY_MS) + 1;
    var counts = [];
    for (var i = 0; i < span; i++) {
      counts.push(byDate[toISO(addDays(start, i))] || 0);
    }
    return { counts: counts, start_date: dates[0], updated_at: new Date().toISOString() };
  }

  function readCache(key) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (!entry || Date.now() - entry.ts > LIVE_CACHE_TTL) return null;
      return entry.data;
    } catch (error) {
      return null;
    }
  }

  function writeCache(key, data) {
    try {
      window.localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: data }));
    } catch (error) {
      /* storage disabled or full — the graph still works */
    }
  }

  function noData() {
    return false;
  }

  function fetchJSON(url) {
    return fetch(url, { credentials: "omit" }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function buildMonthLabels(start, offset, weeks) {
    var labels = element("div", "contrib-graph__months");
    var lastMonth = -1;
    for (var week = 0; week < weeks; week++) {
      var dayIndex = week * 7 - offset;
      var date = addDays(start, Math.max(dayIndex, 0));
      var month = date.getUTCMonth();
      if (month === lastMonth) continue;
      lastMonth = month;
      // Skip a label that would be clipped against the right edge.
      if (week > weeks - 3) continue;
      var label = element("span", "contrib-graph__month", MONTHS[month]);
      label.style.gridColumn = week + 1 + " / span 4";
      labels.appendChild(label);
    }
    return labels;
  }

  function buildWeekdayLabels() {
    var column = element("div", "contrib-graph__weekdays");
    [1, 3, 5].forEach(function (day) {
      var label = element("span", "contrib-graph__weekday", WEEKDAYS[day]);
      label.style.gridRow = day + 1;
      column.appendChild(label);
    });
    return column;
  }

  function buildCells(data, offset, weeks) {
    var edges = thresholds(data.counts);
    var grid = element("div", "contrib-graph__cells");
    grid.style.setProperty("--contrib-weeks", weeks);

    for (var week = 0; week < weeks; week++) {
      for (var weekday = 0; weekday < 7; weekday++) {
        var index = week * 7 + weekday - offset;
        var cell = element("div", "contrib-graph__cell");
        if (index < 0 || index >= data.counts.length) {
          cell.classList.add("is-empty");
        } else {
          var count = data.counts[index];
          var date = addDays(data.start, index);
          cell.setAttribute("data-level", levelFor(count, edges));
          cell.setAttribute("data-label", (count === 0 ? "No contributions" : plural(count, "contribution")) + " on " + formatDay(date));
        }
        grid.appendChild(cell);
      }
    }
    return grid;
  }

  function buildLegend() {
    var legend = element("div", "contrib-graph__legend");
    legend.appendChild(element("span", "contrib-graph__legend-text", "Less"));
    for (var level = 0; level <= 4; level++) {
      var swatch = element("span", "contrib-graph__cell contrib-graph__cell--legend");
      swatch.setAttribute("data-level", level);
      legend.appendChild(swatch);
    }
    legend.appendChild(element("span", "contrib-graph__legend-text", "More"));
    return legend;
  }

  function attachTooltip(host, plot) {
    var tooltip = element("div", "contrib-graph__tooltip");
    tooltip.setAttribute("aria-hidden", "true");
    host.appendChild(tooltip);

    function hide() {
      tooltip.classList.remove("is-visible");
    }

    function show(cell) {
      var label = cell.getAttribute("data-label");
      if (!label) return hide();
      tooltip.textContent = label;
      tooltip.classList.add("is-visible");

      var cellBox = cell.getBoundingClientRect();
      var hostBox = host.getBoundingClientRect();
      var half = tooltip.offsetWidth / 2;
      var left = cellBox.left - hostBox.left + cellBox.width / 2;
      left = Math.max(half + 4, Math.min(left, hostBox.width - half - 4));
      tooltip.style.left = left + "px";
      tooltip.style.top = cellBox.top - hostBox.top + "px";
    }

    plot.addEventListener("mouseover", function (event) {
      var cell = event.target.closest(".contrib-graph__cell");
      if (cell && cell.getAttribute("data-label")) show(cell);
    });
    plot.addEventListener("mouseleave", hide);
    plot.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("scroll", hide, { passive: true });
  }

  function render(host, data) {
    var offset = data.start.getUTCDay();
    var weeks = Math.ceil((offset + data.counts.length) / 7);
    var stats = streaks(data.counts);

    var scroll = element("div", "contrib-graph__scroll");
    var canvas = element("div", "contrib-graph__canvas");
    canvas.style.setProperty("--contrib-weeks", weeks);
    canvas.appendChild(buildMonthLabels(data.start, offset, weeks));
    canvas.appendChild(buildWeekdayLabels());
    canvas.appendChild(buildCells(data, offset, weeks));
    scroll.appendChild(canvas);

    var summary = formatNumber(data.total) + " contributions from " + formatShort(data.start) + " to " + formatShort(data.end);

    var footer = element("div", "contrib-graph__footer");
    var caption = element("p", "contrib-graph__caption");
    caption.appendChild(element("span", "contrib-graph__total", formatNumber(data.total) + " contributions"));
    caption.appendChild(
      element(
        "span",
        null,
        " in the last year · Longest streak " + plural(stats.longest, "day") + " · Current streak " + plural(stats.current, "day")
      )
    );
    footer.appendChild(caption);
    footer.appendChild(buildLegend());

    var body = host.querySelector(".contrib-graph__body");
    body.innerHTML = "";
    body.setAttribute("role", "img");
    body.setAttribute("aria-label", "GitHub contribution graph: " + summary);
    body.appendChild(scroll);
    body.appendChild(footer);

    attachTooltip(host, scroll);
    // Open on the most recent weeks when the graph is wider than the viewport.
    scroll.scrollLeft = scroll.scrollWidth;
    host.classList.add("is-ready");
    host.setAttribute("data-end-date", toISO(data.end));
  }

  function setStatus(host, message) {
    var body = host.querySelector(".contrib-graph__body");
    if (!body) return;
    body.innerHTML = "";
    body.appendChild(element("p", "contrib-graph__status", message));
  }

  function init(host) {
    var user = host.getAttribute("data-user");
    var snapshotURL = host.getAttribute("data-snapshot");
    var useLive = host.getAttribute("data-live") !== "false";
    var cacheKey = "gh_contributions_" + user;
    var rendered = null;

    /**
     * Paints unless something at least as fresh is already on screen. Live data
     * outranks the committed snapshot when both end on the same day, since the
     * snapshot cannot know about today's activity.
     */
    function paint(payload, rank) {
      var data = normalize(payload);
      if (!data) return false;
      var end = toISO(data.end);
      if (rendered && (end < rendered.end || (end === rendered.end && rank <= rendered.rank))) {
        return true;
      }
      render(host, data);
      rendered = { end: end, rank: rank };
      return true;
    }

    var cached = useLive ? readCache(cacheKey) : null;
    if (cached) paint(cached, 1);

    var snapshot = snapshotURL
      ? fetchJSON(snapshotURL).then(function (payload) {
          return paint(payload, 0);
        }, noData)
      : Promise.resolve(false);

    var live =
      useLive && user && !cached
        ? fetchJSON(LIVE_ENDPOINT + encodeURIComponent(user) + "?y=last").then(function (payload) {
            var converted = fromLivePayload(payload);
            if (!converted) return false;
            writeCache(cacheKey, converted);
            return paint(converted, 1);
          }, noData)
        : Promise.resolve(false);

    Promise.all([snapshot, live]).then(function () {
      if (!rendered) {
        setStatus(host, "Contribution activity is unavailable right now — view it on GitHub instead.");
      }
    });
  }

  function boot() {
    document.querySelectorAll("[data-github-contributions]").forEach(init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
