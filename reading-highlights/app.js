const PAGE_SIZE = 40;
const state = {
  items: [],
  meta: null,
  filtered: [],
  mode: "browse",
  query: "",
  book: "",
  category: "",
  favoritesOnly: false,
  rendered: 0,
  focusIndex: 0,
  deck: [],
  deckIndex: 0,
  flashFlipped: false,
};

const els = {
  heroMeta: document.getElementById("heroMeta"),
  searchInput: document.getElementById("searchInput"),
  bookFilter: document.getElementById("bookFilter"),
  categoryFilter: document.getElementById("categoryFilter"),
  favoritesOnly: document.getElementById("favoritesOnly"),
  randomBtn: document.getElementById("randomBtn"),
  clearFilters: document.getElementById("clearFilters"),
  resultCount: document.getElementById("resultCount"),
  modeHint: document.getElementById("modeHint"),
  highlightList: document.getElementById("highlightList"),
  loadMoreWrap: document.getElementById("loadMoreWrap"),
  loadMoreBtn: document.getElementById("loadMoreBtn"),
  emptyState: document.getElementById("emptyState"),
  browseView: document.getElementById("browseView"),
  focusView: document.getElementById("focusView"),
  flashView: document.getElementById("flashView"),
  focusCard: document.getElementById("focusCard"),
  focusQuote: document.getElementById("focusQuote"),
  focusBook: document.getElementById("focusBook"),
  focusAuthor: document.getElementById("focusAuthor"),
  focusCats: document.getElementById("focusCats"),
  focusPrev: document.getElementById("focusPrev"),
  focusNext: document.getElementById("focusNext"),
  focusRandom: document.getElementById("focusRandom"),
  flashCard: document.getElementById("flashCard"),
  flashText: document.getElementById("flashText"),
  flashBook: document.getElementById("flashBook"),
  flashAuthor: document.getElementById("flashAuthor"),
  flashCats: document.getElementById("flashCats"),
  flashNext: document.getElementById("flashNext"),
  flashShuffle: document.getElementById("flashShuffle"),
  flashProgress: document.getElementById("flashProgress"),
  modeBtns: [...document.querySelectorAll(".mode-btn")],
  heroFlashcards: document.getElementById("heroFlashcards"),
  heroRandom: document.getElementById("heroRandom"),
};

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatNumber(n) {
  return n.toLocaleString("en-US");
}

function shortBook(title, max = 72) {
  if (!title) return "Untitled";
  return title.length > max ? `${title.slice(0, max - 1)}…` : title;
}

function populateFilters() {
  const { books, categories } = state.meta;

  const bookFrag = document.createDocumentFragment();
  for (const book of books) {
    const opt = document.createElement("option");
    opt.value = book.n;
    opt.textContent = `${shortBook(book.n, 60)} (${book.c})`;
    bookFrag.appendChild(opt);
  }
  els.bookFilter.appendChild(bookFrag);

  const catFrag = document.createDocumentFragment();
  for (const cat of categories) {
    const opt = document.createElement("option");
    opt.value = cat.n;
    opt.textContent = `${cat.n} (${cat.c})`;
    catFrag.appendChild(opt);
  }
  els.categoryFilter.appendChild(catFrag);
}

function applyFilters() {
  const q = state.query.trim().toLowerCase();
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

  state.filtered = state.items.filter((item) => {
    if (state.favoritesOnly && !item.f) return false;
    if (state.book && item.b !== state.book) return false;
    if (state.category) {
      const cats = item.c || [];
      if (!cats.includes(state.category)) return false;
    }
    if (!tokens.length) return true;

    const hay = `${item.h} ${item.b} ${item.a} ${(item.c || []).join(" ")} ${item.n || ""}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });

  state.rendered = 0;
  state.focusIndex = 0;
  els.clearFilters.hidden = !(state.query || state.book || state.category || state.favoritesOnly);
  updateResultCount();

  if (state.mode === "browse") {
    renderBrowse(true);
  } else if (state.mode === "focus") {
    renderFocus();
  } else {
    buildDeck(true);
    renderFlash();
  }
}

function updateResultCount() {
  const n = state.filtered.length;
  const total = state.items.length;
  let label = `${formatNumber(n)} highlight${n === 1 ? "" : "s"}`;
  if (n !== total) label += ` of ${formatNumber(total)}`;
  if (state.favoritesOnly) label += " · favorites";
  els.resultCount.textContent = label;
}

function renderBrowse(reset = false) {
  if (reset) els.highlightList.innerHTML = "";

  const n = state.filtered.length;
  els.emptyState.hidden = n > 0;

  if (!n) {
    els.loadMoreWrap.hidden = true;
    return;
  }

  const next = state.filtered.slice(state.rendered, state.rendered + PAGE_SIZE);
  const frag = document.createDocumentFragment();

  next.forEach((item, i) => {
    const el = document.createElement("article");
    el.className = `hl${item.f ? " is-fav" : ""}`;
    el.style.animationDelay = `${Math.min(i, 12) * 28}ms`;
    el.innerHTML = `
      <span class="hl-mark" aria-hidden="true"></span>
      <p class="hl-quote">${escapeHtml(item.h)}</p>
      <div class="hl-meta">
        <span class="hl-book">${escapeHtml(shortBook(item.b))}</span>
        ${item.a ? `<span class="hl-author">${escapeHtml(item.a)}</span>` : ""}
        ${item.f ? `<span class="hl-fav">Favorite</span>` : ""}
        ${(item.c || []).length ? `<span class="hl-cats">${(item.c || []).map((c) => `<span class="hl-cat">${escapeHtml(c)}</span>`).join("")}</span>` : ""}
      </div>
      ${item.n ? `<p class="hl-note">${escapeHtml(item.n)}</p>` : ""}
    `;
    el.addEventListener("click", () => {
      const idx = state.filtered.indexOf(item);
      if (idx >= 0) {
        state.focusIndex = idx;
        setMode("focus");
      }
    });
    frag.appendChild(el);
  });

  els.highlightList.appendChild(frag);
  state.rendered += next.length;
  els.loadMoreWrap.hidden = state.rendered >= n;
}

function renderFocus() {
  const list = state.filtered;
  if (!list.length) {
    els.focusQuote.textContent = "No highlights match these filters.";
    els.focusBook.textContent = "";
    els.focusAuthor.textContent = "";
    els.focusCats.textContent = "";
    return;
  }

  if (state.focusIndex >= list.length) state.focusIndex = 0;
  if (state.focusIndex < 0) state.focusIndex = list.length - 1;

  const item = list[state.focusIndex];
  const card = els.focusCard;
  card.classList.remove("is-reshuffling");
  void card.offsetWidth;
  card.classList.add("is-reshuffling");

  els.focusQuote.textContent = item.h;
  els.focusBook.textContent = item.b || "Untitled";
  els.focusAuthor.textContent = item.a ? `— ${item.a}` : "";
  els.focusCats.textContent = [
    item.f ? "Favorite" : "",
    ...(item.c || []),
    `${state.focusIndex + 1} / ${list.length}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(reshuffle = false) {
  if (reshuffle || !state.deck.length) {
    state.deck = shuffle(state.filtered);
    state.deckIndex = 0;
  }
  state.flashFlipped = false;
  els.flashCard.classList.remove("is-flipped");
}

function renderFlash() {
  if (!state.deck.length) {
    els.flashText.textContent = "No highlights match these filters.";
    els.flashBook.textContent = "";
    els.flashAuthor.textContent = "";
    els.flashCats.textContent = "";
    els.flashProgress.textContent = "Empty deck";
    return;
  }

  if (state.deckIndex >= state.deck.length) state.deckIndex = 0;
  const item = state.deck[state.deckIndex];
  els.flashText.textContent = item.h;
  els.flashBook.textContent = item.b || "Untitled";
  els.flashAuthor.textContent = item.a ? `— ${item.a}` : "";
  els.flashCats.textContent = [item.f ? "Favorite" : "", ...(item.c || [])]
    .filter(Boolean)
    .join(" · ");
  els.flashProgress.textContent = `Card ${state.deckIndex + 1} of ${formatNumber(state.deck.length)}`;
  state.flashFlipped = false;
  els.flashCard.classList.remove("is-flipped");
}

function setMode(mode) {
  state.mode = mode;
  els.modeBtns.forEach((btn) => {
    const active = btn.dataset.mode === mode;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });

  els.browseView.hidden = mode !== "browse";
  els.focusView.hidden = mode !== "focus";
  els.flashView.hidden = mode !== "flashcards";

  if (mode === "browse") {
    els.modeHint.textContent = "Scroll the collection, or open Focus for one passage at a time.";
    if (!els.highlightList.children.length) renderBrowse(true);
  } else if (mode === "focus") {
    els.modeHint.textContent = "One passage, full attention. Shuffle to wander.";
    renderFocus();
  } else {
    els.modeHint.textContent = "Flip for the source. Next draws another card from the filtered deck.";
    buildDeck(true);
    renderFlash();
  }
}

function goRandom() {
  if (!state.filtered.length) return;
  const idx = Math.floor(Math.random() * state.filtered.length);
  state.focusIndex = idx;
  setMode("focus");
  document.getElementById("library").scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearFilters() {
  state.query = "";
  state.book = "";
  state.category = "";
  state.favoritesOnly = false;
  els.searchInput.value = "";
  els.bookFilter.value = "";
  els.categoryFilter.value = "";
  els.favoritesOnly.checked = false;
  applyFilters();
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function wireEvents() {
  const onSearch = debounce(() => {
    state.query = els.searchInput.value;
    applyFilters();
  }, 160);

  els.searchInput.addEventListener("input", onSearch);

  els.bookFilter.addEventListener("change", () => {
    state.book = els.bookFilter.value;
    applyFilters();
  });

  els.categoryFilter.addEventListener("change", () => {
    state.category = els.categoryFilter.value;
    applyFilters();
  });

  els.favoritesOnly.addEventListener("change", () => {
    state.favoritesOnly = els.favoritesOnly.checked;
    applyFilters();
  });

  els.randomBtn.addEventListener("click", goRandom);
  els.clearFilters.addEventListener("click", clearFilters);
  els.loadMoreBtn.addEventListener("click", () => renderBrowse(false));

  els.modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  els.focusPrev.addEventListener("click", () => {
    state.focusIndex -= 1;
    renderFocus();
  });
  els.focusNext.addEventListener("click", () => {
    state.focusIndex += 1;
    renderFocus();
  });
  els.focusRandom.addEventListener("click", () => {
    if (!state.filtered.length) return;
    state.focusIndex = Math.floor(Math.random() * state.filtered.length);
    renderFocus();
  });

  els.flashCard.addEventListener("click", () => {
    state.flashFlipped = !state.flashFlipped;
    els.flashCard.classList.toggle("is-flipped", state.flashFlipped);
  });

  els.flashNext.addEventListener("click", () => {
    if (!state.deck.length) return;
    state.deckIndex = (state.deckIndex + 1) % state.deck.length;
    renderFlash();
  });

  els.flashShuffle.addEventListener("click", () => {
    buildDeck(true);
    renderFlash();
  });

  els.heroFlashcards.addEventListener("click", () => {
    setMode("flashcards");
    document.getElementById("library").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  els.heroRandom.addEventListener("click", goRandom);

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, select, textarea")) return;

    if (state.mode === "focus") {
      if (e.key === "ArrowRight" || e.key === "j") {
        state.focusIndex += 1;
        renderFocus();
      } else if (e.key === "ArrowLeft" || e.key === "k") {
        state.focusIndex -= 1;
        renderFocus();
      } else if (e.key === "r") {
        els.focusRandom.click();
      }
    } else if (state.mode === "flashcards") {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        els.flashCard.click();
      } else if (e.key === "ArrowRight" || e.key === "j") {
        els.flashNext.click();
      } else if (e.key === "r") {
        els.flashShuffle.click();
      }
    }
  });
}

async function init() {
  wireEvents();

  try {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error(`Failed to load data (${res.status})`);
    const data = await res.json();
    state.items = data.items;
    state.meta = data.meta;

    els.heroMeta.textContent = `${formatNumber(state.meta.total)} highlights · ${formatNumber(state.meta.books.length)} books · ${formatNumber(state.meta.favorites)} favorites`;
    populateFilters();
    applyFilters();
  } catch (err) {
    console.error(err);
    els.heroMeta.textContent = "Could not load highlights.";
    els.resultCount.textContent = "Failed to load data.json";
  }
}

init();
