// ─────────────────────────────────────────────────────────────────────────────
// scroll-essay.js
//
// A faithful, from-scratch reimplementation of an interactive "web-essay" scroll
// mechanic: a single running collage of text fragments where exactly ONE
// fragment is "active" (dark) at a time. The active fragment advances in strict
// sequence (data-index 0 → 1 → 2 → … → N-1 → 0) as you scroll, and the page
// auto-scrolls to wherever the next-in-sequence fragment happens to sit. A
// counter reports how far through the sequence you are.
//
// How it works:
//   • The page never scrolls natively. A hidden, fixed "container" is scrolled
//     programmatically; a transparent "mirror" element mirrors the scroll so the
//     browser draws a real scrollbar as a position cue.
//   • Each fragment's data-index is its place in the canonical sequence. The
//     same index appears many times, scattered through the DOM, so the next
//     step in the sequence could be anywhere — we jump to it.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  "use strict";

  const root = document.querySelector(".js-se-root");
  if (!root) return;

  const container = root.querySelector(".js-se-container");
  const paragraphs = root.querySelector(".js-se-paragraphs");
  const mirror = root.querySelector(".js-se-mirror");
  const mirrorInner = mirror.querySelector("div");
  const progressEl = root.querySelector(".js-se-progress");

  const pLength = parseInt(paragraphs.dataset.length, 10) || 0;

  // list[i] = the DOM node currently chosen to represent sequence step i.
  let list = [];
  // M: the active sequence step.
  let active = 0;
  // The vertical centre of the viewport, expressed in content coordinates.
  let currentY = 0;

  // Small baseline fudge factors (mirror the original): they nudge the
  // "centre" so the active line lands pleasingly, and differ by breakpoint.
  const isWide = () => window.matchMedia("(min-width: 576px)").matches;
  let topFudge = isWide() ? 16 : 9;
  let botFudge = isWide() ? 14 : 8;

  // ── Scatter the fragments so the running text reads as a collage ──────────
  function shuffleDom() {
    const items = Array.from(paragraphs.querySelectorAll(".js-se-item"));
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = items[i];
      items[i] = items[j];
      items[j] = tmp;
    }
    paragraphs.textContent = "";
    items.forEach((item) => {
      paragraphs.appendChild(item);
      const spacer = document.createElement("span");
      spacer.className = "se-spacer";
      spacer.innerHTML = " ";
      paragraphs.appendChild(spacer);
    });
  }

  // ── Pick one DOM node per sequence step, preferring nodes that can be
  //    comfortably centred (not jammed against the top/bottom of the page) ───
  function buildList() {
    const all = Array.from(paragraphs.querySelectorAll(".js-se-item"));
    const minTop = window.innerHeight / 2 + topFudge;
    const maxBottom = paragraphs.offsetHeight - window.innerHeight / 2 - botFudge;
    const inBounds = all.filter(
      (el) => el.offsetTop > minTop && el.offsetTop + el.offsetHeight < maxBottom
    );

    const next = [];
    for (let i = 0; i < pLength; i++) {
      let candidates = inBounds.filter(
        (el) => parseInt(el.dataset.index, 10) === i
      );
      if (candidates.length === 0) {
        candidates = all.filter((el) => parseInt(el.dataset.index, 10) === i);
      }
      next.push(candidates[Math.floor(Math.random() * candidates.length)]);
    }
    list = next;
  }

  // ── Scroll both the real (hidden) container and the visible mirror ────────
  function scrollTo(top) {
    container.scrollTo({ top: top });
    mirror.scrollTo({ top: top });
    currentY = container.scrollTop + window.innerHeight / 2;
  }

  // ── Make `step` the active fragment and bring it to the viewport centre ───
  function setActive(step, align) {
    step = step || 0;
    align = align || "start";
    // Re-randomise the endpoints so loops never feel mechanical.
    if (step === 0 || step === pLength - 1) buildList();

    const el = list[step];
    if (!el) return;

    const target =
      align === "start"
        ? el.offsetTop - window.innerHeight / 2 + topFudge
        : el.offsetTop + el.offsetHeight - window.innerHeight / 2 - botFudge;

    scrollTo(target);

    paragraphs
      .querySelectorAll(".js-se-item")
      .forEach((i) => i.classList.remove("active"));
    el.classList.add("active");
    active = step;
  }

  // ── Report progress through the sequence as a percentage ─────────────────
  function updateProgress() {
    if (list.length === 0 || !list[active]) return;
    const total =
      list.reduce((sum, el) => sum + el.offsetHeight - botFudge, 0) - topFudge;
    let done =
      list.slice(0, active).reduce((sum, el) => sum + el.offsetHeight - botFudge, 0) +
      currentY -
      list[active].offsetTop -
      topFudge;
    if (done < 0) done = 0;
    if (done > total) done = total;
    progressEl.innerHTML = Math.round((done / total) * 100) + "%";
  }

  // ── The heartbeat: advance/retreat the active step as currentY crosses it ─
  function loop() {
    updateProgress();
    const el = list[active];
    if (el && currentY !== 0) {
      const top = el.offsetTop + topFudge;
      const bottom = el.offsetTop + el.offsetHeight - botFudge;
      if (Math.round(currentY) > bottom) {
        setActive(active < pLength - 1 ? active + 1 : 0, "start");
      } else if (Math.round(currentY) < top) {
        setActive(active > 0 ? active - 1 : pLength - 1, "end");
      }
    }
    requestAnimationFrame(loop);
  }

  // ── Input: wheel ──────────────────────────────────────────────────────────
  function setupWheel() {
    container.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        scrollTo(container.scrollTop + e.deltaY);
      },
      { passive: false }
    );
  }

  // ── Input: touch (with a little momentum so it feels native) ──────────────
  function setupTouch() {
    let lastY = null;
    let velocity = 0;
    let momentum = null;

    container.addEventListener(
      "touchstart",
      (e) => {
        lastY = e.touches[0].clientY;
        if (momentum) cancelAnimationFrame(momentum);
      },
      { passive: true }
    );

    container.addEventListener(
      "touchmove",
      (e) => {
        const y = e.touches[0].clientY;
        const dy = lastY - y;
        velocity = dy;
        scrollTo(container.scrollTop + dy);
        lastY = y;
      },
      { passive: true }
    );

    container.addEventListener("touchend", () => {
      const decay = () => {
        if (Math.abs(velocity) < 0.1) return;
        scrollTo(container.scrollTop + velocity);
        velocity *= 0.92;
        momentum = requestAnimationFrame(decay);
      };
      decay();
    });
  }

  // ── Keep the mirror's inner height equal to the content height ────────────
  function setupMirrorHeight() {
    mirrorInner.style.height = paragraphs.offsetHeight + "px";
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          mirrorInner.style.height = entry.contentRect.height + "px";
        }
      });
      ro.observe(paragraphs);
    }
  }

  function init() {
    shuffleDom();
    setupMirrorHeight();

    // Click the counter to jump back to the very start.
    progressEl.addEventListener("click", () => setActive(0, "start"));

    window.addEventListener("resize", () => {
      topFudge = isWide() ? 16 : 9;
      botFudge = isWide() ? 14 : 8;
      setActive(active, "start");
    });

    // Let layout settle, reveal, then wire up scrolling + the loop.
    setTimeout(() => {
      setActive(0, "start");
      root.classList.add("se-loaded");
      setTimeout(() => {
        setupWheel();
        setupTouch();
        requestAnimationFrame(loop);
      }, 100);
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
