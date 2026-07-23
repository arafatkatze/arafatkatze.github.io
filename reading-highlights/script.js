/* ============================================================
   The Reading Room — highlights library logic
   ============================================================ */
(function () {
  "use strict";

  // ------- DOM -------
  const $ = (id) => document.getElementById(id);
  const masonry = $("masonry");
  const searchInput = $("search");
  const clearSearch = $("clearSearch");
  const bookSelect = $("bookSelect");
  const sortSelect = $("sortSelect");
  const favToggle = $("favToggle");
  const randomBtn = $("randomBtn");
  const flashBtn = $("flashBtn");
  const catChips = $("catChips");
  const resultCount = $("resultCount");
  const resetFilters = $("resetFilters");
  const emptyState = $("emptyState");
  const emptyReset = $("emptyReset");
  const sentinel = $("sentinel");
  const loadingMore = $("loadingMore");

  // ------- State -------
  let DATA = null;
  let hlText = [];        // lowercased highlight text (for search)
  let bookText = [];      // lowercased "title author" per book (for search)
  const state = {
    q: "",
    cats: new Set(),      // selected category ids
    book: "",             // book id or ""
    favOnly: false,
    sort: "default",
  };
  let filtered = [];      // array of highlight ids after filters
  let rendered = 0;       // how many of `filtered` have been laid out
  const BATCH = 36;
  let colEls = [];
  let colHeights = [];
  let io = null;

  const COLORS = ["", "yellow", "orange", "blue"];

  // ------- Load -------
  showSkeleton();
  loadData()
    .then((d) => { DATA = d; init(); })
    .catch((err) => {
      resultCount.textContent = "Could not load the library.";
      masonry.innerHTML = "";
      console.error(err);
    });

  // Prefer the pre-gzipped payload (small, fast, host-independent) and
  // decompress it in the browser; fall back to plain JSON on older browsers.
  async function loadData() {
    if (typeof DecompressionStream !== "undefined") {
      try {
        const res = await fetch("highlights.json.gz");
        if (res.ok && res.body) {
          const stream = res.body.pipeThrough(new DecompressionStream("gzip"));
          const text = await new Response(stream).text();
          return JSON.parse(text);
        }
      } catch (e) { /* fall through to plain JSON */ }
    }
    const res = await fetch("highlights.json");
    return res.json();
  }

  // Lightweight shimmer placeholders so the page never looks blocked while the
  // library streams in. The hero renders instantly from static HTML.
  function showSkeleton() {
    const cols = columnCount();
    masonry.innerHTML = "";
    const heights = [128, 190, 96, 160, 116, 150, 88, 140, 172];
    for (let c = 0; c < cols; c++) {
      const col = document.createElement("div");
      col.className = "mcol";
      for (let i = 0; i < 4; i++) {
        const sk = document.createElement("div");
        sk.className = "card-skeleton";
        sk.style.height = heights[(c * 4 + i) % heights.length] + "px";
        col.appendChild(sk);
      }
      masonry.appendChild(col);
    }
  }

  function init() {
    // precompute search strings
    hlText = DATA.highlights.map((h) => h[0].toLowerCase());
    bookText = DATA.books.map((b) => (b[0] + " " + (DATA.authors[b[1]] || "")).toLowerCase());

    // stats
    animateNum($("statHighlights"), DATA.highlights.length);
    animateNum($("statBooks"), DATA.books.length);
    animateNum($("statCats"), DATA.categories.length);

    buildCategoryChips();
    buildBookSelect();
    bindEvents();
    apply();

    // deep link: /reading-highlights/#flashcards opens flashcards directly
    if (location.hash === "#flashcards") openFlash();
    window.addEventListener("hashchange", () => {
      if (location.hash === "#flashcards" && $("flash").hidden) openFlash();
    });
  }

  // ------- Category chips (sorted by highlight count desc) -------
  function buildCategoryChips() {
    const order = DATA.categories
      .map((name, id) => ({ id, name, count: DATA.categoryCounts[id] || 0 }))
      .sort((a, b) => b.count - a.count);
    catChips.innerHTML = "";
    order.forEach(({ id, name, count }) => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.dataset.cat = id;
      chip.innerHTML = `${escapeHTML(name)} <span class="chip-count">${count}</span>`;
      chip.addEventListener("click", () => {
        if (state.cats.has(id)) state.cats.delete(id);
        else state.cats.add(id);
        chip.classList.toggle("active");
        apply();
      });
      catChips.appendChild(chip);
    });
  }

  // ------- Book <select> (sorted by highlight count desc) -------
  function buildBookSelect() {
    const counts = new Array(DATA.books.length).fill(0);
    DATA.highlights.forEach((h) => { counts[h[1]]++; });
    const order = DATA.books
      .map((b, id) => ({ id, title: b[0], author: DATA.authors[b[1]] || "", count: counts[id] }))
      .sort((a, b) => b.count - a.count);
    const frag = document.createDocumentFragment();
    order.forEach(({ id, title, author, count }) => {
      const opt = document.createElement("option");
      opt.value = id;
      const label = author ? `${title} — ${author}` : title;
      opt.textContent = `${truncate(label, 60)} (${count})`;
      frag.appendChild(opt);
    });
    bookSelect.appendChild(frag);
  }

  // ------- Events -------
  function bindEvents() {
    searchInput.addEventListener("input", debounce(() => {
      state.q = searchInput.value.trim().toLowerCase();
      clearSearch.classList.toggle("show", state.q.length > 0);
      apply();
    }, 160));

    clearSearch.addEventListener("click", () => {
      searchInput.value = ""; state.q = "";
      clearSearch.classList.remove("show");
      apply(); searchInput.focus();
    });

    bookSelect.addEventListener("change", () => { state.book = bookSelect.value; apply(); });
    sortSelect.addEventListener("change", () => { state.sort = sortSelect.value; apply(); });

    favToggle.addEventListener("click", () => {
      state.favOnly = !state.favOnly;
      favToggle.classList.toggle("active", state.favOnly);
      apply();
    });

    randomBtn.addEventListener("click", () => showRandom());
    flashBtn.addEventListener("click", () => openFlash());
    resetFilters.addEventListener("click", resetAll);
    emptyReset.addEventListener("click", resetAll);

    $("themeToggle").addEventListener("click", toggleTheme);

    // infinite scroll
    io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) renderNextBatch();
    }, { rootMargin: "800px 0px" });
    io.observe(sentinel);

    window.addEventListener("resize", debounce(relayout, 180));

    // spotlight modal
    const spot = $("spotlight");
    spot.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeSpotlight));
    $("spotCopy").addEventListener("click", copySpotlight);
    $("spotAgain").addEventListener("click", () => showRandom());

    // flashcards
    $("flashClose").addEventListener("click", closeFlash);
    $("flashPrev").addEventListener("click", () => flashStep(-1));
    $("flashNext").addEventListener("click", () => flashStep(1));
    $("flashCard").addEventListener("click", () => { if (!swipeJustHappened) flashStep(1); });
    $("flashShuffle").addEventListener("click", flashShuffle);

    // Swipe left/right to move, click/tap to advance. Pointer Events unify
    // touch, mouse and pen and fire reliably even when the gesture begins over
    // the overlaid nav arrows — so swipe works in both directions.
    const fstage = document.querySelector(".flash-stage");
    let psx = 0, psy = 0, pdown = false;
    fstage.addEventListener("pointerdown", (e) => {
      psx = e.clientX; psy = e.clientY; pdown = true;
    });
    fstage.addEventListener("pointerup", (e) => {
      if (!pdown) return;
      pdown = false;
      const dx = e.clientX - psx, dy = e.clientY - psy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        swipeJustHappened = true;
        flashStep(dx < 0 ? 1 : -1);
        setTimeout(() => { swipeJustHappened = false; }, 400);
      }
    });
    fstage.addEventListener("pointercancel", () => { pdown = false; });

    document.addEventListener("keydown", onKey);
  }

  function resetAll() {
    state.q = ""; state.cats.clear(); state.book = ""; state.favOnly = false; state.sort = "default";
    searchInput.value = ""; clearSearch.classList.remove("show");
    bookSelect.value = ""; sortSelect.value = "default";
    favToggle.classList.remove("active");
    catChips.querySelectorAll(".chip.active").forEach((c) => c.classList.remove("active"));
    apply();
  }

  // ------- Filtering -------
  function apply() {
    const q = state.q;
    const hasCats = state.cats.size > 0;
    const book = state.book === "" ? -1 : parseInt(state.book, 10);
    const out = [];
    const H = DATA.highlights;
    for (let i = 0; i < H.length; i++) {
      const h = H[i];
      const bid = h[1];
      if (book !== -1 && bid !== book) continue;
      if (state.favOnly && !h[2]) continue;
      if (hasCats && !state.cats.has(DATA.books[bid][2])) continue;
      if (q) {
        if (hlText[i].indexOf(q) === -1 && bookText[bid].indexOf(q) === -1) continue;
      }
      out.push(i);
    }
    sortFiltered(out);
    filtered = out;
    updateResultBar();
    startRender();
  }

  function sortFiltered(arr) {
    const H = DATA.highlights;
    switch (state.sort) {
      case "az":
        arr.sort((a, b) => H[a][0].localeCompare(H[b][0]));
        break;
      case "long":
        arr.sort((a, b) => H[b][0].length - H[a][0].length);
        break;
      case "short":
        arr.sort((a, b) => H[a][0].length - H[b][0].length);
        break;
      default:
        // "default" keeps CSV order (grouped by book, chronological)
        break;
    }
  }

  function updateResultBar() {
    const n = filtered.length;
    const pieces = [];
    if (state.q) pieces.push(`“${truncate(state.q, 24)}”`);
    if (state.cats.size) pieces.push(catNames());
    if (state.book !== "") pieces.push(truncate(DATA.books[parseInt(state.book, 10)][0], 30));
    if (state.favOnly) pieces.push("favourites");
    const filt = pieces.length ? " · " + pieces.join(" · ") : "";
    resultCount.textContent = `${n.toLocaleString()} highlight${n === 1 ? "" : "s"}${filt}`;
    const anyFilter = state.q || state.cats.size || state.book !== "" || state.favOnly;
    resetFilters.hidden = !anyFilter;
    emptyState.hidden = n !== 0;
    masonry.hidden = n === 0;
  }

  function catNames() {
    return [...state.cats].map((id) => DATA.categories[id]).join(", ");
  }

  // ------- Masonry rendering -------
  function columnCount() {
    const w = masonry.clientWidth || window.innerWidth;
    if (w < 560) return 1;
    if (w < 860) return 2;
    return 3;
  }

  function startRender() {
    masonry.innerHTML = "";
    const cols = columnCount();
    colEls = []; colHeights = [];
    for (let c = 0; c < cols; c++) {
      const col = document.createElement("div");
      col.className = "mcol";
      masonry.appendChild(col);
      colEls.push(col);
      colHeights.push(0);
    }
    rendered = 0;
    renderNextBatch();
  }

  function renderNextBatch() {
    if (!DATA || rendered >= filtered.length) { loadingMore.hidden = true; return; }
    const end = Math.min(rendered + BATCH, filtered.length);
    for (let i = rendered; i < end; i++) {
      const card = buildCard(filtered[i]);
      const c = shortestCol();
      colEls[c].appendChild(card);
      colHeights[c] += card.offsetHeight + 20;
    }
    rendered = end;
    loadingMore.hidden = rendered >= filtered.length;
  }

  function shortestCol() {
    let idx = 0;
    for (let i = 1; i < colHeights.length; i++) if (colHeights[i] < colHeights[idx]) idx = i;
    return idx;
  }

  function relayout() {
    if (columnCount() === colEls.length) return;
    startRender();
  }

  function buildCard(hid) {
    const h = DATA.highlights[hid];
    const b = DATA.books[h[1]];
    const author = DATA.authors[b[1]] || "";
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.color = h[3];

    const quote = document.createElement("p");
    quote.className = "card-quote";
    quote.innerHTML = highlightQuery(h[0], state.q);

    let favMark = "";
    if (h[2]) favMark = `<span class="card-fav" title="Favourite">★</span>`;

    const meta = document.createElement("div");
    meta.className = "card-meta";
    meta.innerHTML =
      `<span class="card-book">${escapeHTML(b[0])}</span>` +
      `<span class="card-byline">` +
        (author ? `<span>${escapeHTML(author)}</span>` : "") +
        `<span class="card-cat">${escapeHTML(DATA.categories[b[2]])}</span>` +
      `</span>`;

    card.innerHTML = favMark;
    card.appendChild(quote);
    card.appendChild(meta);
    card.addEventListener("click", () => openSpotlight(hid));
    return card;
  }

  // ------- Spotlight modal -------
  let spotList = [];
  function openSpotlight(hid) {
    const h = DATA.highlights[hid];
    const b = DATA.books[h[1]];
    const author = DATA.authors[b[1]] || "";
    $("spotQuote").textContent = h[0];
    const noteEl = $("spotNote");
    if (h[4]) { noteEl.textContent = h[4]; noteEl.hidden = false; }
    else noteEl.hidden = true;
    $("spotBook").textContent = b[0];
    $("spotAuthor").textContent = author;
    $("spotCat").textContent = DATA.categories[b[2]];
    $("spotlight").hidden = false;
    document.body.style.overflow = "hidden";
  }
  let lastSpotHid = null;
  function showRandom() {
    reseed();
    const pool = filtered.length ? filtered : DATA.highlights.map((_, i) => i);
    const hid = pickDifferent(pool, lastSpotHid, null);
    lastSpotHid = hid;
    openSpotlight(hid);
  }
  function closeSpotlight() {
    $("spotlight").hidden = true;
    if ($("flash").hidden) document.body.style.overflow = "";
  }
  function copySpotlight() {
    const txt = `“${$("spotQuote").textContent}”\n— ${$("spotBook").textContent}${$("spotAuthor").textContent ? ", " + $("spotAuthor").textContent : ""}`;
    navigator.clipboard.writeText(txt).then(() => {
      const btn = $("spotCopy"); const old = btn.textContent;
      btn.textContent = "✓ Copied"; setTimeout(() => (btn.textContent = old), 1400);
    });
  }

  // ------- Flashcards (truly random, never the same book twice in a row) -------
  // Instead of walking a fixed pre-shuffled deck, every "next" draws a fresh
  // time-seeded random card that avoids the current book (and cards already
  // seen this session, until the pool is exhausted). Prev walks back through
  // the history of what you've actually seen.
  let flashPool = [];
  let flashHist = [];
  let flashPos = 0;
  let flashSeen = new Set();
  let swipeJustHappened = false;

  function openFlash() {
    flashPool = filtered.length ? filtered.slice() : DATA.highlights.map((_, i) => i);
    reseed();
    flashSeen = new Set();
    const first = pickDifferent(flashPool, null, flashSeen);
    flashHist = [first];
    flashSeen.add(first);
    flashPos = 0;
    $("flashTotal").textContent = flashPool.length;
    $("flashScope").textContent = flashScopeLabel();
    $("flash").hidden = false;
    document.body.style.overflow = "hidden";
    showFlash();
  }
  function flashScopeLabel() {
    const parts = [];
    if (state.q) parts.push(`“${truncate(state.q, 20)}”`);
    if (state.cats.size) parts.push(catNames());
    if (state.book !== "") parts.push(truncate(DATA.books[parseInt(state.book, 10)][0], 26));
    if (state.favOnly) parts.push("favourites");
    return (parts.length ? parts.join(" · ") : "whole library") + ` · ${flashPool.length} cards · shuffled`;
  }
  function showFlash() {
    const hid = flashHist[flashPos];
    const h = DATA.highlights[hid];
    $("flashText").textContent = h[0];
    $("flashPos").textContent = Math.min(flashPos + 1, flashPool.length);
  }
  function flashStep(dir) {
    if (dir > 0) {
      if (flashPos < flashHist.length - 1) {
        flashPos++;
      } else {
        const next = pickDifferent(flashPool, flashHist[flashPos], flashSeen);
        flashHist.push(next);
        flashSeen.add(next);
        if (flashSeen.size >= flashPool.length) flashSeen = new Set([next]);
        flashPos++;
      }
    } else if (flashPos > 0) {
      flashPos--;
    }
    showFlash();
  }
  function flashShuffle() {
    reseed();
    flashSeen = new Set();
    const start = pickDifferent(flashPool, flashHist[flashPos], flashSeen);
    flashHist = [start];
    flashSeen.add(start);
    flashPos = 0;
    $("flashScope").textContent = flashScopeLabel();
    showFlash();
  }
  function closeFlash() {
    $("flash").hidden = true;
    if ($("spotlight").hidden) document.body.style.overflow = "";
  }

  // ------- Keyboard -------
  function onKey(e) {
    const flashOpen = !$("flash").hidden;
    const spotOpen = !$("spotlight").hidden;
    if (flashOpen) {
      if (e.key === "ArrowRight") { e.preventDefault(); flashStep(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); flashStep(-1); }
      else if (e.key === " ") { e.preventDefault(); flashStep(1); }
      else if (e.key === "s" || e.key === "S") { flashShuffle(); }
      else if (e.key === "Escape") { closeFlash(); }
      return;
    }
    if (spotOpen) {
      if (e.key === "Escape") closeSpotlight();
      else if (e.key === "r" || e.key === "R") showRandom();
      return;
    }
    if (e.target === searchInput) return;
    if (e.key === "r" || e.key === "R") showRandom();
    else if (e.key === "f" || e.key === "F") openFlash();
    else if (e.key === "/") { e.preventDefault(); searchInput.focus(); }
  }

  // ------- Theme -------
  function toggleTheme() {
    const body = document.body;
    const night = body.dataset.theme === "night";
    body.dataset.theme = night ? "day" : "night";
    $("themeToggle").querySelector(".theme-toggle-icon").textContent = night ? "☾" : "☀";
    try { localStorage.setItem("rr-theme", body.dataset.theme); } catch (e) {}
  }
  try {
    const saved = localStorage.getItem("rr-theme");
    if (saved) {
      document.body.dataset.theme = saved;
      document.addEventListener("DOMContentLoaded", () => {
        const ic = document.querySelector(".theme-toggle-icon");
        if (ic) ic.textContent = saved === "night" ? "☀" : "☾";
      });
    }
  } catch (e) {}

  // ------- Utils -------
  function debounce(fn, ms) {
    let t; return function () { clearTimeout(t); const a = arguments, c = this; t = setTimeout(() => fn.apply(c, a), ms); };
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }
  function highlightQuery(text, q) {
    const safe = escapeHTML(text);
    if (!q) return safe;
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return safe;
    // rebuild with escaping, marking each occurrence
    const lower = text.toLowerCase();
    let res = "", from = 0, pos;
    while ((pos = lower.indexOf(q, from)) !== -1) {
      res += escapeHTML(text.slice(from, pos));
      res += '<mark class="hit">' + escapeHTML(text.slice(pos, pos + q.length)) + "</mark>";
      from = pos + q.length;
    }
    res += escapeHTML(text.slice(from));
    return res;
  }
  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  // Time-seeded RNG (mulberry32). Reseeded from the clock on every shuffle /
  // random draw so the sequence is genuinely different each time.
  let rng = makeRng(seedNow());
  function seedNow() {
    const perf = (typeof performance !== "undefined" && performance.now) ? performance.now() : 0;
    return (((Date.now() >>> 0) ^ (Math.floor(perf * 1000) >>> 0) ^ ((Math.random() * 0xffffffff) >>> 0)) >>> 0);
  }
  function reseed() { rng = makeRng(seedNow()); }
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Draw a random highlight id from `pool` that is NOT `avoidHid` and, whenever
  // possible, is from a different book — and (if a `seen` set is given) one not
  // shown yet this session. Guarantees no back-to-back highlights from the
  // same book unless the pool leaves no other choice.
  function pickDifferent(pool, avoidHid, seen) {
    if (pool.length <= 1) return pool[0];
    const avoidBook = avoidHid == null ? -1 : DATA.highlights[avoidHid][1];
    let diffUnseen = null, diffBook = null, anyDiff = null;
    for (let i = 0; i < 64; i++) {
      const hid = pool[(rng() * pool.length) | 0];
      if (hid === avoidHid) continue;
      if (anyDiff === null) anyDiff = hid;
      if (DATA.highlights[hid][1] !== avoidBook) {
        if (diffBook === null) diffBook = hid;
        if (!seen || !seen.has(hid)) { diffUnseen = hid; break; }
      }
    }
    if (diffUnseen != null) return diffUnseen;
    if (diffBook != null) return diffBook;
    if (anyDiff != null) return anyDiff;
    return pool[(rng() * pool.length) | 0];
  }
  function animateNum(el, target) {
    const dur = 900, start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
})();
