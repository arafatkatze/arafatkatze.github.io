// The seven things you didn't know.
const LINES = [
  "I taught myself how to surf just so that I could use teaching as an excuse to stare at you",
  "I would have taken you to anywhere, if you had just asked me (sincerely)",
  "Your style has now become my \u201Ctype\u201D",
  "I couldn\u2019t sleep well for weeks after you left in May",
  "Every time I run into people I know, I really hope it\u2019s not you",
  "I got into poetry to process the grief of missing you",
  "I feel so much shame over wanting you",
];

const PAPERS = ["img/paper-1.png", "img/paper-2.png", "img/paper-3.png"];

const lineEl = document.getElementById("line");
const bgEl = document.getElementById("bg");
const boilEls = Array.from(document.querySelectorAll(".boil")); // gentle (1x) shake
const boil2xEls = Array.from(document.querySelectorAll(".boil-2x")); // 2x shake

// ---- routing: keep position on refresh / back / forward ----
function currentIndex() {
  const n = parseInt(location.hash.replace("#", ""), 10);
  if (Number.isNaN(n) || n < 1 || n > LINES.length) return 0;
  return n - 1;
}

function render() {
  lineEl.textContent = LINES[currentIndex()];
}

function advance() {
  // After the last line, move on to the "if we could just" page.
  if (currentIndex() === LINES.length - 1) {
    location.href = "../if-we-could-just/";
    return;
  }
  const next = currentIndex() + 1;
  location.hash = "#" + (next + 1);
}

function back() {
  const prev = (currentIndex() - 1 + LINES.length) % LINES.length;
  location.hash = "#" + (prev + 1);
}

window.addEventListener("hashchange", render);

document.addEventListener("click", advance);

document.addEventListener("keydown", function (e) {
  if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
    e.preventDefault();
    advance();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    back();
  }
});

// ---- the boil: cycle paper + nudge/displace the printed ink ----
// The header gets a gentle shake; the line below shakes exactly twice as hard.
let frame = 0;
window.setInterval(function () {
  frame++;
  bgEl.style.backgroundImage = "url(" + PAPERS[frame % PAPERS.length] + ")";

  const slot = frame % 3;
  const dx = (frame % 2 === 0 ? 0.3 : -0.3);
  const dy = (frame % 3 === 0 ? -0.3 : 0.3);

  boilEls.forEach(function (el) {
    el.style.filter = "url(#boilS" + slot + ")";
    el.style.transform = "translate(" + dx + "px, " + dy + "px)";
  });
  boil2xEls.forEach(function (el) {
    el.style.filter = "url(#boil" + slot + ")";
    el.style.transform = "translate(" + dx * 2 + "px, " + dy * 2 + "px)";
  });
}, 130);

if (!location.hash) location.hash = "#1";
render();
