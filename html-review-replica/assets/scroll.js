// Cross-device driver for the "scroll to get inside" tunnel.
//
// The original issue 04 wrote window.scrollY straight into a CSS variable on
// every `scroll` event and gated the whole thing to widths > 800px. This build
// runs the effect on phones too, with three things that matter on a real,
// memory-constrained, high-DPR mobile browser (iOS Safari kills a tab that
// exceeds its per-process memory budget -> "A problem repeatedly occurred"):
//
//   1. A requestAnimationFrame loop *eases* toward the scroll position so the
//      flight stays smooth even though mobile fires `scroll` sparsely during
//      momentum scrolling. The loop stops itself when idle to save power.
//   2. Panels are CULLED: only the handful near the camera are display:block.
//      The rest are display:none, so they never allocate a GPU backing store.
//      This is the key fix -- otherwise all 12 full-screen panels (each with
//      wide wall slabs, at devicePixelRatio 3) are allocated at once on load.
//   3. Opacity is computed here so panels fade IN from depth and OUT past the
//      camera, which also avoids any pop when a panel is culled in/out.

const pieces = [
  { title: "Welcome Home", url: "#" },
  { title: "Depth Is a Variable", url: "#" },
  { title: "A Fixed Stage", url: "#" },
  { title: "Perspective", url: "#" },
  { title: "Fade In Turn", url: "#" },
  { title: "The Walls", url: "#" },
  { title: "Smooth on Touch", url: "#" },
  { title: "Dynamic Viewport", url: "#" },
  { title: "One Bridge", url: "#" },
  { title: "The Doorway", url: "#" },
  { title: "Reduced Motion", url: "#" },
  { title: "Keep Scrolling", url: "#how" },
];

// Per-panel depth offset (must match the translateZ values in styles.css).
const BASE = 2500;
const STEP = 1000;

// Effective-Z window in which a panel is rendered. Outside it the panel is
// culled (display:none) and frees its backing store.
const NEAR_LIMIT = 600; // past the camera -> already faded out
const FAR_LIMIT = -3500; // too deep / fully occluded by nearer panels
const FAR_FADE = 800; // distance over which a deep panel fades in

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

let target = 0;
let current = 0;
let running = false;
let root;
let link;
let articles = [];

window.addEventListener("load", () => {
  root = document.documentElement;
  link = document.getElementById("link");
  articles = Array.prototype.slice.call(
    document.querySelectorAll("main article")
  );

  if (prefersReducedMotion) {
    // Calm fallback: CSS flattens this into a plain vertical list. Make sure
    // every panel is shown (JS opacity/cull is disabled here).
    articles.forEach((el) => {
      el.style.display = "";
      el.style.opacity = "1";
    });
    return;
  }

  target = window.scrollY;
  current = target;
  start();
});

window.addEventListener(
  "scroll",
  () => {
    target = window.scrollY;
    start();
  },
  { passive: true }
);

window.addEventListener("resize", () => start(), { passive: true });

function start() {
  if (running || prefersReducedMotion || !root) return;
  running = true;
  requestAnimationFrame(tick);
}

function tick() {
  current += (target - current) * 0.14;
  const settled = Math.abs(target - current) < 0.4;
  if (settled) current = target;

  root.style.setProperty("--scroll", current + "px");
  root.style.setProperty("--visible", ((current - 17000) / -100).toFixed(2));

  render(current);
  updateLink(current);

  if (settled) {
    running = false; // idle: stop burning frames until the next scroll
  } else {
    requestAnimationFrame(tick);
  }
}

// Show only panels near the camera; fade and cull the rest.
function render(scroll) {
  for (let i = 0; i < articles.length; i++) {
    const el = articles[i];
    const zEff = scroll - (BASE + i * STEP);

    if (zEff > NEAR_LIMIT || zEff < FAR_LIMIT) {
      if (el.style.display !== "none") el.style.display = "none";
      continue;
    }
    if (el.style.display === "none") el.style.display = "";

    // Fade out as the panel reaches / passes the camera (zEff 300 -> 400).
    let op = 4 - zEff / 100;
    if (op > 1) op = 1;
    else if (op < 0) op = 0;

    // Fade in smoothly as a deep panel enters the render window.
    const fadeIn = Math.min(1, (zEff - FAR_LIMIT) / FAR_FADE);
    op *= fadeIn < 0 ? 0 : fadeIn;

    el.style.opacity = op.toFixed(3);
  }
}

// Surface a floating "Title ->" doorway for the panel nearest the camera.
function updateLink(scroll) {
  let active = null;

  if (scroll > 1200) {
    for (let i = 0; i < pieces.length; i++) {
      const z = 1200 + i * 1000;
      if (z - scroll > -1680) {
        active = pieces[i];
        break;
      }
    }
  }

  if (active) {
    if (link.dataset.title !== active.title) {
      link.innerHTML = active.title + "&nbsp;&#8674;";
      link.setAttribute("href", active.url);
      link.dataset.title = active.title;
    }
    link.style.display = "block";
  } else {
    link.style.display = "none";
    link.removeAttribute("data-title");
    link.innerHTML = "";
  }
}
