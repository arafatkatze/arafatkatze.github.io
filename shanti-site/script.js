// ---------- Footer year ----------
document.getElementById("year").textContent = new Date().getFullYear();

// ---------- Nav: scrolled state + mobile toggle ----------
const nav = document.getElementById("nav");
const navLinks = document.querySelector(".nav-links");
const navToggle = document.getElementById("navToggle");

window.addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", window.scrollY > 40);
});

navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.addEventListener("click", (e) => {
  if (e.target.tagName === "A") navLinks.classList.remove("open");
});

// ---------- Scroll reveal ----------
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// ---------- Falling petals ----------
const petalLayer = document.querySelector(".petals");
const PETAL_GLYPHS = ["🌸", "🪷", "🍃", "✿", "❀"];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (petalLayer && !reduceMotion) {
  const count = window.innerWidth < 600 ? 10 : 22;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = "petal";
    p.textContent = PETAL_GLYPHS[Math.floor(Math.random() * PETAL_GLYPHS.length)];
    p.style.left = Math.random() * 100 + "vw";
    p.style.animationDuration = 9 + Math.random() * 14 + "s";
    p.style.animationDelay = -Math.random() * 20 + "s";
    p.style.fontSize = 12 + Math.random() * 18 + "px";
    p.style.opacity = 0.35 + Math.random() * 0.4;
    petalLayer.appendChild(p);
  }
}

// ---------- Bhagavad Gita: 18 chapters ----------
const CHAPTERS = [
  "Arjuna's Dilemma",
  "Transcendental Knowledge",
  "Karma Yoga · Action",
  "Wisdom in Action",
  "Renunciation",
  "Meditation · Dhyana",
  "Knowledge & Realization",
  "The Imperishable Brahman",
  "Royal Secret",
  "Divine Glories",
  "The Cosmic Form",
  "The Path of Devotion",
  "Field & Knower",
  "Three Gunas",
  "The Supreme Person",
  "Divine & Demonic",
  "Threefold Faith",
  "Liberation · Moksha",
];

const chapterGrid = document.getElementById("chapterGrid");
if (chapterGrid) {
  CHAPTERS.forEach((name, i) => {
    const n = i + 1;
    const a = document.createElement("a");
    a.href = `https://www.holy-bhagavad-gita.org/chapter/${n}`;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = `<span class="ch-num">${n}</span><span class="ch-name">${name}</span>`;
    chapterGrid.appendChild(a);
  });
}

// ---------- Verse drawer ----------
const VERSES = [
  "“You have the right to your actions, but never to the fruits of your actions.” — Bhagavad Gita 2.47",
  "“The soul is neither born, and nor does it ever die.” — Bhagavad Gita 2.20",
  "“Set thy heart upon thy work, but never on its reward.” — Bhagavad Gita 2.47",
  "“When meditation is mastered, the mind is unwavering like the flame of a lamp in a windless place.” — Bhagavad Gita 6.19",
  "“One who sees inaction in action, and action in inaction, is wise among men.” — Bhagavad Gita 4.18",
  "“The peace of God is with them whose mind and soul are in harmony.” — Bhagavad Gita 5.29",
  "“No effort is ever lost, and no obstacle prevails; even a little of this practice protects one from great fear.” — Bhagavad Gita 2.40",
  "“Whatever you do, make it an offering to me.” — Bhagavad Gita 9.27",
  "“He who has let go of hatred, who treats all beings with kindness, is dear to me.” — Bhagavad Gita 12.13",
  "“For one who has conquered the mind, the mind is the best of friends.” — Bhagavad Gita 6.6",
  "“Change is the law of the universe. What you think of as death is but the soul changing garments.” — Bhagavad Gita 2.22",
  "“The wise grieve neither for the living nor for the dead.” — Bhagavad Gita 2.11",
];

const verseText = document.getElementById("verseText");
const drawBtn = document.getElementById("drawVerse");
let lastVerse = 0;
if (drawBtn && verseText) {
  drawBtn.addEventListener("click", () => {
    let idx;
    do {
      idx = Math.floor(Math.random() * VERSES.length);
    } while (idx === lastVerse && VERSES.length > 1);
    lastVerse = idx;
    verseText.style.opacity = 0;
    setTimeout(() => {
      verseText.textContent = VERSES[idx];
      verseText.style.transition = "opacity .5s";
      verseText.style.opacity = 1;
    }, 200);
  });
}
