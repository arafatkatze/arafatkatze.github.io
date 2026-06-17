// =============================================================================
// /zone/ — playful behavior for the retro hub page.
// Self-contained, no dependencies. Everything degrades gracefully if an
// element is missing.
// =============================================================================
(function () {
  "use strict";

  const page = document.getElementById("zone-page");
  if (!page) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // ---- live clock -----------------------------------------------------------
  const clock = document.getElementById("zone-clock");
  if (clock) {
    const tick = () => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      clock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
        now.getSeconds(),
      )}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  // ---- visitor counter (persisted per-browser, animated count-up) -----------
  const counter = document.getElementById("zone-counter");
  if (counter) {
    const KEY = "ara-zone-visits";
    let visits = parseInt(localStorage.getItem(KEY) || "0", 10);
    if (Number.isNaN(visits)) visits = 0;
    visits += 1;
    localStorage.setItem(KEY, String(visits));

    // A friendly base so the number feels "lived in", plus this browser's visits.
    const total = 1337 + visits;
    const format = (n) => String(n).padStart(4, "0");

    if (prefersReducedMotion) {
      counter.textContent = format(total);
    } else {
      let shown = Math.max(0, total - 40);
      const step = () => {
        shown += Math.ceil((total - shown) / 6);
        if (shown >= total) shown = total;
        counter.textContent = format(shown);
        if (shown < total) requestAnimationFrame(step);
      };
      step();
    }
  }

  // ---- "now vibing" rotating status ------------------------------------------
  const vibe = document.getElementById("zone-vibe");
  if (vibe) {
    const vibes = [
      "☕ sipping coffee & shipping code",
      "🎧 lo-fi beats on repeat",
      "🏔️ daydreaming about the next mountain",
      "📖 lost in a good book",
      "🌊 chasing a wave somewhere",
      "✍️ scribbling a half-finished essay",
      "🌌 watching the night sky",
      "🤖 teaching an AI to be kind",
    ];
    let i = Math.floor(Math.random() * vibes.length);
    const setVibe = () => {
      vibe.textContent = vibes[i];
      i = (i + 1) % vibes.length;
    };
    setVibe();
    if (!prefersReducedMotion) setInterval(setVibe, 4000);
  }

  // ---- clickable pet ---------------------------------------------------------
  const pet = document.getElementById("zone-pet");
  const petSprite = document.getElementById("zone-pet-sprite");
  const petStatus = document.getElementById("zone-pet-status");
  if (pet && petSprite && petStatus) {
    const critters = ["🐱", "🐶", "🐰", "🐸", "🦊", "🐥", "🐢", "🦉"];
    const reactions = [
      "purr~ 🩷",
      "happy!",
      "boop!",
      "*wiggles*",
      "you're nice :)",
      "more pats!",
      "(=^･ω･^=)",
      "yay!",
    ];
    let pats = 0;
    pet.addEventListener("click", () => {
      pats += 1;
      petSprite.textContent = critters[pats % critters.length];
      petStatus.textContent =
        pats % 7 === 0
          ? `${pats} pats! you're the best`
          : reactions[pats % reactions.length];
      pet.classList.remove("zone-pet-bounce");
      // reflow to restart the animation
      void pet.offsetWidth;
      pet.classList.add("zone-pet-bounce");
    });
  }

  // ---- draggable + closeable news window -------------------------------------
  const win = document.getElementById("zone-news-window");
  const handle = document.getElementById("zone-news-handle");
  const closeBtn = document.getElementById("zone-news-close");
  const launcher = document.getElementById("zone-news-launcher");
  const reopenBtn = document.getElementById("zone-news-reopen");

  if (win && handle) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;

    const pointerStart = (clientX, clientY) => {
      const rect = win.getBoundingClientRect();
      // Pin the window in place before switching to fixed positioning so it
      // doesn't jump when it leaves the document flow.
      if (!win.classList.contains("zone-dragging")) {
        win.classList.add("zone-dragging");
        win.style.left = `${rect.left}px`;
        win.style.top = `${rect.top}px`;
      }
      dragging = true;
      startX = clientX;
      startY = clientY;
      originLeft = parseFloat(win.style.left) || rect.left;
      originTop = parseFloat(win.style.top) || rect.top;
      document.body.style.userSelect = "none";
    };

    const pointerMove = (clientX, clientY) => {
      if (!dragging) return;
      const maxLeft = window.innerWidth - win.offsetWidth;
      const maxTop = window.innerHeight - win.offsetHeight;
      const nextLeft = Math.min(
        Math.max(0, originLeft + (clientX - startX)),
        Math.max(0, maxLeft),
      );
      const nextTop = Math.min(
        Math.max(0, originTop + (clientY - startY)),
        Math.max(0, maxTop),
      );
      win.style.left = `${nextLeft}px`;
      win.style.top = `${nextTop}px`;
    };

    const pointerEnd = () => {
      dragging = false;
      document.body.style.userSelect = "";
    };

    // Mouse
    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest(".zone-titlebar-close")) return;
      e.preventDefault();
      pointerStart(e.clientX, e.clientY);
    });
    window.addEventListener("mousemove", (e) => pointerMove(e.clientX, e.clientY));
    window.addEventListener("mouseup", pointerEnd);

    // Touch
    handle.addEventListener(
      "touchstart",
      (e) => {
        if (e.target.closest(".zone-titlebar-close")) return;
        const t = e.touches[0];
        pointerStart(t.clientX, t.clientY);
      },
      { passive: true },
    );
    window.addEventListener(
      "touchmove",
      (e) => {
        if (!dragging) return;
        const t = e.touches[0];
        pointerMove(t.clientX, t.clientY);
        e.preventDefault();
      },
      { passive: false },
    );
    window.addEventListener("touchend", pointerEnd);

    // Close -> tuck it away and reveal the re-open button.
    if (closeBtn && launcher) {
      closeBtn.addEventListener("click", () => {
        win.style.display = "none";
        win.classList.remove("zone-dragging");
        win.style.left = "";
        win.style.top = "";
        launcher.hidden = false;
      });
    }

    // Re-open from the launcher.
    if (reopenBtn && launcher) {
      reopenBtn.addEventListener("click", () => {
        win.style.display = "";
        launcher.hidden = true;
      });
    }
  }
})();
