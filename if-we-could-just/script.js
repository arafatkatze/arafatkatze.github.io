const PAPERS = ["img/paper-1.png", "img/paper-2.png", "img/paper-3.png"];

// Choices + phrases live in sequences.txt (easy to edit). Loaded at runtime.
let SEQUENCES = {};
let OPTION_ORDER = [];
let DEFAULT_VALUE = "";

// cool, noisy gradient palette borrowed from the reference pages
const SEQ_GRADIENTS = [
  "linear-gradient(160deg, #cfe6ff 0%, #b9d4ff 45%, #cfc2f0 100%)",
  "linear-gradient(160deg, #c7d8ff 0%, #c3b7ef 50%, #d9b9e6 100%)",
  "linear-gradient(160deg, #d7c4ef 0%, #c9aee0 50%, #e0a9d2 100%)",
  "linear-gradient(160deg, #e3b6dd 0%, #d7a7d8 45%, #b6c0ef 100%)",
  "linear-gradient(160deg, #bfe0d8 0%, #b9d4ef 55%, #c8c0ee 100%)",
];

const intro = document.getElementById("intro");
const seq = document.getElementById("seq");
const seqBg = document.getElementById("seqBg");
const seqGrain = seq.querySelector(".seq-grain");
const rings = document.getElementById("rings");
const seqLine = document.getElementById("seqLine");
const finale = document.getElementById("finale");

const select = document.getElementById("select");
const selectBox = document.getElementById("selectBox");
const selectValue = document.getElementById("selectValue");
const menu = document.getElementById("menu");
let options = []; // <li> elements, built from sequences.txt
const nextBtn = document.getElementById("next");
const bgEl = document.getElementById("bg");

// boil filters whose displacement we ramp up as the sequence deepens
const dispMaps = Array.from(
  document.querySelectorAll("#boil0 feDisplacementMap, #boil1 feDisplacementMap, #boil2 feDisplacementMap")
);
const baseScales = dispMaps.map(function (m) {
  return parseFloat(m.getAttribute("scale"));
});

let selectedValue = "";

let inSequence = false;
let inFinale = false;
let currentList = [];
let seqIndex = 0;

function isLoveYou(s) {
  return s.trim().toLowerCase() === "love you";
}

// ---------- intro dropdown ----------
function setSelected(value) {
  selectedValue = value;
  selectValue.textContent = value;
  options.forEach(function (li) {
    li.classList.toggle("selected", li.dataset.value === value);
  });
}

function openMenu() {
  menu.hidden = false;
  select.classList.add("open");
  selectBox.setAttribute("aria-expanded", "true");
}

function closeMenu() {
  menu.hidden = true;
  select.classList.remove("open");
  selectBox.setAttribute("aria-expanded", "false");
}

selectBox.addEventListener("click", function (e) {
  e.stopPropagation();
  if (menu.hidden) openMenu();
  else closeMenu();
});

// ---------- load choices + phrases from sequences.txt ----------
function parseSequences(text) {
  const seq = {};
  const order = [];
  let def = null;
  let current = null;
  text.split(/\r?\n/).forEach(function (raw) {
    const line = raw.trim();
    if (!line || line.charAt(0) === "#") return;
    const header = line.match(/^\[(.+)\]$/);
    if (header) {
      let name = header[1].trim();
      if (name.charAt(0) === "*") {
        name = name.slice(1).trim();
        def = name;
      }
      current = name;
      seq[name] = [];
      order.push(name);
    } else if (current) {
      seq[current].push(line);
    }
  });
  return { seq: seq, order: order, def: def || order[0] };
}

function buildOptions() {
  menu.innerHTML = "";
  options = OPTION_ORDER.map(function (name) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.dataset.value = name;
    li.textContent = name;
    li.addEventListener("click", function (e) {
      e.stopPropagation();
      setSelected(name);
      closeMenu();
    });
    menu.appendChild(li);
    return li;
  });
}

function loadSequences() {
  fetch("sequences.txt", { cache: "no-cache" })
    .then(function (res) {
      return res.text();
    })
    .then(function (text) {
      const parsed = parseSequences(text);
      SEQUENCES = parsed.seq;
      OPTION_ORDER = parsed.order;
      DEFAULT_VALUE = parsed.def;
      buildOptions();
      if (DEFAULT_VALUE) setSelected(DEFAULT_VALUE);
    })
    .catch(function (err) {
      console.error("Could not load sequences.txt:", err);
      selectValue.textContent = "(couldn't load sequences.txt)";
    });
}

nextBtn.addEventListener("click", function (e) {
  e.stopPropagation();
  startSequence();
});

// ---------- global advance ----------
document.addEventListener("click", function () {
  if (inFinale) return; // panels handle their own clicks
  if (inSequence) {
    advanceSeq();
    return;
  }
  if (!menu.hidden) closeMenu();
});

document.addEventListener("keydown", function (e) {
  if (inFinale) return;
  if (inSequence) {
    if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
      e.preventDefault();
      advanceSeq();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      backSeq();
    }
    return;
  }
  if (e.key === "Escape") closeMenu();
});

// ---------- the framed sequence ----------
function startSequence() {
  currentList = SEQUENCES[selectedValue] || [];
  if (!currentList.length) return;
  seqIndex = 0;
  inSequence = true;
  intro.hidden = true;
  seq.hidden = false;
  seq.setAttribute("aria-hidden", "false");
  renderSeq();
}

function buildRings(stage) {
  // each advance adds more concentric squares, but they stay packed as a band
  // near the edges so they never crowd the centred text.
  rings.innerHTML = "";
  const count = Math.min(2 + stage * 2, 60);
  const vmin = Math.min(window.innerWidth, window.innerHeight);
  const base = 6;
  // innermost frame line: keep a generous clear zone in the middle
  const maxInner = Math.max(64, Math.round(vmin * 0.15));
  const gap = count > 1 ? (maxInner - base) / (count - 1) : 0;
  for (let i = 0; i < count; i++) {
    const r = document.createElement("div");
    r.className = "ring";
    const inset = Math.round(base + i * gap);
    r.style.top = inset + "px";
    r.style.right = inset + "px";
    r.style.bottom = inset + "px";
    r.style.left = inset + "px";
    // faint chromatic split between neighbouring rings
    r.style.borderColor =
      i % 2 === 0 ? "rgba(90, 70, 170, 0.30)" : "rgba(70, 150, 190, 0.26)";
    rings.appendChild(r);
  }
  // keep the text comfortably inside the innermost frame
  const safe = maxInner + 36;
  seqLine.style.maxWidth =
    Math.max(180, window.innerWidth - 2 * safe) + "px";
  seqLine.style.maxHeight =
    Math.max(120, window.innerHeight - 2 * safe) + "px";
}

function setIntensity(stage) {
  const mult = Math.min(1 + stage * 0.16, 3.6);
  dispMaps.forEach(function (m, i) {
    m.setAttribute("scale", (baseScales[i] * mult).toFixed(2));
  });
  seqGrain.style.opacity = Math.min(0.05 + stage * 0.018, 0.26).toFixed(3);
  const off = (0.6 + stage * 0.25).toFixed(2);
  seqLine.style.textShadow =
    off + "px 0 rgba(190, 40, 90, 0.4), -" + off + "px 0 rgba(40, 80, 200, 0.4)";
}

function renderSeq() {
  seqLine.textContent = currentList[seqIndex];
  seqBg.style.backgroundImage = SEQ_GRADIENTS[seqIndex % SEQ_GRADIENTS.length];
  buildRings(seqIndex);
  setIntensity(seqIndex);
}

function advanceSeq() {
  const nextIndex = seqIndex + 1;
  if (nextIndex >= currentList.length) {
    startFinale();
    return;
  }
  if (isLoveYou(currentList[nextIndex])) {
    startFinale();
    return;
  }
  seqIndex = nextIndex;
  renderSeq();
}

function backSeq() {
  if (seqIndex > 0) {
    seqIndex--;
    renderSeq();
  }
}

// ---------- the splitting "love you" finale ----------
function randomGradient() {
  const h1 = Math.floor(Math.random() * 360);
  const h2 = (h1 + 40 + Math.floor(Math.random() * 120)) % 360;
  const s = 70 + Math.floor(Math.random() * 20);
  const l1 = 60 + Math.floor(Math.random() * 18);
  const l2 = 58 + Math.floor(Math.random() * 18);
  const ang = Math.floor(Math.random() * 360);
  return (
    "linear-gradient(" + ang + "deg, hsl(" + h1 + "," + s + "%," + l1 + "%), hsl(" +
    h2 + "," + s + "%," + l2 + "%))"
  );
}

function makePanel(depth) {
  const p = document.createElement("div");
  p.className = "panel";
  p.dataset.depth = String(depth);
  p.style.backgroundImage = randomGradient();

  const span = document.createElement("span");
  span.className = "love" + (Math.random() < 0.5 ? " ital" : "");
  if (Math.random() < 0.45) span.classList.add("dark");
  span.textContent = "love you";
  p.appendChild(span);

  p.addEventListener("click", onPanelClick);
  return p;
}

function onPanelClick(e) {
  e.stopPropagation();
  const panel = e.currentTarget;
  const depth = parseInt(panel.dataset.depth, 10);
  if (depth >= 11) return; // keep it from collapsing into nothing

  const wrap = document.createElement("div");
  wrap.className = "split " + (depth % 2 === 0 ? "h" : "v");
  wrap.appendChild(makePanel(depth + 1));
  wrap.appendChild(makePanel(depth + 1));
  panel.replaceWith(wrap);
}

function startFinale() {
  inSequence = false;
  inFinale = true;
  seq.hidden = true;
  seq.setAttribute("aria-hidden", "true");
  finale.innerHTML = "";
  finale.hidden = false;
  finale.setAttribute("aria-hidden", "false");
  finale.appendChild(makePanel(0));
}

// ---------- init + boil loop ----------
loadSequences();

const boilEls = Array.from(document.querySelectorAll(".boil"));
const jitterEls = Array.from(document.querySelectorAll(".jitter"));
let frame = 0;
window.setInterval(function () {
  frame++;
  bgEl.style.backgroundImage = "url(" + PAPERS[frame % PAPERS.length] + ")";

  const slot = frame % 3;
  const dx = frame % 2 === 0 ? 0.4 : -0.4;
  const dy = frame % 3 === 0 ? -0.4 : 0.3;

  boilEls.forEach(function (el) {
    el.style.filter = "url(#boil" + slot + ")";
    el.style.transform = "translate(" + dx + "px, " + dy + "px)";
  });
  jitterEls.forEach(function (el) {
    el.style.transform = "translate(" + dx * 0.6 + "px, " + dy * 0.6 + "px)";
  });
}, 130);
