// Cross-device driver for the "scroll to get inside" tunnel.
//
// The original issue 04 wrote window.scrollY straight into a CSS variable on
// every `scroll` event, and gated the whole thing to widths > 800px. Mobile
// browsers fire `scroll` sparsely during momentum/inertial scrolling, which
// makes that approach stutter -- which is part of why it was desktop-only.
//
// Here we instead run a requestAnimationFrame loop that *eases* a displayed
// scroll value toward the real scroll position. Rendering is decoupled from how
// often `scroll` fires, so the flight stays smooth on phones too. All the depth
// and fading still happens declaratively in CSS via the --scroll / --visible
// custom properties.

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

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

let target = 0;
let current = 0;
let root;
let link;

window.addEventListener("load", () => {
  root = document.documentElement;
  link = document.getElementById("link");

  if (prefersReducedMotion) {
    // Calm fallback: CSS turns this into a plain vertical list; do nothing.
    return;
  }

  target = window.scrollY;
  current = target;
  requestAnimationFrame(tick);
});

window.addEventListener(
  "scroll",
  () => {
    target = window.scrollY;
  },
  { passive: true }
);

function tick() {
  // Critically-damped-ish easing toward the true scroll position.
  current += (target - current) * 0.14;
  if (Math.abs(target - current) < 0.4) current = target;

  root.style.setProperty("--scroll", current + "px");
  root.style.setProperty("--visible", ((current - 17000) / -100).toFixed(2));

  updateLink(current);
  requestAnimationFrame(tick);
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
